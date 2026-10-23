// check-autolinking.mjs por plataforma e com/sem FIREBASE_ENABLED (fixtures; sem rede e sem instalar nada).
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = path.resolve(__dirname, '../../scripts/check-autolinking.mjs');
const BASE = ['expo', 'expo-asset', 'expo-constants', 'expo-file-system', 'expo-font', 'expo-keep-awake', 'expo-modules-core', 'expo-video'];
const RN = ['@react-native-firebase/app', '@react-native-firebase/auth', '@react-native-google-signin/google-signin'];
const ROOT_PKGS = ['babel-preset-expo', ...RN, 'expo-apple-authentication', 'expo-crypto', 'expo-build-properties'];

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'check-al-fb-'));
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app', dependencies: {} }));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function install(names: string[], inPackageJson = true) {
  const deps: Record<string, string> = {};
  for (const n of names) {
    mkdirSync(path.join(dir, 'node_modules', n), { recursive: true });
    writeFileSync(path.join(dir, 'node_modules', n, 'package.json'), `{"name":"${n}","version":"1.0.0"}`);
    deps[n] = '1.0.0';
  }
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'app', dependencies: inPackageJson ? deps : {} }));
}

function run(platform: string | null, modules: string[], opts: { firebase?: boolean; rn?: string[]; rnPlatform?: string } = {}) {
  const resolve = path.join(dir, 'resolve.json');
  writeFileSync(resolve, JSON.stringify({ modules: modules.map((packageName) => ({ packageName })) }));
  const args = [SCRIPT, '--root', dir, '--from-json', resolve];
  if (platform) args.push('--platform', platform);
  if (opts.rn) {
    const f = path.join(dir, 'rn.json');
    const p = opts.rnPlatform ?? platform ?? 'android';
    writeFileSync(f, JSON.stringify({ dependencies: Object.fromEntries(opts.rn.map((n) => [n, { name: n, platforms: { [p]: { x: 1 } } }])) }));
    args.push('--rn-config-json', f);
  }
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true', FIREBASE_ENABLED: opts.firebase ? 'true' : '' } });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

describe('SEM a flag: o check é o de sempre, nas duas plataformas', () => {
  beforeEach(() => install(['babel-preset-expo']));
  it.each(['android', 'ios', null])('plataforma %s passa com os módulos de hoje e não exige nada de conta', (plat) => {
    const r = run(plat, BASE);
    expect(r.code).toBe(0);
    expect(r.out).toContain('Módulos obrigatórios presentes: expo-file-system, expo-asset, expo-font, expo-keep-awake, expo-video');
    expect(r.out).not.toMatch(/expo-crypto|expo-apple-authentication|react-native-firebase|Ordem esperada/);
    expect(r.out).toContain(plat === 'ios' ? 'Autolinking iOS:' : 'Autolinking Android:');
  });
  it('plataforma inválida falha com mensagem clara', () => {
    const r = run('windows', BASE);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/--platform deve ser android ou ios/);
  });
});

describe('COM FIREBASE_ENABLED=true', () => {
  beforeEach(() => install(ROOT_PKGS));

  it('Android: exige expo-crypto (e NÃO o expo-apple-authentication, que só existe no iOS) e os módulos do RN CLI', () => {
    const r = run('android', [...BASE, 'expo-crypto'], { firebase: true, rn: RN });
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('Módulos obrigatórios presentes: expo-file-system, expo-asset, expo-font, expo-keep-awake, expo-video, expo-crypto');
    expect(r.out).toContain('Módulos do React Native CLI presentes (Android)');
    expect(r.out).not.toContain('expo-apple-authentication não está');
  });

  it('iOS: exige expo-apple-authentication e expo-crypto', () => {
    const ok = run('ios', [...BASE, 'expo-crypto', 'expo-apple-authentication'], { firebase: true, rn: RN });
    expect(ok.code, ok.out).toBe(0);
    expect(ok.out).toContain('Autolinking iOS:');
    expect(ok.out).toContain('expo-apple-authentication, expo-crypto');
    const semApple = run('ios', [...BASE, 'expo-crypto'], { firebase: true, rn: RN });
    expect(semApple.code).toBe(1);
    expect(semApple.out).toContain('::error::expo-apple-authentication não está no autolinking (ios)');
  });

  it('o erro explica a CAUSA real (em node_modules, mas fora do package.json) e a ordem esperada dos passos', () => {
    install(ROOT_PKGS, false); // instalado sem estar em dependencies: o que o --no-save fazia
    const r = run('ios', BASE, { firebase: true, rn: RN });
    expect(r.code).toBe(1);
    expect(r.out).toContain('expo-apple-authentication não está no autolinking (ios): está em node_modules, mas NÃO em dependencies do package.json');
    expect(r.out).toContain('Rode node scripts/install-firebase-deps.mjs ANTES do prebuild');
    expect(r.out).toContain('Ordem esperada dos passos com Firebase: npm ci -> firebase-prepare -> install-firebase-deps -> expo prebuild -> check-autolinking');
  });

  it('módulo não instalado: diz "não está instalado" e aponta o instalador', () => {
    rmSync(path.join(dir, 'node_modules', 'expo-crypto'), { recursive: true, force: true });
    const r = run('android', BASE, { firebase: true, rn: RN });
    expect(r.code).toBe(1);
    expect(r.out).toContain('expo-crypto não está no autolinking (android): não está instalado');
  });

  it('os pacotes do React Native CLI (@react-native-firebase/*, google-signin) também são conferidos por plataforma', () => {
    const faltando = run('android', [...BASE, 'expo-crypto'], { firebase: true, rn: ['@react-native-firebase/app'] });
    expect(faltando.code).toBe(1);
    expect(faltando.out).toContain('::error::@react-native-firebase/auth não está no autolinking do React Native CLI (android)');
    expect(faltando.out).toContain('::error::@react-native-google-signin/google-signin não está no autolinking do React Native CLI (android)');
    expect(faltando.out).toContain('Ordem esperada dos passos com Firebase');
    // ligado só no outro sistema não vale
    const outro = run('android', [...BASE, 'expo-crypto'], { firebase: true, rn: RN, rnPlatform: 'ios' });
    expect(outro.code).toBe(1);
  });

  it('config plugins ausentes da raiz (ex.: expo-build-properties) também falham', () => {
    rmSync(path.join(dir, 'node_modules', 'expo-build-properties'), { recursive: true, force: true });
    const r = run('android', [...BASE, 'expo-crypto'], { firebase: true, rn: RN });
    expect(r.code).toBe(1);
    expect(r.out).toContain('expo-build-properties');
  });
});
