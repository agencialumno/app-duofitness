// INTEGRAÇÃO, área 2: Saúde. Do botão Conectar até o dado na tela: seleção do provedor por plataforma e idade, conexão com permissão concedida,
// negada e vazia (HealthKit e Health Connect, bibliotecas FALSAS), sincronização, "sem dados" (nunca erro) e regras de menor de 18.
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as HP from '../../src/utils/healthProviders.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as SY from '../../src/utils/healthSync.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as ST from '../../src/utils/healthStore.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as V from '../../src/utils/healthView.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as H from '../../src/utils/health.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as SC from '../../src/utils/healthScores.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as PA from '../../src/utils/planForAge.js';
import { memory } from './helpers/memstore';

const NOW = new Date(2026, 9, 29, 12, 0, 0, 0);
const at = (d: number, h = 9) => new Date(2026, 9, d, h, 0, 0, 0);

// ---- HealthKit falso ----
function hkLib(opts: { steps?: number; deny?: boolean; empty?: boolean; unavailable?: boolean } = {}) {
  const calls = { auth: [] as any[], writes: 0 };
  const stats = (qty: number) => (opts.empty || opts.deny ? [] : [{ startDate: at(28, 0), endDate: at(29, 0), sumQuantity: { quantity: qty, unit: 'count' }, sources: [{ name: 'iPhone' }] }]);
  const lib: Record<string, any> = {
    isHealthDataAvailable: async () => !opts.unavailable,
    requestAuthorization: async (a: unknown) => { calls.auth.push(a); return true; }, // o iOS devolve true mesmo com a leitura negada
    getRequestStatusForAuthorization: async () => 'unnecessary',
    queryStatisticsCollectionForQuantity: async () => stats(opts.steps ?? 8000),
    queryQuantitySamples: async () => [],
    queryCategorySamples: async () => [],
    queryWorkoutSamples: async () => [],
    saveQuantitySample: async () => { calls.writes++; },
  };
  return { lib, calls };
}
// ---- Health Connect falso ----
const PERMS = (types: string[]) => types.map((recordType) => ({ accessType: 'read', recordType }));
function hcLib(opts: { status?: number; granted?: string[]; empty?: boolean; requestReturns?: string[] } = {}) {
  const calls: string[] = [];
  const granted = opts.granted ?? ['Steps', 'ActiveCaloriesBurned', 'ExerciseSession', 'HeartRate', 'RestingHeartRate', 'HeartRateVariabilityRmssd', 'Vo2Max', 'SleepSession', 'Weight', 'BodyFat', 'Hydration'];
  const lib = {
    getSdkStatus: async () => opts.status ?? 3,
    initialize: async () => true,
    getGrantedPermissions: async () => PERMS(granted),
    requestPermission: async () => { calls.push('requestPermission'); return PERMS(opts.requestReturns ?? granted); },
    readRecords: async (t: string) => {
      calls.push(`read:${t}`);
      if (opts.empty || t !== 'Steps') return { records: [] };
      return { records: [{ startTime: at(28).toISOString(), endTime: at(28, 10).toISOString(), count: 7000, metadata: { dataOrigin: 'app.x' } }] };
    },
    revokeAllPermissions: async () => { calls.push('revoke'); },
    openHealthConnectSettings: () => {},
  };
  return { lib, calls };
}
const conn = (provider: string, cats: string[]) => ST.grantConsent(ST.emptyConnection(), { provider, categories: cats, now: NOW });

describe('botão Conectar: estados em todo o ciclo', () => {
  it('desligado -> disponível -> conectado -> desconectado (volta a disponível), em cada plataforma', () => {
    for (const [platform, own] of [['ios', 'apple_saude'], ['android', 'health_connect']] as const) {
      expect(V.connectButtonState({ integrationEnabled: false, platform }).state).toBe('soon');
      expect(V.connectButtonState({ integrationEnabled: true, platform, connection: ST.emptyConnection() }).state).toBe('available');
      expect(V.connectButtonState({ integrationEnabled: true, platform, connection: conn(own, ['activity']) }).state).toBe('connected');
      const after = ST.disconnectAndErase(ST.emptyHealthV2(), conn(own, ['activity'])).connection;
      expect(V.connectButtonState({ integrationEnabled: true, platform, connection: after }).state).toBe('available');
    }
    expect(V.connectButtonState({ integrationEnabled: true, platform: 'web' }).state).toBe('soon');
  });
});

describe('HealthKit (iOS): concedida, negada, vazia', () => {
  const pick = (f: ReturnType<typeof hkLib>, minor = false) => HP.selectHealthProvider({ flag: 'true', platform: 'ios', minor, loadLib: () => f.lib });
  it('concedida: a leitura vira amostras, com origem Apple Saúde, e a conexão guarda "Atualizado"', async () => {
    const f = hkLib();
    const p = pick(f);
    const req = await p.requestPermissions(['activity']);
    expect(req.granted).toEqual(['activity']);
    const r = await SY.syncHealth({ provider: p, health: ST.emptyHealthV2(), connection: conn('apple_saude', ['activity']), now: NOW });
    expect(r.changed).toBe(true);
    expect(r.health.samples.filter((s: any) => s.metric === 'steps')[0]).toMatchObject({ value: 8000, source: 'apple_saude' });
    expect(r.connection.importedAt).toBe(NOW.toISOString());
    expect(f.calls.auth[0].toShare).toEqual([]); // só leitura
    expect(f.calls.writes).toBe(0);
  });
  it('NEGADA (o iOS devolve vazio, sem avisar): é "Sem dados ainda", nunca erro, e não apaga o que já existia', async () => {
    const before = ST.addSample(ST.emptyHealthV2(), { metric: 'steps', value: 5000, date: '2026-10-20', tz: 'America/Sao_Paulo', source: 'apple_saude' });
    const f = hkLib({ deny: true });
    const r = await SY.syncHealth({ provider: pick(f), health: before, connection: conn('apple_saude', ['activity']), now: NOW });
    expect(r.skipped).toBeUndefined();
    expect(r.report.activity).toEqual({ ok: true, count: 0 });
    expect(SY.summarizeReport(r.report)).toMatchObject({ allEmpty: true, failed: 0 });
    expect(r.health.samples).toHaveLength(1); // nada foi apagado por causa do vazio
  });
  it('VAZIA (sem registros): mesmo tratamento, "sem dados"', async () => {
    const r = await SY.syncHealth({ provider: pick(hkLib({ empty: true })), health: ST.emptyHealthV2(), connection: conn('apple_saude', ['activity', 'sleep']), now: NOW });
    expect(SY.summarizeReport(r.report).allEmpty).toBe(true);
    expect(r.health.samples).toEqual([]);
  });
  it('HealthKit indisponível (iPad, sem módulo): provedor sem dados e sem lançar', async () => {
    const p = pick(hkLib({ unavailable: true }));
    expect(await p.isAvailable()).toBe(false);
    expect((await p.readDetailed({})).samples).toEqual([]);
    const noLib = HP.selectHealthProvider({ flag: 'true', platform: 'ios' });
    expect((await noLib.requestPermissions(['activity'])).unavailable).toBe(true);
  });
});

describe('Health Connect (Android): concedida, negada, parcial, vazia', () => {
  const pick = (f: ReturnType<typeof hcLib>, minor = false) => HP.selectHealthProvider({ flag: 'true', platform: 'android', minor, loadHealthConnectLib: () => f.lib });
  it('concedida: importa com origem Health Connect', async () => {
    const f = hcLib();
    const p = pick(f);
    expect((await p.requestPermissions(['activity', 'sleep'])).granted).toEqual(['activity', 'sleep']);
    const r = await SY.syncHealth({ provider: p, health: ST.emptyHealthV2(), connection: conn('health_connect', ['activity']), now: NOW });
    expect(r.health.samples.filter((s: any) => s.metric === 'steps')[0]).toMatchObject({ value: 7000, source: 'health_connect' });
  });
  it('NEGADA: nenhuma categoria ativa, nada é lido, e a conexão não é registrada como concedida', async () => {
    const f = hcLib({ granted: [], requestReturns: [] });
    const p = pick(f);
    const req = await p.requestPermissions(['activity']);
    expect(req).toMatchObject({ granted: [], denied: ['activity'], unavailable: false });
    expect(ST.grantConsent(ST.emptyConnection(), { provider: 'health_connect', categories: req.granted }).provider).toBeNull(); // sem categoria, não conecta
    expect(f.calls.filter((c) => c.startsWith('read:'))).toEqual([]);
  });
  it('PARCIAL: só as categorias concedidas ficam ativas; as outras são "sem permissão", não erro', async () => {
    const f = hcLib({ granted: ['Steps', 'Weight'] });
    const p = pick(f);
    expect(await p.getPermissions(['activity', 'sleep', 'body'])).toEqual({ activity: 'granted', sleep: 'denied', body: 'granted' });
    const d = await p.readDetailed({ categories: ['activity', 'sleep'] });
    expect(d.report.sleep).toEqual({ ok: false, count: 0, inactive: true });
    expect(d.report.activity.ok).toBe(true);
  });
  it('VAZIA: concedida sem registros = "sem dados"', async () => {
    const r = await SY.syncHealth({ provider: pick(hcLib({ empty: true })), health: ST.emptyHealthV2(), connection: conn('health_connect', ['activity']), now: NOW });
    expect(SY.summarizeReport(r.report)).toMatchObject({ allEmpty: true, failed: 0 });
  });
  it('indisponível e "precisa atualizar": nada é pedido nem lido', async () => {
    for (const [status, av] of [[1, 'unavailable'], [2, 'update_required']] as const) {
      const f = hcLib({ status });
      const p = pick(f);
      expect(await p.availability()).toBe(av);
      expect((await p.requestPermissions(['activity'])).unavailable).toBe(true);
      expect(f.calls).toEqual([]);
    }
  });
  it('desconectar apaga SÓ o que veio do Health Connect e chama a revogação da biblioteca', async () => {
    const f = hcLib();
    let h = ST.emptyHealthV2();
    h = ST.addSample(h, { metric: 'steps', value: 1, date: '2026-10-20', tz: 'X', source: 'health_connect' });
    h = ST.addSample(h, { metric: 'weight', value: 70, date: '2026-10-20', tz: 'X', source: 'manual' });
    const r = ST.disconnectAndErase(h, conn('health_connect', ['activity']));
    expect(r.health.samples.map((s: any) => s.source)).toEqual(['manual']);
    expect(await pick(f).revokeAll()).toEqual({ revoked: true, supported: true });
  });
});

describe('menor de 18: sem peso, sem conexão', () => {
  it('o provedor é o manual nas duas plataformas, com a flag ligada, e nada é pedido à biblioteca', async () => {
    const hk = hkLib(); const hc = hcLib();
    const a = HP.selectHealthProvider({ flag: 'true', platform: 'ios', minor: true, loadLib: () => hk.lib });
    const b = HP.selectHealthProvider({ flag: 'true', platform: 'android', minor: true, loadHealthConnectLib: () => hc.lib });
    for (const p of [a, b]) {
      expect(p.source).toBe('manual');
      expect(await p.readSamples()).toBeNull();
    }
    expect(hk.calls.auth).toEqual([]);
    expect(hc.calls).toEqual([]);
  });
  it('a sincronização recusa o menor mesmo com uma conexão antiga gravada', async () => {
    const p = HP.selectHealthProvider({ flag: 'true', platform: 'android', loadHealthConnectLib: () => hcLib().lib });
    const r = await SY.syncHealth({ provider: p, health: ST.emptyHealthV2(), connection: conn('health_connect', ['activity']), minor: true });
    expect(r).toMatchObject({ changed: false, skipped: 'indisponivel' });
  });
  it('peso: a faixa "under18" é detectada e a meta de peso não existe para menores; o Duo Score deles não usa peso', () => {
    expect(H.isMinor('under18')).toBe(true);
    expect(H.isMinor('26-35')).toBe(false);
    expect(H.getWeightDirection(['lose_weight'], 'under18')).not.toBe(H.getWeightDirection(['lose_weight'], '26-35'));
    const samples = [{ metric: 'weight', value: 70, unit: 'kg', date: '2026-10-28', tz: 'X', source: 'manual' }];
    const ids = (age: string) => SC.computeDuoScoreV2({ sessions: [], samples, waterGoal: 8, ageGroup: age, now: NOW }).components.map((c: any) => c.id);
    const minor = SC.computeDuoScoreV2({ sessions: [], samples, waterGoal: 8, ageGroup: 'under18', now: NOW });
    expect(minor.minor).toBe(true);
    expect(ids('under18').length).toBe(ids('26-35').length - 1); // o adulto tem a nota de composição corporal (peso); o menor não
  });
  it('o plano de treino do menor não usa a categoria de IMC de adulto nem "Emagrecer"', () => {
    const out = PA.adjustForAge({ ageGroup: 'under18', goals: ['lose_weight'], imcCategory: 'obesity1' });
    expect(out.imcCategory).toBeUndefined();
    expect(out.goals).not.toContain('lose_weight');
    expect(PA.adjustForAge({ ageGroup: '26-35', goals: ['lose_weight'], imcCategory: 'obesity1' })).toEqual({ imcCategory: 'obesity1', goals: ['lose_weight'] });
  });
});

describe('persistência da conexão e dos dados (armazenamento local)', () => {
  it('salvar e ler de volta a conexão e as amostras (inclusive o que veio do aparelho de saúde)', async () => {
    const st = memory();
    const c = conn('health_connect', ['activity', 'sleep']);
    await ST.saveConnection(st, c);
    const h = ST.addSample(ST.emptyHealthV2(), { metric: 'steps', value: 9000, date: '2026-10-28', tz: 'America/Sao_Paulo', source: 'health_connect_watch' });
    await ST.saveHealthV2(st, h);
    expect(await ST.loadConnection(st)).toMatchObject({ provider: 'health_connect', categories: { activity: true, sleep: true } });
    expect((await ST.loadHealthV2(st)).health.samples[0]).toMatchObject({ value: 9000, source: 'health_connect_watch' });
  });
  it('conexão corrompida no armazenamento vira "sem conexão", sem quebrar', async () => {
    const st = memory({ '@duo_health_connect': '{quebrado' });
    expect((await ST.loadConnection(st)).provider).toBeNull();
  });
});
