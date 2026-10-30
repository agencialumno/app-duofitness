// INTEGRAÇÃO, área 7: configuração e build. Os plugins de config (Firebase, HealthKit, Health Connect) avaliados DE VERDADE pelo Expo (expo config --type
// introspect), com e sem as flags; o repositório sem flag gera a mesma configuração; NSHealthUpdateUsageDescription quando a flag liga; permissões
// READ_* do Android sem WRITE_*; check-ios-project, check-android-project e check-no-secrets. Nada de rede.
// Não cobre: o prebuild nativo completo nem a compilação (precisam do macOS/Gradle: ficam nos jobs do ci.yml, ios.yml e android.yml).
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO = path.resolve(__dirname, '../..');
const req = createRequire(path.join(REPO, 'package.json'));
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const hk = req('./plugins/withHealthKitOptional.js');
const hc = req('./plugins/withHealthConnectOptional.js');
const fb = req('./plugins/withFirebaseOptional.js');

const FLAGS = ['HEALTH_INTEGRATION_ENABLED', 'FIREBASE_ENABLED', 'FIREBASE_ANDROID_CONFIG', 'FIREBASE_IOS_CONFIG'];
function introspect(env: Record<string, string> = {}) {
  const clean: NodeJS.ProcessEnv = { ...process.env };
  for (const k of FLAGS) delete clean[k];
  const r = spawnSync(process.execPath, [path.join(REPO, 'node_modules/expo/bin/cli'), 'config', '--type', 'introspect', '--json'], { cwd: REPO, encoding: 'utf8', env: { ...clean, ...env, EXPO_NO_TELEMETRY: '1', CI: '1' } });
  expect(r.status, r.stderr).toBe(0);
  return JSON.parse(r.stdout.slice(r.stdout.indexOf('{')));
}
const strip = (c: any) => JSON.parse(JSON.stringify(c, (k, v) => (k === '_internal' || k === 'mods' ? undefined : v)));

describe('plugins de config avaliados pelo Expo, com e sem as flags', () => {
  const off = introspect();
  const hkOn = introspect({ HEALTH_INTEGRATION_ENABLED: 'true' });

  it('SEM flags: nenhuma chave do HealthKit, do Firebase ou da Apple aparece no iOS gerado', () => {
    expect(off.ios.infoPlist.NSHealthShareUsageDescription).toBeUndefined();
    expect(off.ios.infoPlist.NSHealthUpdateUsageDescription).toBeUndefined();
    expect(JSON.stringify(off.ios.entitlements ?? {})).not.toMatch(/healthkit/i);
    expect(off.ios.usesAppleSignIn).toBeUndefined();
    expect(off.ios.googleServicesFile).toBeUndefined();
    expect(off.android.googleServicesFile).toBeUndefined();
  });
  it('flags EXPLICITAMENTE falsas geram exatamente a mesma configuração que flags ausentes (o repositório sem flag fica idêntico)', () => {
    const explicit = introspect({ HEALTH_INTEGRATION_ENABLED: 'false', FIREBASE_ENABLED: 'false' });
    expect(strip(explicit)).toEqual(strip(off));
  });
  it('COM HEALTH_INTEGRATION_ENABLED=true: entitlement do HealthKit e os dois textos de uso; a chave de escrita diz que o app NÃO grava', () => {
    expect(hkOn.ios.entitlements['com.apple.developer.healthkit']).toBe(true);
    expect(hkOn.ios.infoPlist.NSHealthShareUsageDescription).toMatch(/lê seus dados/);
    expect(hkOn.ios.infoPlist.NSHealthUpdateUsageDescription).toMatch(/não grava dados/);
    expect(hkOn.ios.infoPlist.NSHealthUpdateUsageDescription).toMatch(/Esta permissão não é usada/);
    // nunca: background delivery nem registros clínicos
    expect(JSON.stringify(hkOn.ios.entitlements)).not.toMatch(/background-delivery|healthkit\.access|health-records/);
    expect(hkOn.ios.infoPlist.ITSAppUsesNonExemptEncryption).toBe(false); // o que já existia continua
  });
  it('a flag liga SÓ o que é dela: fora das chaves de saúde, o iOS e o Android gerados são os mesmos', () => {
    const a = strip(off);
    const b = strip(hkOn);
    delete b.ios.infoPlist.NSHealthShareUsageDescription;
    delete b.ios.infoPlist.NSHealthUpdateUsageDescription;
    delete b.ios.entitlements['com.apple.developer.healthkit'];
    if (Object.keys(b.ios.entitlements).length === 0 && !a.ios.entitlements) delete b.ios.entitlements;
    expect(b.ios).toEqual(a.ios);
    expect(b.android).toEqual(a.android);
  });
  it('os três plugins estão no app.json e sem flag devolvem o config com a MESMA referência (nenhuma mudança)', () => {
    const plugins = JSON.parse(read('app.json')).expo.plugins;
    for (const p of ['./plugins/withFirebaseOptional', './plugins/withHealthKitOptional', './plugins/withHealthConnectOptional']) expect(plugins).toContain(p);
    const saved = { ...process.env };
    for (const k of FLAGS) delete process.env[k];
    try {
      const cfg = { name: 'x', ios: {}, android: {} };
      expect(hk(cfg)).toBe(cfg);
      expect(hc(cfg)).toBe(cfg);
      expect(fb(cfg)).toBe(cfg);
    } finally { Object.assign(process.env, saved); }
  });
});

describe('Health Connect: permissões READ_* sem WRITE_*', () => {
  it('o manifest produzido pelo plugin tem só READ_* de saúde e nenhuma permissão de segundo plano ou histórico', () => {
    const m = hc.applyManifest({ manifest: { $: {}, application: [{ activity: [{ $: { 'android:name': '.MainActivity' }, 'intent-filter': [{ action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }] }] }] }] } });
    const names: string[] = m.manifest['uses-permission'].map((p: any) => p.$['android:name']);
    expect(names.length).toBe(11);
    for (const n of names) expect(n).toMatch(/^android\.permission\.health\.READ_[A-Z0-9_]+$/);
    expect(names.join(' ')).not.toMatch(/WRITE|BACKGROUND|HISTORY/);
  });
  it('check-android-project: aceita o projeto gerado com a flag, recusa WRITE_* e recusa permissão de saúde sem a flag', async () => {
    const { Builder } = req('xml2js');
    const base = () => ({ manifest: { $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' }, application: [{ activity: [{ $: { 'android:name': '.MainActivity' }, 'intent-filter': [{ action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }] }] }] }] } });
    const mk = (m: any, minSdk: boolean) => {
      const dir = mkdtempSync(path.join(tmpdir(), 'cfg-'));
      mkdirSync(path.join(dir, 'android/app/src/main'), { recursive: true });
      writeFileSync(path.join(dir, 'android/app/src/main/AndroidManifest.xml'), new Builder().buildObject(m));
      writeFileSync(path.join(dir, 'android/gradle.properties'), minSdk ? 'android.minSdkVersion=26\n' : 'x=1\n');
      return dir;
    };
    const run = (dir: string, mode: string) => spawnSync(process.execPath, [path.join(REPO, 'scripts/check-android-project.mjs'), '--root', dir, '--expect', mode], { encoding: 'utf8', env: { ...process.env, HEALTH_INTEGRATION_ENABLED: '' } });
    expect(run(mk(hc.applyManifest(base()), true), 'on').status).toBe(0);
    expect(run(mk(base(), false), 'off').status).toBe(0);
    const bad = hc.applyManifest(base());
    bad.manifest['uses-permission'].push({ $: { 'android:name': 'android.permission.health.WRITE_STEPS' } });
    expect(run(mk(bad, true), 'on').status).toBe(1);
    expect(run(mk(hc.applyManifest(base()), true), 'off').status).toBe(1);
  });
});

describe('scripts de verificação do projeto', () => {
  it('check-ios-project existe, e os workflows o chamam; check-android-project também', () => {
    expect(read('.github/workflows/ios.yml')).toContain('check-ios-project.mjs');
    expect(read('.github/workflows/ci.yml')).toContain('check-ios-project.mjs');
    expect(read('.github/workflows/android.yml')).toContain('check-android-project.mjs');
    expect(read('.github/workflows/ci.yml')).toContain('check-android-project.mjs');
  });
  it('check-ios-project, sem a flag, recusa qualquer chave de saúde; com a flag, exige o texto "não grava"', () => {
    const src = read('scripts/check-ios-project.mjs');
    expect(src).toContain('NSHealthUpdateUsageDescription');
    expect(src).toMatch(/não grava/);
    expect(src).toMatch(/background-delivery/);
  });
  it('check-no-secrets, check-pngs e check-autolinking passam no repositório', () => {
    for (const s of ['check-no-secrets.mjs', 'check-pngs.mjs', 'check-autolinking.mjs']) {
      const r = spawnSync(process.execPath, [path.join(REPO, 'scripts', s)], { cwd: REPO, encoding: 'utf8', env: { ...process.env, HEALTH_INTEGRATION_ENABLED: '', FIREBASE_ENABLED: '' } });
      expect(r.status, `${s}: ${r.stdout}${r.stderr}`).toBe(0);
    }
  });
  it('o package.json do repositório não ganhou módulos nativos opcionais (Firebase, HealthKit, Health Connect)', () => {
    const pkg = JSON.parse(read('package.json'));
    const all = JSON.stringify({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(all).not.toMatch(/react-native-firebase|react-native-healthkit|react-native-health-connect|nitro-modules/);
  });
});
