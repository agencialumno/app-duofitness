// Health Connect (Android), SÓ LEITURA: plugin de config, check do projeto gerado, mapeamento, provedor (com a biblioteca falsa),
// sincronização, desconectar, menores de 18, nenhuma escrita, nenhum valor de saúde em log e a ordem dos passos dos workflows.
// O Health Connect real, o relógio e o Google Play só dá para validar num Android de verdade (docs/saude.md).
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as M from '../../src/utils/healthConnectMapping.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as P from '../../src/utils/healthConnectProvider.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as HP from '../../src/utils/healthProviders.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as SY from '../../src/utils/healthSync.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as ST from '../../src/utils/healthStore.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as MD from '../../src/utils/healthModel.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as SNAP from '../../src/utils/accountSnapshot.js';

const REPO = path.resolve(__dirname, '../..');
const req = createRequire(path.join(REPO, 'package.json'));
const plugin = req('./plugins/withHealthConnectOptional.js');
const yaml = req('js-yaml') as { load: (s: string) => { jobs: Record<string, { env?: Record<string, string>; steps: { name?: string; run?: string; if?: string; env?: Record<string, string> }[] }> } };
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const code = (f: string) => read(f).replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');

// ---------- biblioteca falsa ----------
const T = ['Steps', 'ActiveCaloriesBurned', 'ExerciseSession', 'HeartRate', 'RestingHeartRate', 'HeartRateVariabilityRmssd', 'Vo2Max', 'SleepSession', 'Weight', 'BodyFat', 'Hydration'];
const READ_ALL = T.map((recordType) => ({ accessType: 'read', recordType }));
const PHONE = { dataOrigin: 'app.telefone' };
const WATCH = { dataOrigin: 'app.relogio', device: { type: 1 } };
const at = (y: number, mo: number, d: number, h = 12, mi = 0) => new Date(y, mo - 1, d, h, mi, 0, 0).toISOString();
const NOW = new Date(2026, 9, 29, 12, 0, 0, 0); // 29/10/2026 12:00 local

type FakeOpts = { status?: number; granted?: unknown[]; records?: Record<string, unknown[]>; fail?: string[]; pageSize?: number; requestReturns?: unknown[] | null; revokeThrows?: boolean };
function fakeLib(o: FakeOpts = {}) {
  const calls: string[] = [];
  const requested: unknown[][] = [];
  const reads: string[] = [];
  const lib = {
    calls, requested, reads,
    getSdkStatus: async () => { calls.push('getSdkStatus'); return o.status ?? 3; },
    initialize: async () => { calls.push('initialize'); return true; },
    getGrantedPermissions: async () => { calls.push('getGrantedPermissions'); return o.granted ?? READ_ALL; },
    requestPermission: async (p: unknown[]) => { calls.push('requestPermission'); requested.push(p); return o.requestReturns === undefined ? p : o.requestReturns ?? []; },
    readRecords: async (type: string, opts: { pageToken?: string }) => {
      calls.push('readRecords'); reads.push(type);
      if ((o.fail ?? []).includes(type)) throw new Error('falha simulada');
      const all = (o.records ?? {})[type] ?? [];
      if (!o.pageSize) return { records: all };
      const start = opts.pageToken ? Number(opts.pageToken) : 0;
      const next = start + o.pageSize;
      return { records: all.slice(start, next), pageToken: next < all.length ? String(next) : undefined };
    },
    revokeAllPermissions: async () => { calls.push('revokeAllPermissions'); if (o.revokeThrows) throw new Error('x'); },
    openHealthConnectSettings: () => { calls.push('openHealthConnectSettings'); },
  };
  return lib;
}
const mk = (lib: ReturnType<typeof fakeLib>) => P.createHealthConnectProvider({ loadLib: () => lib, now: () => NOW });
const by = (samples: { metric: string; date: string }[], metric: string) => samples.filter((s) => s.metric === metric);

// ---------- plugin de config ----------
describe('plugin withHealthConnectOptional', () => {
  const manifest = () => ({
    manifest: {
      $: {}, 'uses-permission': [{ $: { 'android:name': 'android.permission.INTERNET' } }],
      application: [{ activity: [{ $: { 'android:name': '.MainActivity' }, 'intent-filter': [{ action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }], category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }] }] }] }],
    },
  });
  it('SEM a flag devolve o config intacto (mesma referência): o Android gerado não muda', () => {
    const cfg = { name: 'x' };
    const old = process.env.HEALTH_INTEGRATION_ENABLED;
    delete process.env.HEALTH_INTEGRATION_ENABLED;
    try { expect(plugin(cfg)).toBe(cfg); process.env.HEALTH_INTEGRATION_ENABLED = 'false'; expect(plugin(cfg)).toBe(cfg); } finally { if (old === undefined) delete process.env.HEALTH_INTEGRATION_ENABLED; else process.env.HEALTH_INTEGRATION_ENABLED = old; }
  });
  it('está registrado no app.json e roda só com a flag', () => {
    expect(JSON.parse(read('app.json')).expo.plugins).toContain('./plugins/withHealthConnectOptional');
    expect(plugin.isEnabled({ HEALTH_INTEGRATION_ENABLED: 'true' })).toBe(true);
    expect(plugin.isEnabled({})).toBe(false);
    expect(plugin.isEnabled({ HEALTH_INTEGRATION_ENABLED: '1' })).toBe(false);
  });
  it('com a flag: só READ_* (lista fechada), queries, filtro de justificativa e alias; nenhuma WRITE_* nem segundo plano nem histórico', () => {
    const m = plugin.applyManifest(manifest());
    const names = m.manifest['uses-permission'].map((p: { $: Record<string, string> }) => p.$['android:name']);
    const health = names.filter((n: string) => n.startsWith('android.permission.health.'));
    expect(health.sort()).toEqual([...plugin.READ_PERMISSIONS].sort());
    expect(health).toHaveLength(11);
    for (const n of health) expect(n).toMatch(/^android\.permission\.health\.READ_[A-Z0-9_]+$/);
    expect(names.join(' ')).not.toMatch(/WRITE_|BACKGROUND|HISTORY/);
    expect(names).toContain('android.permission.INTERNET'); // o que já existia continua
    expect(m.manifest.queries[0].package[0].$['android:name']).toBe('com.google.android.apps.healthdata');
    const main = m.manifest.application[0].activity[0];
    expect(main['intent-filter'].some((f: { action: { $: Record<string, string> }[] }) => f.action[0]!.$['android:name'] === 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE')).toBe(true);
    const alias = m.manifest.application[0]['activity-alias'][0];
    expect(alias.$['android:name']).toBe('ViewPermissionUsageActivity');
    expect(alias.$['android:exported']).toBe('true');
    expect(alias.$['android:permission']).toBe('android.permission.START_VIEW_PERMISSION_USAGE');
    expect(alias.$['android:targetActivity']).toBe('.MainActivity');
    expect(alias['intent-filter'][0].action[0].$['android:name']).toBe('android.intent.action.VIEW_PERMISSION_USAGE');
    expect(alias['intent-filter'][0].category[0].$['android:name']).toBe('android.intent.category.HEALTH_PERMISSIONS');
  });
  it('é idempotente (rodar de novo não duplica) e sobe o minSdk para 26 sem duplicar a propriedade', () => {
    const once = plugin.applyManifest(manifest());
    const twice = plugin.applyManifest(JSON.parse(JSON.stringify(once)));
    expect(twice).toEqual(once);
    const props = plugin.applyGradleProperties(plugin.applyGradleProperties([{ type: 'property', key: 'android.minSdkVersion', value: '24' }, { type: 'property', key: 'x', value: 'y' }]));
    expect(props.filter((p: { key: string }) => p.key === 'android.minSdkVersion')).toEqual([{ type: 'property', key: 'android.minSdkVersion', value: '26' }]);
    expect(props.some((p: { key: string }) => p.key === 'x')).toBe(true);
  });
  it('as permissões do plugin são EXATAMENTE as dos tipos que o provedor lê', () => {
    const map: Record<string, string> = {
      Steps: 'READ_STEPS', ActiveCaloriesBurned: 'READ_ACTIVE_CALORIES_BURNED', ExerciseSession: 'READ_EXERCISE', HeartRate: 'READ_HEART_RATE', RestingHeartRate: 'READ_RESTING_HEART_RATE',
      HeartRateVariabilityRmssd: 'READ_HEART_RATE_VARIABILITY', Vo2Max: 'READ_VO2_MAX', SleepSession: 'READ_SLEEP', Weight: 'READ_WEIGHT', BodyFat: 'READ_BODY_FAT', Hydration: 'READ_HYDRATION',
    };
    const types = M.typesFor(Object.keys(M.CATEGORY_TYPES));
    expect(types.sort()).toEqual(Object.keys(map).sort());
    expect(types.map((t: string) => `android.permission.health.${map[t]}`).sort()).toEqual([...plugin.READ_PERMISSIONS].sort());
  });
});

// ---------- check-android-project.mjs ----------
describe('scripts/check-android-project.mjs', () => {
  const { parseStringPromise, Builder } = req('xml2js');
  const BASE = `<manifest xmlns:android="http://schemas.android.com/apk/res/android"><uses-permission android:name="android.permission.INTERNET"/><application><activity android:name=".MainActivity"><intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter></activity></application></manifest>`;
  async function project(flagged: boolean, tweak?: (m: any) => void, minSdk = flagged ? '26' : '24') {
    const dir = mkdtempSync(path.join(tmpdir(), 'hc-proj-'));
    let m = await parseStringPromise(BASE);
    if (flagged) m = plugin.applyManifest(m);
    if (tweak) tweak(m);
    mkdirSync(path.join(dir, 'android/app/src/main'), { recursive: true });
    writeFileSync(path.join(dir, 'android/app/src/main/AndroidManifest.xml'), new Builder().buildObject(m));
    writeFileSync(path.join(dir, 'android/gradle.properties'), `org.gradle.jvmargs=-Xmx2048m\n${flagged || minSdk === '26' ? `android.minSdkVersion=${minSdk}\n` : ''}`);
    return dir;
  }
  const run = (root: string, args: string[], env: Record<string, string> = {}) => {
    const r = spawnSync(process.execPath, [path.join(REPO, 'scripts/check-android-project.mjs'), '--root', root, ...args], { encoding: 'utf8', env: { ...process.env, HEALTH_INTEGRATION_ENABLED: '', ...env } });
    return { code: r.status, out: `${r.stdout}${r.stderr}` };
  };
  it('com a flag: passa e é igual ao baseline sem a flag fora do Health Connect', async () => {
    const on = await project(true);
    const off = await project(false);
    expect(run(on, ['--expect', 'on', '--baseline', off]).code).toBe(0);
    expect(run(off, ['--expect', 'off']).code).toBe(0);
  });
  it('o modo é escolhido pela flag quando não é informado', async () => {
    const on = await project(true);
    expect(run(on, [], { HEALTH_INTEGRATION_ENABLED: 'true' }).code).toBe(0);
    expect(run(on, []).code).toBe(1); // sem a flag, um projeto com Health Connect é recusado
  });
  it('FALHA se existir uma permissão WRITE_*, de segundo plano ou de histórico (com ou sem a flag)', async () => {
    for (const bad of ['android.permission.health.WRITE_STEPS', 'android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND', 'android.permission.health.READ_HEALTH_DATA_HISTORY']) {
      const dir = await project(true, (m) => m.manifest['uses-permission'].push({ $: { 'android:name': bad } }));
      const r = run(dir, ['--expect', 'on']);
      expect(r.code, bad).toBe(1);
      expect(r.out).toContain(bad);
    }
    const off = await project(false, (m) => m.manifest['uses-permission'].push({ $: { 'android:name': 'android.permission.health.WRITE_WEIGHT' } }));
    expect(run(off, ['--expect', 'off']).code).toBe(1);
  });
  it('FALHA se faltar o filtro, o alias, a categoria, o queries ou o minSdk 26; e se sobrar uma permissão READ_ fora da lista', async () => {
    const noFilter = await project(true, (m) => { m.manifest.application[0].activity[0]['intent-filter'].pop(); });
    expect(run(noFilter, ['--expect', 'on']).out).toContain('ACTION_SHOW_PERMISSIONS_RATIONALE');
    const noAlias = await project(true, (m) => { delete m.manifest.application[0]['activity-alias']; });
    expect(run(noAlias, ['--expect', 'on']).out).toContain('ViewPermissionUsageActivity');
    const noCat = await project(true, (m) => { delete m.manifest.application[0]['activity-alias'][0]['intent-filter'][0].category; });
    expect(run(noCat, ['--expect', 'on']).out).toContain('HEALTH_PERMISSIONS');
    const noQ = await project(true, (m) => { delete m.manifest.queries; });
    expect(run(noQ, ['--expect', 'on']).out).toContain('queries');
    const lowSdk = await project(true, undefined, '24');
    expect(run(lowSdk, ['--expect', 'on']).out).toContain('minSdkVersion');
    const extra = await project(true, (m) => m.manifest['uses-permission'].push({ $: { 'android:name': 'android.permission.health.READ_HEART_RATE_X' } }));
    expect(run(extra, ['--expect', 'on']).code).toBe(1);
  });
  it('FALHA se a flag mudar qualquer outra coisa além do Health Connect (comparação com o baseline)', async () => {
    const off = await project(false);
    const changed = await project(true, (m) => m.manifest['uses-permission'].push({ $: { 'android:name': 'android.permission.CAMERA' } }));
    expect(run(changed, ['--expect', 'on', '--baseline', off]).out).toContain('difere do baseline');
  });
  it('as permissões permitidas pelo script são as do plugin', () => {
    const src = read('scripts/check-android-project.mjs');
    for (const p of plugin.READ_PERMISSIONS) expect(src).toContain(p.replace('android.permission.health.READ_', ''));
  });
});

// ---------- mapeamento ----------
describe('mapeamento Health Connect -> amostras do modelo', () => {
  it('passos: vale a fonte de MAIOR total no dia (sem somar celular e relógio) e o relógio vira o rótulo "Relógio"', () => {
    const recs = [
      { startTime: at(2026, 10, 20, 9), endTime: at(2026, 10, 20, 10), count: 5000, metadata: PHONE },
      { startTime: at(2026, 10, 20, 9), endTime: at(2026, 10, 20, 10), count: 3000, metadata: WATCH },
      { startTime: at(2026, 10, 20, 15), endTime: at(2026, 10, 20, 16), count: 6000, metadata: WATCH },
      { startTime: at(2026, 10, 21, 9), endTime: at(2026, 10, 21, 10), count: 4000, metadata: PHONE },
    ];
    const out = M.mapSteps(recs);
    expect(out.find((s: any) => s.date === '2026-10-20')).toMatchObject({ metric: 'steps', value: 9000, source: 'health_connect_watch' });
    expect(out.find((s: any) => s.date === '2026-10-21')).toMatchObject({ value: 4000, source: 'health_connect' });
  });
  it('nenhum nome de dispositivo nem pacote de origem é devolvido', () => {
    const recs = [{ startTime: at(2026, 10, 20, 9), endTime: at(2026, 10, 20, 10), count: 100, metadata: { dataOrigin: 'com.fabricante.app', device: { type: 1, manufacturer: 'Fab', model: 'Relogio X' } } }];
    const json = JSON.stringify(M.mapSteps(recs));
    expect(json).not.toMatch(/fabricante|Relogio|Fab|dataOrigin|device/i);
  });
  it('virada de dia e fuso: o dia é o LOCAL do aparelho (23:59 e 00:01 caem em dias diferentes)', () => {
    const recs = [
      { startTime: at(2026, 10, 20, 23, 59), endTime: at(2026, 10, 20, 23, 59), count: 100, metadata: PHONE },
      { startTime: at(2026, 10, 21, 0, 1), endTime: at(2026, 10, 21, 0, 1), count: 200, metadata: PHONE },
    ];
    const out = M.mapSteps(recs);
    expect(out.map((s: any) => [s.date, s.value]).sort()).toEqual([['2026-10-20', 100], ['2026-10-21', 200]]);
    expect(out[0].tz).toBe(MD.deviceTz());
  });
  it('dia sem dado nunca vira zero; valores inválidos são descartados', () => {
    expect(M.mapSteps([])).toEqual([]);
    expect(M.mapSteps([{ startTime: at(2026, 10, 20), endTime: at(2026, 10, 20), count: 0, metadata: PHONE }])).toEqual([]);
    expect(M.mapSteps([{ startTime: 'lixo', count: 10 }, { startTime: at(2026, 10, 20), count: 'x' }, null as any])).toEqual([]);
    expect(M.mapWeight([{ time: at(2026, 10, 20), weight: { inKilograms: 5 } }])).toEqual([]); // fora da faixa do modelo
  });
  it('sono: duas fontes que se sobrepõem contam uma vez (união), atribuído ao dia em que a noite termina', () => {
    const phone = { startTime: at(2026, 10, 20, 22, 0), endTime: at(2026, 10, 21, 6, 0), metadata: PHONE };
    const watch = { startTime: at(2026, 10, 20, 22, 30), endTime: at(2026, 10, 21, 6, 30), stages: [{ startTime: at(2026, 10, 20, 22, 30), endTime: at(2026, 10, 21, 6, 30), stage: 2 }], metadata: WATCH };
    const out = M.mapSleepSessions([phone, watch]);
    expect(out.find((s: any) => s.metric === 'sleep_duration')).toMatchObject({ date: '2026-10-21', value: 510, source: 'health_connect_watch' });
    expect(out.find((s: any) => s.metric === 'bedtime').value).toBe(22 * 60);
    expect(out.find((s: any) => s.metric === 'wake_time').value).toBe(6 * 60 + 30);
  });
  it('sono com fases: acordado não conta; leve, profundo e REM contam', () => {
    const rec = {
      startTime: at(2026, 10, 20, 22, 30), endTime: at(2026, 10, 21, 6, 30), metadata: PHONE,
      stages: [
        { startTime: at(2026, 10, 20, 22, 30), endTime: at(2026, 10, 21, 2, 0), stage: 4 },
        { startTime: at(2026, 10, 21, 2, 0), endTime: at(2026, 10, 21, 4, 0), stage: 5 },
        { startTime: at(2026, 10, 21, 4, 0), endTime: at(2026, 10, 21, 4, 20), stage: 1 },
        { startTime: at(2026, 10, 21, 4, 20), endTime: at(2026, 10, 21, 6, 30), stage: 6 },
      ],
    };
    expect(M.mapSleepSessions([rec]).find((s: any) => s.metric === 'sleep_duration').value).toBe(210 + 120 + 130);
  });
  it('treino: minutos por dia; a mesma sessão gravada por dois apps conta uma vez', () => {
    const s = { startTime: at(2026, 10, 20, 7), endTime: at(2026, 10, 20, 7, 45), metadata: WATCH };
    const out = M.mapExercise([s, { ...s, metadata: PHONE }, { startTime: at(2026, 10, 20, 18), endTime: at(2026, 10, 20, 18, 30), metadata: PHONE }]);
    expect(out).toEqual([expect.objectContaining({ metric: 'exercise_minutes', date: '2026-10-20', value: 75 })]);
  });
  it('coração: média diária da FC, FC em repouso, HRV (RMSSD) e VO2 máx. (último do dia)', () => {
    const hr = [{ startTime: at(2026, 10, 20, 8), endTime: at(2026, 10, 20, 9), metadata: WATCH, samples: [{ time: at(2026, 10, 20, 8, 5), beatsPerMinute: 60 }, { time: at(2026, 10, 20, 8, 10), beatsPerMinute: 80 }] }];
    expect(M.mapHeartRate(hr)[0]).toMatchObject({ metric: 'heart_rate', value: 70, source: 'health_connect_watch' });
    expect(M.mapRestingHeartRate([{ time: at(2026, 10, 20, 6), beatsPerMinute: 58, metadata: PHONE }, { time: at(2026, 10, 20, 23), beatsPerMinute: 62, metadata: PHONE }])[0]).toMatchObject({ metric: 'resting_hr', value: 60 });
    expect(M.mapHrv([{ time: at(2026, 10, 20, 6), heartRateVariabilityMillis: 42, metadata: PHONE }])[0]).toMatchObject({ metric: 'hrv', value: 42 });
    expect(M.mapVo2Max([{ time: at(2026, 10, 20, 6), vo2MillilitersPerMinuteKilogram: 40, metadata: PHONE }, { time: at(2026, 10, 20, 9), vo2MillilitersPerMinuteKilogram: 42, metadata: PHONE }])[0]).toMatchObject({ metric: 'vo2max', value: 42 });
  });
  it('corpo, água e energia: peso em kg (último do dia), % de gordura, copos de 250 mL e kcal', () => {
    expect(M.mapWeight([{ time: at(2026, 10, 20, 7), weight: { inKilograms: 70 }, metadata: PHONE }, { time: at(2026, 10, 20, 21), weight: { inKilograms: 71.2 }, metadata: PHONE }])[0]).toMatchObject({ metric: 'weight', value: 71.2 });
    expect(M.mapBodyFat([{ time: at(2026, 10, 20, 7), percentage: 18.5, metadata: PHONE }])[0]).toMatchObject({ metric: 'body_fat', value: 18.5 });
    expect(M.mapHydration([{ startTime: at(2026, 10, 20, 9), endTime: at(2026, 10, 20, 9), volume: { inMilliliters: 500 }, metadata: PHONE }, { startTime: at(2026, 10, 20, 15), endTime: at(2026, 10, 20, 15), volume: { inMilliliters: 1000 }, metadata: PHONE }])[0]).toMatchObject({ metric: 'water', value: 6 });
    expect(M.mapActiveEnergy([{ startTime: at(2026, 10, 20, 9), endTime: at(2026, 10, 20, 10), energy: { inKilocalories: 250.4 }, metadata: PHONE }])[0]).toMatchObject({ metric: 'active_energy', value: 250 });
  });
  it('só permissões de LEITURA: nenhum accessType write', () => {
    const perms = M.permissionsFor(Object.keys(M.CATEGORY_TYPES));
    expect(perms).toHaveLength(11);
    for (const p of perms) expect(p.accessType).toBe('read');
    expect(M.activeCategories([{ accessType: 'read', recordType: 'Steps' }, { accessType: 'write', recordType: 'SleepSession' }])).toEqual(['activity']);
  });
});

// ---------- provedor ----------
describe('HealthConnectProvider (biblioteca falsa)', () => {
  it('lê os 30 dias de todas as categorias e mapeia para o modelo, só com leitura', async () => {
    const lib = fakeLib({
      records: {
        Steps: [{ startTime: at(2026, 10, 28, 9), endTime: at(2026, 10, 28, 10), count: 8000, metadata: WATCH }],
        SleepSession: [{ startTime: at(2026, 10, 27, 23), endTime: at(2026, 10, 28, 7), metadata: PHONE }],
        Weight: [{ time: at(2026, 10, 28, 7), weight: { inKilograms: 70 }, metadata: PHONE }],
        Hydration: [{ startTime: at(2026, 10, 28, 9), endTime: at(2026, 10, 28, 9), volume: { inMilliliters: 750 }, metadata: PHONE }],
      },
    });
    const p = mk(lib);
    const res = await p.readDetailed({});
    expect(res.window).toEqual({ from: '2026-09-30', to: '2026-10-29' });
    expect(by(res.samples, 'steps')[0]).toMatchObject({ value: 8000, source: 'health_connect_watch' });
    expect(by(res.samples, 'sleep_duration')[0]).toMatchObject({ value: 480, date: '2026-10-28' });
    expect(by(res.samples, 'weight')[0]).toMatchObject({ value: 70 });
    expect(by(res.samples, 'water')[0]).toMatchObject({ value: 3 });
    expect(res.report.activity).toEqual({ ok: true, count: 1 });
    // só leitura: nenhuma chamada de escrita
    expect(new Set(lib.calls)).toEqual(new Set(['getSdkStatus', 'initialize', 'getGrantedPermissions', 'readRecords']));
    expect(new Set(lib.reads)).toEqual(new Set(T));
  });
  it('a janela de leitura é a de 30 dias (nada de histórico)', async () => {
    const lib = fakeLib();
    const opts: any[] = [];
    const orig = lib.readRecords;
    lib.readRecords = async (t: string, o: any) => { opts.push(o); return orig(t, o); };
    await mk(lib).readDetailed({ categories: ['activity'] });
    const f = opts[0].timeRangeFilter;
    expect(f.operator).toBe('between');
    expect(new Date(f.startTime)).toEqual(new Date(2026, 8, 30, 0, 0, 0, 0));
    expect(opts[0].ascendingOrder).toBe(true);
  });
  it('lê todas as páginas quando a biblioteca pagina (pageToken)', async () => {
    const recs = Array.from({ length: 5 }, (_, i) => ({ startTime: at(2026, 10, 20 + (i % 3), 9), endTime: at(2026, 10, 20 + (i % 3), 10), count: 1000, metadata: PHONE }));
    const lib = fakeLib({ records: { Steps: recs }, pageSize: 2 });
    const res = await mk(lib).readDetailed({ categories: ['activity'] });
    expect(lib.reads.filter((t) => t === 'Steps')).toHaveLength(3); // 3 páginas
    expect(res.samples.filter((s: any) => s.metric === 'steps').reduce((a: number, s: any) => a + s.value, 0)).toBe(5000);
  });
  it('disponibilidade: indisponível, precisa instalar/atualizar e disponível', async () => {
    expect(await mk(fakeLib({ status: 3 })).availability()).toBe('available');
    expect(await mk(fakeLib({ status: 2 })).availability()).toBe('update_required');
    expect(await mk(fakeLib({ status: 1 })).availability()).toBe('unavailable');
    expect(await P.createHealthConnectProvider({ loadLib: () => null }).availability()).toBe('unavailable');
    const broken = fakeLib(); broken.getSdkStatus = async () => { throw new Error('x'); };
    expect(await mk(broken).availability()).toBe('unavailable');
  });
  it('indisponível/precisa atualizar: não pede permissão, não lê, devolve "indisponível"', async () => {
    for (const status of [1, 2]) {
      const lib = fakeLib({ status });
      const p = mk(lib);
      expect(await p.isAvailable()).toBe(false);
      const r = await p.requestPermissions(['activity']);
      expect(r).toMatchObject({ granted: [], unavailable: true });
      const d = await p.readDetailed({ categories: ['activity'] });
      expect(d.samples).toEqual([]);
      expect(d.report.activity).toMatchObject({ ok: false, unavailable: true });
      expect(lib.calls).not.toContain('requestPermission');
      expect(lib.calls).not.toContain('readRecords');
    }
  });
  it('permissão PARCIAL: o app sabe quais categorias estão ativas, não lê o que não foi concedido e vazio não é erro', async () => {
    const lib = fakeLib({ granted: [{ accessType: 'read', recordType: 'Steps' }, { accessType: 'read', recordType: 'Weight' }], requestReturns: [{ accessType: 'read', recordType: 'Steps' }, { accessType: 'read', recordType: 'Weight' }] });
    const p = mk(lib);
    const r = await p.requestPermissions(['activity', 'sleep', 'body']);
    expect(r).toMatchObject({ granted: ['activity', 'body'], denied: ['sleep'], unavailable: false });
    expect(await p.getPermissions(['activity', 'sleep', 'body'])).toEqual({ activity: 'granted', sleep: 'denied', body: 'granted' });
    const d = await p.readDetailed({ categories: ['activity', 'sleep', 'body'] });
    expect(d.report.sleep).toEqual({ ok: false, count: 0, inactive: true });
    expect(d.report.activity).toEqual({ ok: true, count: 0 }); // concedida e sem registros: "Sem dados ainda", não erro
    expect(lib.reads).not.toContain('SleepSession');
    expect(lib.reads).not.toContain('ActiveCaloriesBurned'); // só o tipo concedido da categoria
    expect(lib.reads).toContain('Steps');
  });
  it('permissão negada por completo: nenhuma categoria ativa e nada é lido', async () => {
    const lib = fakeLib({ granted: [], requestReturns: [] });
    const p = mk(lib);
    expect(await p.requestPermissions(['activity'])).toMatchObject({ granted: [], denied: ['activity'], unavailable: false });
    const d = await p.readDetailed({ categories: ['activity', 'heart'] });
    expect(d.report.activity.inactive).toBe(true);
    expect(lib.calls).not.toContain('readRecords');
  });
  it('categoria que FALHA não derruba as outras', async () => {
    const lib = fakeLib({ fail: ['SleepSession'], records: { Steps: [{ startTime: at(2026, 10, 28, 9), endTime: at(2026, 10, 28, 10), count: 100, metadata: PHONE }] } });
    const d = await mk(lib).readDetailed({ categories: ['activity', 'sleep'] });
    expect(d.report.sleep).toEqual({ ok: false, count: 0 });
    expect(d.report.activity.ok).toBe(true);
    expect(by(d.samples, 'steps')).toHaveLength(1);
  });
  it('só pede permissões de leitura; nenhum método de escrita é chamado nem existe no provedor', async () => {
    const lib = fakeLib();
    const p = mk(lib);
    await p.requestPermissions(['activity', 'sleep', 'heart', 'body', 'hydration']);
    await p.readDetailed({});
    for (const batch of lib.requested) for (const perm of batch as { accessType: string }[]) expect(perm.accessType).toBe('read');
    expect(lib.calls.join(' ')).not.toMatch(/insert|delete|update|write/i);
    expect(Object.keys(p).join(' ')).not.toMatch(/insert|delete|write|save/i);
  });
  it('revogar: usa revokeAllPermissions quando existe; sem o método ou com erro, não lança', async () => {
    const lib = fakeLib();
    expect(await mk(lib).revokeAll()).toEqual({ revoked: true, supported: true });
    expect(lib.calls).toContain('revokeAllPermissions');
    const semMetodo: any = fakeLib(); delete semMetodo.revokeAllPermissions;
    expect(await mk(semMetodo).revokeAll()).toEqual({ revoked: false, supported: false });
    expect(await mk(fakeLib({ revokeThrows: true })).revokeAll()).toEqual({ revoked: false, supported: true });
    const p = mk(lib);
    expect(p.openSettings()).toBe(true);
    expect(lib.calls).toContain('openHealthConnectSettings');
  });
  it('NENHUM valor de saúde é impresso em console durante a leitura', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((k) => vi.spyOn(console, k).mockImplementation(() => {}));
    try {
      const lib = fakeLib({ fail: ['Hydration'], records: { Steps: [{ startTime: at(2026, 10, 28, 9), endTime: at(2026, 10, 28, 10), count: 12345, metadata: WATCH }], Weight: [{ time: at(2026, 10, 28, 7), weight: { inKilograms: 71.7 } }] } });
      const p = mk(lib);
      await p.requestPermissions(['activity', 'body', 'hydration']);
      await p.readDetailed({});
      await SY.syncHealth({ provider: p, health: ST.emptyHealthV2(), connection: ST.grantConsent(ST.emptyConnection(), { provider: 'health_connect', categories: ['activity', 'body'] }) });
      for (const s of spies) expect(s).not.toHaveBeenCalled();
    } finally { spies.forEach((s) => s.mockRestore()); }
  });
});

// ---------- sincronização, deduplicação, desconectar, snapshot ----------
describe('sincronização do Health Connect', () => {
  const conn = (cats = ['activity', 'sleep', 'body']) => ST.grantConsent(ST.emptyConnection(), { provider: 'health_connect', categories: cats, now: NOW });
  it('importa com origem Health Connect/Relógio, grava "Atualizado" e relê a janela sem duplicar', async () => {
    const lib = fakeLib({ records: { Steps: [{ startTime: at(2026, 10, 28, 9), endTime: at(2026, 10, 28, 10), count: 8000, metadata: WATCH }] } });
    const p = mk(lib);
    let r = await SY.syncHealth({ provider: p, health: ST.emptyHealthV2(), connection: conn(), now: NOW });
    expect(r.changed).toBe(true);
    expect(r.connection.importedAt).toBe(NOW.toISOString());
    expect(SY.updatedAtLabel(r.connection.importedAt)).toBe('Atualizado às 12:00');
    r = await SY.syncHealth({ provider: p, health: r.health, connection: r.connection, now: NOW });
    expect(by(r.health.samples, 'steps')).toHaveLength(1);
    expect(r.health.samples.every((s: any) => MD.HEALTH_CONNECT_SOURCES.includes(s.source))).toBe(true);
  });
  it('o Health Connect só sincroniza com a SUA conexão; nunca com a do Apple Saúde, e nunca para menores', async () => {
    const p = mk(fakeLib());
    const apple = ST.grantConsent(ST.emptyConnection(), { provider: 'apple_saude', categories: ['activity'], now: NOW });
    expect(SY.canSync({ connection: apple, provider: p, minor: false })).toBe(false);
    expect(SY.canSync({ connection: conn(), provider: p, minor: false })).toBe(true);
    expect(SY.canSync({ connection: conn(), provider: p, minor: true })).toBe(false);
    expect((await SY.syncHealth({ provider: p, health: ST.emptyHealthV2(), connection: conn(), minor: true })).skipped).toBe('indisponivel');
  });
  it('deduplicação com o peso MANUAL do mesmo dia: valor próximo é descartado, valor diferente entra', async () => {
    const base = ST.addSample(ST.emptyHealthV2(), { metric: 'weight', value: 70, date: '2026-10-28', tz: MD.deviceTz(), source: 'manual' });
    const same = fakeLib({ records: { Weight: [{ time: at(2026, 10, 28, 7), weight: { inKilograms: 70.1 }, metadata: PHONE }] } });
    let r = await SY.syncHealth({ provider: mk(same), health: base, connection: conn(['body']), now: NOW });
    expect(r.health.samples.filter((s: any) => s.metric === 'weight')).toHaveLength(1);
    const diff = fakeLib({ records: { Weight: [{ time: at(2026, 10, 28, 7), weight: { inKilograms: 72 }, metadata: PHONE }] } });
    r = await SY.syncHealth({ provider: mk(diff), health: base, connection: conn(['body']), now: NOW });
    expect(r.health.samples.filter((s: any) => s.metric === 'weight')).toHaveLength(2);
  });
  it('categoria que falha mantém o que já havia; categoria inativa também', async () => {
    const before = ST.addSample(ST.emptyHealthV2(), { metric: 'sleep_duration', value: 400, date: '2026-10-27', tz: MD.deviceTz(), source: 'health_connect' });
    const lib = fakeLib({ fail: ['SleepSession'], records: { Steps: [{ startTime: at(2026, 10, 28, 9), endTime: at(2026, 10, 28, 10), count: 100, metadata: PHONE }] } });
    const r = await SY.syncHealth({ provider: mk(lib), health: before, connection: conn(['activity', 'sleep']), now: NOW });
    expect(by(r.health.samples, 'sleep_duration')).toHaveLength(1);
    expect(by(r.health.samples, 'steps')).toHaveLength(1);
    expect(r.report.sleep.ok).toBe(false);
  });
  it('mergeImported do Health Connect não toca nas amostras do Apple Saúde nem nas manuais; e o do Apple continua como era', () => {
    let h = ST.emptyHealthV2();
    h = ST.addSample(h, { metric: 'steps', value: 1000, date: '2026-10-28', tz: 'X', source: 'apple_saude' });
    h = ST.addSample(h, { metric: 'water', value: 3, date: '2026-10-28', tz: 'X', source: 'manual' });
    const out = ST.mergeImported(h, [], { from: '2026-10-01', provider: 'health_connect' });
    expect(out.samples).toHaveLength(2);
    const apple = ST.mergeImported(h, [], { from: '2026-10-01' }); // padrão: Apple
    expect(apple.samples.map((s: any) => s.source)).toEqual(['manual']);
  });
  it('desconectar apaga SÓ o que veio do Health Connect (e do relógio dele); manual e Apple ficam', () => {
    let h = ST.emptyHealthV2();
    for (const [i, source] of ['health_connect', 'health_connect_watch', 'manual', 'apple_saude', 'exemplo'].entries()) h = ST.addSample(h, { metric: 'steps', value: 100 + i, date: `2026-10-2${i}`, tz: 'X', source });
    const r = ST.disconnectAndErase(h, conn(['activity']));
    expect(r.removed).toBe(2);
    expect(r.health.samples.map((s: any) => s.source).sort()).toEqual(['apple_saude', 'exemplo', 'manual']);
    expect(r.connection.provider).toBeNull();
  });
  it('os dados do Health Connect entram no snapshot da conta, voltam ao entrar e somem ao excluir a conta', async () => {
    const m = new Map<string, string>();
    const st = {
      getAllKeys: async () => [...m.keys()], getItem: async (k: string) => (m.has(k) ? (m.get(k) as string) : null), setItem: async (k: string, v: string) => { m.set(k, v); },
      removeItem: async (k: string) => { m.delete(k); }, multiGet: async (ks: string[]) => ks.map((k) => [k, m.has(k) ? (m.get(k) as string) : null]),
      multiSet: async (ps: [string, string][]) => { ps.forEach(([k, v]) => m.set(k, v)); }, multiRemove: async (ks: string[]) => { ks.forEach((k) => m.delete(k)); },
    };
    await SNAP.bindAccount(st, 'uid1');
    const h = ST.addSample(ST.emptyHealthV2(), { metric: 'steps', value: 9000, date: '2026-10-28', tz: 'X', source: 'health_connect_watch' });
    await ST.saveHealthV2(st, h);
    await ST.saveConnection(st, conn(['activity']));
    await SNAP.snapshotAndClear(st, 'uid1');
    expect([...m.keys()].filter((k) => k.startsWith('@duo_'))).toEqual([]); // saiu do aparelho ativo
    await SNAP.bindAccount(st, 'uid1');
    const back = await ST.loadHealthV2(st);
    expect(back.health.samples[0]).toMatchObject({ source: 'health_connect_watch', value: 9000 });
    expect((await ST.loadConnection(st)).provider).toBe('health_connect');
    await SNAP.deleteAccountLocalData(st, 'uid1');
    expect([...m.keys()].filter((k) => k.startsWith('@duo_') || k.startsWith('@duoacct:'))).toEqual([]);
  });
});

// ---------- escolha do provedor ----------
describe('selectHealthProvider por plataforma', () => {
  const lib = () => fakeLib();
  it('Android adulto com a flag e a biblioteca: Health Connect real; sem a flag, menor de 18 ou web: manual', () => {
    expect(HP.selectHealthProvider({ flag: 'true', platform: 'android', loadHealthConnectLib: lib }).source).toBe('healthconnect');
    expect(HP.selectHealthProvider({ flag: 'true', platform: 'android', loadHealthConnectLib: lib }).readDetailed).toBeTypeOf('function');
    expect(HP.selectHealthProvider({ flag: 'false', platform: 'android', loadHealthConnectLib: lib }).source).toBe('manual');
    expect(HP.selectHealthProvider({ flag: '', platform: 'android', loadHealthConnectLib: lib }).source).toBe('manual');
    expect(HP.selectHealthProvider({ flag: 'true', platform: 'web', loadHealthConnectLib: lib }).source).toBe('manual');
  });
  it('MENOR de 18 no Android: SEMPRE o provedor manual (sem biblioteca, sem permissão), com a flag ligada', async () => {
    const l = fakeLib();
    const p = HP.selectHealthProvider({ flag: 'true', platform: 'android', minor: true, loadHealthConnectLib: () => l });
    expect(p.source).toBe('manual');
    expect(await p.readSamples()).toBeNull();
    expect(l.calls).toEqual([]);
    expect(HP.selectProvider({ flag: 'true', platform: 'android', minor: true, loadHealthConnectLib: () => l }).source).toBe('manual');
  });
  it('Android sem a biblioteca no build: stub indisponível que não pede nada', async () => {
    const p = HP.selectHealthProvider({ flag: 'true', platform: 'android' });
    expect(p.source).toBe('healthconnect');
    expect(await p.isAvailable()).toBe(false);
    expect((await p.requestPermissions(['activity'])).unavailable).toBe(true);
  });
  it('o iOS continua com o HealthKit (nada mudou)', () => {
    const hk = HP.selectHealthProvider({ flag: 'true', platform: 'ios', loadLib: () => ({}), loadHealthConnectLib: lib });
    expect(hk.source).toBe('healthkit');
    expect(HP.selectHealthProvider({ flag: 'true', platform: 'ios', loadHealthConnectLib: lib }).source).toBe('healthkit');
  });
});

// ---------- varreduras do código ----------
function walk(dir: string, exts: string[]): string[] {
  return readdirSync(path.join(REPO, dir)).flatMap((n) => {
    const rel = `${dir}/${n}`;
    if (n === 'node_modules') return [];
    return statSync(path.join(REPO, rel)).isDirectory() ? walk(rel, exts) : exts.some((e) => n.endsWith(e)) ? [rel] : [];
  });
}
describe('varredura: só leitura e sem log', () => {
  it('nenhum WRITE_*, insertRecords, deleteRecords nem accessType de escrita em src/, plugins/ ou app.json', () => {
    for (const f of [...walk('src', ['.js']), ...walk('plugins', ['.js']), 'app.json']) {
      const c = code(f);
      expect(c, f).not.toMatch(/health\.WRITE_|\bWRITE_[A-Z_]+|insertRecords|deleteRecords|updateRecords|accessType:\s*['"]write['"]/);
      expect(c, f).not.toMatch(/READ_HEALTH_DATA_IN_BACKGROUND|READ_HEALTH_DATA_HISTORY|BackgroundAccess|ReadHealthDataHistory/);
    }
  });
  it('os arquivos do Health Connect não usam console, rede, Linking nem analytics', () => {
    for (const f of ['src/utils/healthConnectMapping.js', 'src/utils/healthConnectProvider.js', 'src/utils/healthConnectLib.js', 'src/utils/healthSync.js']) {
      expect(code(f), f).not.toMatch(/console\.|\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|Share\.share|Linking\.|analytics/i);
    }
  });
  it('a biblioteca só é importada pelo carregador opcional (try/catch), nunca direto', () => {
    const importers = walk('src', ['.js']).filter((f) => /from 'react-native-health-connect'|require\('react-native-health-connect'\)/.test(read(f)));
    expect(importers).toEqual(['src/utils/healthConnectLib.js']);
    expect(read('src/utils/healthConnectLib.js')).toMatch(/try \{ lib = require\('react-native-health-connect'\); \} catch/);
  });
  it('package.json do repositório NÃO tem a biblioteca (entra só no CI, como Firebase e HealthKit)', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(JSON.stringify(pkg.dependencies) + JSON.stringify(pkg.devDependencies)).not.toContain('health-connect');
  });
});

// ---------- biblioteca fixa e instalação ----------
describe('biblioteca e instalação (CI)', () => {
  it('versão EXATA fixada em healthconnect/native-deps.json e instalação só com a flag', () => {
    const cfg = JSON.parse(read('healthconnect/native-deps.json'));
    expect(cfg.pinned).toEqual({ 'react-native-health-connect': '4.1.3' });
    for (const v of Object.values(cfg.pinned)) expect(v).toMatch(/^\d+\.\d+\.\d+$/);
    const off = spawnSync(process.execPath, [path.join(REPO, 'scripts/install-healthconnect-deps.mjs'), '--dry-run'], { encoding: 'utf8', env: { ...process.env, HEALTH_INTEGRATION_ENABLED: '' } });
    expect(off.stdout).toContain('nenhum módulo do Health Connect será instalado');
    const on = spawnSync(process.execPath, [path.join(REPO, 'scripts/install-healthconnect-deps.mjs'), '--dry-run'], { encoding: 'utf8', env: { ...process.env, HEALTH_INTEGRATION_ENABLED: 'true' } });
    expect(on.stdout).toContain('react-native-health-connect@4.1.3');
  });
  it('check-autolinking: com a flag no Android exige o Health Connect; no iOS não; sem a flag não exige nada', () => {
    const run = (platform: string, flag: string) => {
      const r = spawnSync(process.execPath, [path.join(REPO, 'scripts/check-autolinking.mjs'), '--platform', platform], { encoding: 'utf8', cwd: REPO, env: { ...process.env, HEALTH_INTEGRATION_ENABLED: flag } });
      return { code: r.status, out: `${r.stdout}${r.stderr}` };
    };
    const a = run('android', 'true');
    expect(a.code).toBe(1);
    expect(a.out).toContain('react-native-health-connect');
    expect(a.out).toContain('install-healthconnect-deps.mjs');
    expect(run('android', '').code).toBe(0);
  });
});

// ---------- workflows ----------
describe('workflows: Health Connect', () => {
  const steps = (f: string, job: string) => yaml.load(read(f)).jobs[job]!.steps!;
  const idx = (st: { name?: string }[], re: RegExp) => st.findIndex((s) => re.test(s.name ?? ''));

  it('android.yml: a flag e a EXPO_PUBLIC no env do job; instala o módulo SÓ com a flag, antes do prebuild; confere o projeto depois', () => {
    const wf = yaml.load(read('.github/workflows/android.yml'));
    const env = wf.jobs.build!.env!;
    expect(env.HEALTH_INTEGRATION_ENABLED).toBe('${{ vars.HEALTH_INTEGRATION_ENABLED }}');
    expect(env.EXPO_PUBLIC_HEALTH_INTEGRATION).toBe('${{ vars.HEALTH_INTEGRATION_ENABLED }}');
    const st = wf.jobs.build!.steps;
    const inst = idx(st, /Health Connect \(opcional\) - instalar/);
    const pre = idx(st, /Gerar projeto Android/);
    const auto = idx(st, /Conferir autolinking/);
    const chk = idx(st, /Conferir o projeto Android gerado/);
    const build = idx(st, /^Build \(APK e AAB\)/);
    expect(inst).toBeGreaterThan(-1);
    expect(st[inst]!.if).toBe("env.HEALTH_INTEGRATION_ENABLED == 'true'");
    expect(inst).toBeLessThan(pre);
    expect(pre).toBeLessThan(auto);
    expect(auto).toBeLessThan(chk);
    expect(chk).toBeLessThan(build);
    expect(st[chk]!.run).toContain('check-android-project.mjs');
  });
  it('ios.yml NÃO instala o Health Connect (o iOS não muda)', () => {
    expect(read('.github/workflows/ios.yml')).not.toMatch(/healthconnect|health-connect|check-android-project/i);
  });
  it('ci.yml: o job android-prebuild-healthconnect gera sem a flag (baseline), depois com a flag, e confere o manifest', () => {
    const st = steps('.github/workflows/ci.yml', 'android-prebuild-healthconnect');
    const base = idx(st, /SEM a flag \(baseline\)/);
    const inst = idx(st, /Instalar o módulo do Health Connect/);
    const auto = idx(st, /autolinking do Android com o Health Connect/);
    const pre = idx(st, /COM a flag/);
    const chk = idx(st, /Conferir o projeto Android gerado/);
    const clean = idx(st, /Apagar a configuração falsa/);
    expect([base, inst, auto, pre, chk, clean].every((i) => i > -1)).toBe(true);
    expect(base < inst && inst < auto && auto < pre && pre < chk && chk < clean).toBe(true);
    expect(st[base]!.run).toContain('--expect off');
    expect(st[chk]!.run).toContain('--expect on');
    expect(st[chk]!.run).toContain('--baseline');
    expect(st[chk]!.env!.HEALTH_INTEGRATION_ENABLED).toBe('true');
    expect(st[clean]!.if).toBe('always()');
    expect(read('.github/workflows/ci.yml')).toContain('google-services.json'); // configuração FALSA do Firebase
  });
});

describe('interface (tela Conectar no Android)', () => {
  it('tem disponibilidade, Play Store, permissões por categoria, desconectar com revogação, política de privacidade e dica do relógio', () => {
    const c = code('src/screens/HealthConnectScreen.js');
    for (const id of ['connect-update', 'connect-playstore', 'connect-unavailable', 'connect-perms', 'connect-privacy-link', 'connect-open-settings', 'connect-sync-hint']) expect(c, id).toContain(id);
    expect(c).toContain('provider.revokeAll');
    expect(c).toContain("provider.availability");
    expect(c).not.toMatch(/Linking\./); // abrir links fica em utils/externalLinks.js
    expect(read('src/utils/externalLinks.js')).toContain('market://details?id=com.google.android.apps.healthdata');
    expect(code('src/screens/HealthScreen.js')).toContain('health-watch-hint');
  });
  it('os textos do Android não prometem nada, não falam de dieta/diagnóstico e não citam Apple', async () => {
    // @ts-expect-error módulo JS do app, sem tipos
    const mod = await import('../../src/data/healthConnectContent.js');
    const text = JSON.stringify(mod.ANDROID_COPY);
    expect(text).not.toMatch(/Apple|iPhone|dieta|caloria|diagn|tratamento|cura|emagre/i);
    expect(text).toContain('Só leitura');
  });
});
