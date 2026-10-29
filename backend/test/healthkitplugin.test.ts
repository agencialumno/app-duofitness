// Plugin de config do HealthKit (só leitura), a checagem do projeto iOS gerado e o job de prebuild em Linux.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO = path.resolve(__dirname, '../..');
const req = createRequire(path.join(REPO, 'package.json'));
const plugin = req('./plugins/withHealthKitOptional.js') as ((c: unknown) => unknown) & {
  applyEntitlements: (e: Record<string, unknown>) => Record<string, unknown>;
  applyInfoPlist: (i: Record<string, unknown>) => Record<string, unknown>;
  USAGE_DESCRIPTION: string;
};

describe('withHealthKitOptional', () => {
  it('sem HEALTH_INTEGRATION_ENABLED devolve o config INTACTO (mesma referência): o iOS gerado fica idêntico', () => {
    const cfg = { name: 'x', ios: {} };
    const before = process.env;
    for (const v of ['', 'false', 'nao']) {
      process.env = { ...before, HEALTH_INTEGRATION_ENABLED: v };
      try { expect(plugin(cfg)).toBe(cfg); } finally { process.env = before; }
    }
  });
  it('com a flag só liga o entitlement do HealthKit e o texto de LEITURA em português', () => {
    expect(plugin.applyEntitlements({ 'com.apple.developer.applesignin': ['Default'] })).toEqual({ 'com.apple.developer.applesignin': ['Default'], 'com.apple.developer.healthkit': true });
    const info = plugin.applyInfoPlist({ ITSAppUsesNonExemptEncryption: false });
    expect(info.NSHealthShareUsageDescription).toBe('O Duo Fitness lê seus dados de atividade, sono e batimentos do app Saúde para mostrar sua evolução. Os dados ficam no seu aparelho.');
    expect(info.ITSAppUsesNonExemptEncryption).toBe(false); // não apaga o que já existe
  });
  it('NUNCA pede escrita, background delivery nem registros clínicos (mesmo se já existir a de escrita)', () => {
    const info = plugin.applyInfoPlist({ NSHealthUpdateUsageDescription: 'x' });
    expect(info).not.toHaveProperty('NSHealthUpdateUsageDescription');
    const ent = plugin.applyEntitlements({});
    expect(Object.keys(ent)).toEqual(['com.apple.developer.healthkit']);
    const src = readFileSync(path.join(REPO, 'plugins/withHealthKitOptional.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toMatch(/background-delivery|health-records|healthkit\.access/);
    expect(src).not.toMatch(/NSHealthUpdateUsageDescription\s*[:=]/);
  });
  it('o plugin está no app.json e o app.json não cita HealthKit direto', () => {
    const app = readFileSync(path.join(REPO, 'app.json'), 'utf8');
    expect(app).toContain('./plugins/withHealthKitOptional');
    expect(app).not.toMatch(/NSHealth|com\.apple\.developer\.healthkit/);
  });
});

describe('check-ios-project: HealthKit', () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(path.join(tmpdir(), 'hk-ios-')); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  const USAGE = 'O Duo Fitness lê seus dados de atividade, sono e batimentos do app Saúde.';
  const info = (extra: string) => `<?xml version="1.0"?>\n<plist version="1.0">\n  <dict>\n    <key>ITSAppUsesNonExemptEncryption</key>\n    <false/>\n${extra}\n  </dict>\n</plist>\n`;
  const ent = (body: string) => `<?xml version="1.0"?>\n<plist version="1.0">\n  <dict>\n${body}\n  </dict>\n</plist>\n`;
  function project(infoExtra: string, entBody: string | null) {
    const ios = path.join(dir, 'ios');
    mkdirSync(path.join(ios, 'DuoFitness.xcodeproj'), { recursive: true });
    mkdirSync(path.join(ios, 'DuoFitness'), { recursive: true });
    writeFileSync(path.join(ios, 'DuoFitness.xcodeproj', 'project.pbxproj'), 'PRODUCT_BUNDLE_IDENTIFIER = "com.duofitness.app";\n');
    writeFileSync(path.join(ios, 'DuoFitness', 'Info.plist'), info(infoExtra));
    writeFileSync(path.join(ios, 'Podfile'), 'use_expo_modules!\n');
    if (entBody !== null) writeFileSync(path.join(ios, 'DuoFitness', 'DuoFitness.entitlements'), ent(entBody));
  }
  const run = (flag: string) => {
    const r = spawnSync(process.execPath, [path.join(REPO, 'scripts/check-ios-project.mjs'), '--root', dir], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: 'true', FIREBASE_ENABLED: '', HEALTH_INTEGRATION_ENABLED: flag } });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };
  const OK_INFO = `    <key>NSHealthShareUsageDescription</key>\n    <string>${USAGE}</string>`;
  const OK_ENT = '    <key>com.apple.developer.healthkit</key>\n    <true/>';

  it('com a flag: entitlement e texto de leitura presentes e nada de escrita/background/clínicos: passa', () => {
    project(OK_INFO, OK_ENT);
    const r = run('true');
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('entitlement com.apple.developer.healthkit presente');
  });
  it('com a flag e SEM o entitlement: falha; sem o texto: falha', () => {
    project(OK_INFO, '');
    expect(run('true').out).toContain('[HealthKit] Esperado: o entitlement com.apple.developer.healthkit');
    project('', OK_ENT);
    const r = run('true');
    expect(r.code).toBe(1);
    expect(r.out).toContain('NSHealthShareUsageDescription');
  });
  it('com a flag, escrita, background delivery ou registros clínicos FALHAM', () => {
    project(`${OK_INFO}\n    <key>NSHealthUpdateUsageDescription</key>\n    <string>x</string>`, OK_ENT);
    expect(run('true').out).toContain('NSHealthUpdateUsageDescription não deveria existir');
    project(OK_INFO, `${OK_ENT}\n    <key>com.apple.developer.healthkit.background-delivery</key>\n    <true/>`);
    expect(run('true').out).toContain('background-delivery não deveria existir');
    project(OK_INFO, `${OK_ENT}\n    <key>com.apple.developer.healthkit.access</key>\n    <array><string>health-records</string></array>`);
    expect(run('true').out).toContain('healthkit.access não deveria existir');
  });
  it('SEM a flag: o projeto de hoje passa e qualquer chave de saúde falha (o iOS gerado tem de ser idêntico)', () => {
    project('', null);
    expect(run('').code).toBe(0);
    project(OK_INFO, OK_ENT);
    const r = run('');
    expect(r.code).toBe(1);
    expect(r.out).toContain('deveria ser idêntico ao de antes');
  });
});

describe('ci.yml: job ios-prebuild-healthkit (Linux, sem Mac)', () => {
  const ci = readFileSync(path.join(REPO, '.github/workflows/ci.yml'), 'utf8');
  const start = ci.indexOf('  ios-prebuild-healthkit:');
  const job = ci.slice(start, ci.indexOf('  # Gera o projeto Android COM Firebase'));
  it('liga a flag, instala os módulos, confere o autolinking, gera o iOS e confere entitlement e texto', () => {
    expect(start).toBeGreaterThan(-1);
    expect(job).toContain("HEALTH_INTEGRATION_ENABLED: 'true'");
    const order = ['npm ci', 'install-healthkit-deps.mjs', 'check-autolinking.mjs --platform ios', 'expo prebuild --platform ios --no-install', 'check-ios-project.mjs'].map((t) => job.indexOf(t));
    expect(order.every((i) => i > -1), order.join(',')).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
  it('o job do iOS sem a flag continua conferindo que NÃO há chave de saúde (check-ios-project sem flag)', () => {
    const plain = ci.slice(ci.indexOf('  ios-prebuild:'), ci.indexOf('  ios-prebuild-firebase:'));
    expect(plain).toContain('check-ios-project.mjs');
    expect(plain).not.toContain('HEALTH_INTEGRATION_ENABLED');
  });
});
