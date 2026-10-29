// HealthKitProvider (só leitura) com uma biblioteca FALSA: mapeamento de cada tipo, sono, fuso, categoria falhando, retorno vazio,
// origem Apple Watch sem guardar nomes, ordem autorização -> consulta e nenhum valor de saúde em log.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { createHealthKitProvider } from '../../src/utils/healthKitProvider.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as K from '../../src/utils/healthKitMapping.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as P from '../../src/utils/healthProviders.js';

const REPO = path.resolve(__dirname, '../..');
const NOW = new Date(2026, 5, 15, 12, 30, 0); // 15/06/2026 12:30 local
const L = (d: number, h = 0, m = 0) => new Date(2026, 5, d, h, m, 0, 0); // dia/hora LOCAL de junho de 2026
const WATCH = { name: 'Apple Watch de Victor Barros' };
const PHONE = { name: 'iPhone de Victor' };

type Fake = {
  lib: Record<string, any>;
  calls: { auth: any[]; queried: string[]; writes: string[] };
};
function fakeLib(data: Partial<Record<string, any>> = {}, opts: { fail?: string[]; unavailable?: boolean } = {}): Fake {
  const calls = { auth: [] as any[], queried: [] as string[], writes: [] as string[] };
  const requested = new Set<string>();
  const guard = (id: string) => {
    if (!requested.has(id)) throw new Error('CRASH: tipo consultado sem autorização');
    calls.queried.push(id);
    if (opts.fail?.includes(id)) throw new Error('falha simulada com dado secreto 12345');
  };
  const lib: Record<string, any> = {
    isHealthDataAvailable: async () => !opts.unavailable,
    requestAuthorization: async (a: { toRead?: string[]; toShare?: string[] }) => { calls.auth.push(a); (a.toRead || []).forEach((t) => requested.add(t)); return true; },
    getRequestStatusForAuthorization: async () => 'unnecessary',
    queryStatisticsCollectionForQuantity: async (id: string) => { guard(id); return data[id] ?? []; },
    queryQuantitySamples: async (id: string) => { guard(id); return data[id] ?? []; },
    queryCategorySamples: async (id: string) => { guard(id); return data[id] ?? []; },
    queryWorkoutSamples: async () => { guard('HKWorkoutTypeIdentifier'); return data.HKWorkoutTypeIdentifier ?? []; },
  };
  for (const w of ['saveQuantitySample', 'saveCategorySample', 'saveWorkoutSample', 'deleteObjects']) lib[w] = async () => { calls.writes.push(w); };
  return { lib, calls };
}
const day = (d: number, extra: Record<string, unknown>) => ({ startDate: L(d), endDate: L(d + 1), sources: [PHONE], ...extra });
const make = (f: Fake) => createHealthKitProvider({ loadLib: () => f.lib, now: () => NOW });

describe('mapeamento de cada tipo', () => {
  it('passos, energia ativa, FC, FC em repouso, HRV, água, peso, gordura, VO2 máx. e treinos viram as métricas do modelo', async () => {
    const f = fakeLib({
      HKQuantityTypeIdentifierStepCount: [day(10, { sumQuantity: { quantity: 8420.4, unit: 'count' } })],
      HKQuantityTypeIdentifierActiveEnergyBurned: [day(10, { sumQuantity: { quantity: 512.6, unit: 'kcal' } })],
      HKQuantityTypeIdentifierHeartRate: [day(10, { averageQuantity: { quantity: 71.4, unit: 'count/min' } })],
      HKQuantityTypeIdentifierRestingHeartRate: [day(10, { averageQuantity: { quantity: 57.2, unit: 'count/min' } })],
      HKQuantityTypeIdentifierHeartRateVariabilitySDNN: [day(10, { averageQuantity: { quantity: 48.9, unit: 'ms' } })],
      HKQuantityTypeIdentifierDietaryWater: [day(10, { sumQuantity: { quantity: 1500, unit: 'mL' } })],
      HKQuantityTypeIdentifierBodyMass: [{ startDate: L(10, 7), endDate: L(10, 7), quantity: 78.46, unit: 'kg', sourceRevision: { source: PHONE } }],
      HKQuantityTypeIdentifierBodyFatPercentage: [{ startDate: L(10, 7), endDate: L(10, 7), quantity: 0.185, unit: '%', sourceRevision: { source: PHONE } }],
      HKQuantityTypeIdentifierVO2Max: [{ startDate: L(9, 18), endDate: L(9, 18), quantity: 42.54, unit: 'ml/(kg*min)', sourceRevision: { source: PHONE } }],
      HKWorkoutTypeIdentifier: [{ startDate: L(10, 18), endDate: L(10, 19), duration: { quantity: 2700, unit: 's' }, sourceRevision: { source: PHONE } }, { startDate: L(10, 20), endDate: L(10, 20), duration: { quantity: 15, unit: 'min' }, sourceRevision: { source: PHONE } }],
    });
    const r = await make(f).readDetailed({});
    const by = (m: string) => r.samples.filter((s: { metric: string }) => s.metric === m);
    expect(by('steps')).toMatchObject([{ value: 8420, date: '2026-06-10', source: 'apple_saude' }]);
    expect(by('active_energy')[0].value).toBe(513);
    expect(by('heart_rate')[0].value).toBe(71);
    expect(by('resting_hr')[0].value).toBe(57);
    expect(by('hrv')[0].value).toBe(49);
    expect(by('water')[0].value).toBe(6); // 1500 mL / 250
    expect(by('weight')[0].value).toBe(78.5);
    expect(by('body_fat')[0].value).toBe(18.5); // fração -> %
    expect(by('vo2max')[0]).toMatchObject({ value: 42.5, date: '2026-06-09' });
    expect(by('exercise_minutes')[0]).toMatchObject({ value: 60, date: '2026-06-10' }); // 45 min + 15 min do mesmo dia
    expect(Object.values(r.report).every((x: any) => x.ok)).toBe(true);
  });
  it('dia sem dado nunca vira zero; valores fora da faixa são descartados um a um', () => {
    const s = K.mapDailyStats('steps', [day(10, { sumQuantity: { quantity: 0 } }), day(11, {}), day(12, { sumQuantity: { quantity: 500000 } }), day(13, { sumQuantity: { quantity: 900 } })], { pick: 'sum' });
    expect(s.map((x: { date: string }) => x.date)).toEqual(['2026-06-13']);
  });
});

describe('sono', () => {
  const part = (start: Date, end: Date, value: number, src: any = PHONE) => ({ startDate: start, endDate: end, value, sourceRevision: { source: src } });
  it('agrega as fases em minutos por noite, atravessa a meia-noite e ignora "na cama" quando há fases detalhadas', () => {
    const out = K.mapSleep([
      part(L(9, 22, 50), L(10, 7, 10), 0), // na cama (ignorado)
      part(L(9, 23, 30), L(10, 1, 30), 3, WATCH), // núcleo 2 h
      part(L(10, 1, 30), L(10, 3, 0), 4, WATCH), // profundo 1 h 30
      part(L(10, 3, 0), L(10, 3, 20), 2, WATCH), // acordado (não conta)
      part(L(10, 3, 20), L(10, 7, 0), 5, WATCH), // REM 3 h 40
    ]);
    const by = (m: string) => out.filter((s: { metric: string }) => s.metric === m);
    expect(by('sleep_duration')).toMatchObject([{ date: '2026-06-10', value: 2 * 60 + 90 + 220, source: 'apple_watch' }]); // 430 min = 7h10
    expect(by('bedtime')[0].value).toBe(23 * 60 + 30);
    expect(by('wake_time')[0].value).toBe(7 * 60);
  });
  it('intervalos sobrepostos (iPhone + Watch) não contam em dobro', () => {
    const out = K.mapSleep([part(L(9, 23, 0), L(10, 6, 0), 1, PHONE), part(L(9, 23, 30), L(10, 6, 30), 3, WATCH)]);
    expect(out.find((s: { metric: string }) => s.metric === 'sleep_duration').value).toBe(450); // 23:00 a 06:30
  });
  it('só "na cama" (dados antigos): usa como melhor que nada; sem nada: não inventa noite', () => {
    expect(K.mapSleep([part(L(9, 23, 0), L(10, 7, 0), 0)]).find((s: { metric: string }) => s.metric === 'sleep_duration').value).toBe(480);
    expect(K.mapSleep([])).toEqual([]);
    expect(K.mapSleep([part(L(10, 1, 0), L(10, 2, 0), 2)])).toEqual([]); // só acordado
  });
  it('acordar no meio da noite (pausa de 1 h) continua a mesma noite; soneca à tarde é outra sessão no mesmo dia', () => {
    const out = K.mapSleep([part(L(9, 23, 0), L(10, 2, 0), 3), part(L(10, 3, 0), L(10, 7, 0), 3), part(L(10, 15, 0), L(10, 15, 30), 1)]);
    expect(out.find((s: { metric: string }) => s.metric === 'sleep_duration').value).toBe(180 + 240 + 30);
    expect(out.find((s: { metric: string }) => s.metric === 'bedtime').value).toBe(23 * 60); // a noite principal é a mais longa
  });
  it('a noite é o dia local em que acaba: 23:59 e 00:01 caem em dias diferentes, sem pular dia', () => {
    const out = K.mapSleep([part(L(10, 0, 1), L(10, 6, 0), 3), part(L(11, 23, 59), L(12, 7, 0), 3)]);
    expect(out.filter((s: { metric: string }) => s.metric === 'sleep_duration').map((s: { date: string }) => s.date)).toEqual(['2026-06-10', '2026-06-12']);
  });
  it('o provedor lê o sono da janela e descarta a noite anterior ao início dela', async () => {
    const f = fakeLib({ HKCategoryTypeIdentifierSleepAnalysis: [part(L(15 - 31, 23, 0), L(15 - 30, 6, 0), 3), part(L(14, 23, 0), L(15, 6, 0), 3)] });
    const r = await make(f).readDetailed({ categories: ['sleep'] });
    const nights = r.samples.filter((s: { metric: string }) => s.metric === 'sleep_duration').map((s: { date: string }) => s.date);
    expect(nights).toEqual(['2026-06-15']);
  });
});

describe('origem Apple Watch sem guardar nomes', () => {
  it('relógio -> "apple_watch"; telefone -> "apple_saude"; nenhum nome aparece nas amostras', async () => {
    const f = fakeLib({
      HKQuantityTypeIdentifierStepCount: [day(10, { sumQuantity: { quantity: 3000 }, sources: [PHONE, WATCH] }), day(11, { sumQuantity: { quantity: 4000 }, sources: [PHONE] })],
      HKQuantityTypeIdentifierBodyMass: [{ startDate: L(10, 7), endDate: L(10, 7), quantity: 70, sourceRevision: { source: PHONE, productType: 'iPhone15,2' } }],
    });
    const r = await make(f).readDetailed({ categories: ['activity', 'body'] });
    const steps = r.samples.filter((s: { metric: string }) => s.metric === 'steps');
    expect(steps.map((s: { source: string }) => s.source)).toEqual(['apple_watch', 'apple_saude']);
    expect(JSON.stringify(r)).not.toMatch(/Victor|Barros|iPhone|Watch de/);
    expect(K.originFor([{ productType: 'Watch6,2' }])).toBe('apple_watch');
    expect(K.originFor([{ deviceName: 'Apple Watch' }])).toBe('apple_watch');
    expect(K.originFor([])).toBe('apple_saude');
  });
});

describe('segurança do fluxo', () => {
  let spies: ReturnType<typeof vi.spyOn>[];
  beforeEach(() => { spies = (['log', 'warn', 'error', 'info', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined)); });
  afterEach(() => spies.forEach((s) => s.mockRestore()));

  it('SÓ LEITURA: pede autorização com toRead e nunca toShare; nenhuma função de escrita é chamada', async () => {
    const f = fakeLib({ HKQuantityTypeIdentifierStepCount: [day(10, { sumQuantity: { quantity: 1000 } })] });
    const p = make(f);
    await p.requestPermissions(['activity', 'sleep', 'heart', 'body', 'hydration']);
    await p.readDetailed({});
    expect(f.calls.auth.length).toBeGreaterThan(0);
    for (const a of f.calls.auth) { expect(Object.keys(a)).toEqual(['toRead']); expect(a.toShare).toBeUndefined(); }
    expect(f.calls.writes).toEqual([]);
  });
  it('autoriza ANTES de consultar e só consulta tipos que foram pedidos (consultar outro derruba o app)', async () => {
    const f = fakeLib({});
    const r = await make(f).readDetailed({ categories: ['activity', 'sleep', 'heart', 'body', 'hydration'] }); // se consultasse sem pedir, o falso lançaria CRASH
    expect(Object.values(r.report).every((x: any) => x.ok)).toBe(true);
    const requested = new Set(f.calls.auth.flatMap((a: { toRead: string[] }) => a.toRead));
    for (const id of f.calls.queried) expect(requested.has(id), id).toBe(true);
    expect(requested.has('HKQuantityTypeIdentifierBodyMass')).toBe(true);
    expect(requested.has('HKWorkoutTypeIdentifier')).toBe(true);
    expect(requested.has('HKCategoryTypeIdentifierSleepAnalysis')).toBe(true);
  });
  it('retorno VAZIO não é negação nem erro: ok com 0 amostras, readSamples devolve null e nada é logado', async () => {
    const f = fakeLib({});
    const p = make(f);
    const r = await p.readDetailed({});
    for (const c of Object.values(r.report) as { ok: boolean; count: number }[]) expect(c).toMatchObject({ ok: true, count: 0 });
    expect(await p.readSamples({})).toBeNull();
    const perms = await p.getPermissions();
    expect(Object.values(perms)).not.toContain('denied'); // o iOS não informa negação
    for (const s of spies) expect(s).not.toHaveBeenCalled();
  });
  it('falha em UMA categoria não derruba as outras (e a mensagem do erro não vaza)', async () => {
    const f = fakeLib({
      HKQuantityTypeIdentifierRestingHeartRate: [day(10, { averageQuantity: { quantity: 58 } })],
      HKQuantityTypeIdentifierDietaryWater: [day(10, { sumQuantity: { quantity: 500 } })],
    }, { fail: ['HKWorkoutTypeIdentifier'] });
    const r = await make(f).readDetailed({});
    expect(r.report.activity).toMatchObject({ ok: false, count: 0 });
    expect(r.report.heart).toMatchObject({ ok: true });
    expect(r.report.hydration).toMatchObject({ ok: true, count: 1 });
    expect(r.samples.some((s: { metric: string }) => s.metric === 'resting_hr')).toBe(true);
    expect(JSON.stringify(r)).not.toContain('12345');
    for (const s of spies) expect(s).not.toHaveBeenCalled();
  });
  it('biblioteca ausente ou HealthKit indisponível: provedor indisponível, sem lançar, sem pedir nada', async () => {
    const none = createHealthKitProvider({ loadLib: () => null });
    expect(await none.isAvailable()).toBe(false);
    expect(await none.readSamples({})).toBeNull();
    expect(await none.requestPermissions(['activity'])).toEqual({ granted: [], denied: ['activity'], unavailable: true });
    const f = fakeLib({}, { unavailable: true });
    const p = make(f);
    expect(await p.isAvailable()).toBe(false);
    const r = await p.readDetailed({});
    expect(Object.values(r.report).every((x: any) => x.unavailable)).toBe(true);
    expect(f.calls.auth).toEqual([]);
    const boom = createHealthKitProvider({ loadLib: () => { throw new Error('x'); } });
    expect(await boom.isAvailable()).toBe(false);
  });
  it('requestAuthorization falhando vira "indisponível", sem lançar', async () => {
    const f = fakeLib({});
    f.lib.requestAuthorization = async () => { throw new Error('negado pelo sistema'); };
    const r = await make(f).requestPermissions(['sleep']);
    expect(r).toMatchObject({ granted: [], unavailable: true });
  });
  it('nenhum arquivo do HealthKit usa console, rede, Share ou armazenamento remoto', () => {
    for (const f of ['src/utils/healthKitMapping.js', 'src/utils/healthKitProvider.js', 'src/utils/healthKitLib.js']) {
      const c = readFileSync(path.join(REPO, f), 'utf8').replace(/^\s*\/\/.*$/gm, '');
      expect(c, f).not.toMatch(/\bconsole\.|\bfetch\s*\(|XMLHttpRequest|WebSocket|Share\.share|Linking\.openURL/);
      expect(c, f).not.toMatch(/\bsave(Quantity|Category|Workout|Correlation)Sample|deleteObjects|toShare\s*:/);
    }
    // o app inteiro: nenhuma chamada de escrita ao HealthKit
    const walk = (d: string): string[] => readdirSync(path.join(REPO, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : e.name.endsWith('.js') ? [`${d}/${e.name}`] : []));
    for (const f of walk('src')) expect(readFileSync(path.join(REPO, f), 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, ''), f).not.toMatch(/saveQuantitySample|saveCategorySample|saveWorkoutSample|toShare/);
  });
});

describe('seleção do provedor', () => {
  const lib = () => ({});
  it('iOS com a flag e a biblioteca: o provedor real; sem a biblioteca: o stub indisponível; menor de 18: SEMPRE o manual', async () => {
    expect(P.selectHealthProvider({ flag: 'true', platform: 'ios', loadLib: lib }).source).toBe('healthkit');
    const stub = P.selectHealthProvider({ flag: 'true', platform: 'ios' });
    expect(stub.source).toBe('healthkit');
    expect(await stub.isAvailable()).toBe(false);
    for (const flag of ['true', '1', 'false']) expect(P.selectHealthProvider({ flag, platform: 'ios', minor: true, loadLib: lib }).source).toBe('manual');
    expect(P.selectProvider({ flag: 'true', platform: 'ios', minor: true, loadLib: lib }).source).toBe('manual');
    expect(P.selectHealthProvider({ flag: 'false', platform: 'ios', loadLib: lib }).source).toBe('manual');
    expect(P.selectHealthProvider({ flag: 'true', platform: 'android', loadLib: lib }).source).toBe('healthconnect');
  });
});
