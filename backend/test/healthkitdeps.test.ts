// Módulos nativos do HealthKit: versões fixas, instalação só com a flag e autolinking (fixtures; sem rede e sem instalar nada).
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO = path.resolve(__dirname, '../..');
const INSTALL = path.join(REPO, 'scripts/install-healthkit-deps.mjs');
const CHECK = path.join(REPO, 'scripts/check-autolinking.mjs');
const BASE = ['expo', 'expo-asset', 'expo-constants', 'expo-file-system', 'expo-font', 'expo-keep-awake', 'expo-modules-core', 'expo-video'];
const HK = ['@kingstinct/react-native-healthkit', '@react-native-healthkit/core', 'react-native-nitro-modules'];

describe('healthkit/native-deps.json', () => {
  const cfg = JSON.parse(readFileSync(path.join(REPO, 'healthkit/native-deps.json'), 'utf8'));
  it('versões EXATAS (sem ^ nem ~), as duas do kingstinct em conjunto e o core direto na raiz', () => {
    expect(Object.keys(cfg.pinned).sort()).toEqual([...HK].sort());
    for (const v of Object.values(cfg.pinned) as string[]) expect(v).toMatch(/^\d+\.\d+\.\d+$/);
    expect(cfg.pinned['@kingstinct/react-native-healthkit']).toBe(cfg.pinned['@react-native-healthkit/core']);
  });
  it('NÃO estão no package.json do repositório (o build normal fica idêntico)', () => {
    const pkg = JSON.parse(readFileSync(path.join(REPO, 'package.json'), 'utf8'));
    for (const n of HK) expect(pkg.dependencies?.[n], n).toBeUndefined();
    expect(readFileSync(path.join(REPO, 'package-lock.json'), 'utf8')).not.toContain('react-native-healthkit');
  });
});

describe('install-healthkit-deps.mjs', () => {
  const run = (flag: string) => spawnSync(process.execPath, [INSTALL, '--dry-run'], { encoding: 'utf8', env: { ...process.env, HEALTH_INTEGRATION_ENABLED: flag } });
  it('sem a flag não instala nada', () => {
    const r = run('');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('desligada');
    expect(r.stdout).not.toContain('@kingstinct');
  });
  it('com a flag lista as três versões fixas (e só elas)', () => {
    const r = run('true');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('@kingstinct/react-native-healthkit@16.2.0');
    expect(r.stdout).toContain('@react-native-healthkit/core@16.2.0');
    expect(r.stdout).toContain('react-native-nitro-modules@0.35.10');
  });
});

describe('check-autolinking.mjs com HEALTH_INTEGRATION_ENABLED', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'check-al-hk-'));
    const deps: Record<string, string> = {};
    for (const n of ['babel-preset-expo', ...HK]) {
      mkdirSync(path.join(dir, 'node_modules', n), { recursive: true });
      writeFileSync(path.join(dir, 'node_modules', n, 'package.json'), `{"name":"${n}","version":"1.0.0"}`);
      deps[n] = '1.0.0';
    }
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app', dependencies: deps }));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  function run(platform: string, rn: string[], flag: string) {
    writeFileSync(path.join(dir, 'resolve.json'), JSON.stringify({ modules: BASE.map((packageName) => ({ packageName })) }));
    writeFileSync(path.join(dir, 'rn.json'), JSON.stringify({ dependencies: Object.fromEntries(rn.map((n) => [n, { name: n, platforms: { [platform]: { x: 1 } } }])) }));
    const r = spawnSync(process.execPath, [CHECK, '--root', dir, '--from-json', path.join(dir, 'resolve.json'), '--rn-config-json', path.join(dir, 'rn.json'), '--platform', platform],
      { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true', FIREBASE_ENABLED: '', HEALTH_INTEGRATION_ENABLED: flag } });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  }
  it('iOS com a flag e os três módulos ligados: passa', () => {
    const r = run('ios', HK, 'true');
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('Módulos do HealthKit presentes (iOS)');
  });
  it('iOS com a flag e o core fora do autolinking: FALHA citando o módulo e o script', () => {
    const r = run('ios', ['@kingstinct/react-native-healthkit', 'react-native-nitro-modules'], 'true');
    expect(r.code).toBe(1);
    expect(r.out).toContain('@react-native-healthkit/core não está no autolinking');
    expect(r.out).toContain('install-healthkit-deps.mjs');
  });
  it('Android não exige HealthKit (agora exige o Health Connect com a flag: veja healthconnect.test.ts), e sem a flag o iOS também não exige', () => {
    const android = run('android', [], 'true');
    expect(android.out).not.toContain('HealthKit');
    expect(android.out).toContain('install-healthconnect-deps.mjs');
    expect(run('android', [], '').code).toBe(0);
    const r = run('ios', [], '');
    expect(r.code, r.out).toBe(0);
    expect(r.out).not.toContain('HealthKit');
  });
});
