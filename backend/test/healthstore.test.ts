// healthStore.js e healthProviders.js (estendido): migração segura para @duo_health_v2, consentimento, limpeza e provedores.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as St from '../../src/utils/healthStore.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as M from '../../src/utils/healthModel.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as H from '../../src/utils/health.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as P from '../../src/utils/healthProviders.js';
// @ts-expect-error módulo JS do app, sem tipos
import { clearAllDuoData } from '../../src/utils/demoSession.js';

const REPO = path.resolve(__dirname, '../..');
const NOW = new Date(2026, 5, 10, 12);
const key = (off: number) => H.addDays('2026-06-10', off);

// AsyncStorage falso em memória
function fakeStorage(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  const calls: string[] = [];
  return {
    calls, m,
    getItem: async (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: async (k: string, v: string) => { calls.push(`set ${k}`); m.set(k, v); },
    removeItem: async (k: string) => { calls.push(`remove ${k}`); m.delete(k); },
    getAllKeys: async () => [...m.keys()],
    multiRemove: async (ks: string[]) => { ks.forEach((k) => m.delete(k)); },
  };
}

const V1 = { version: 1, weights: [{ date: key(-10), kg: 80 }, { date: key(-3), kg: 79.4 }], water: { [key(-1)]: 6, [key(0)]: 8 }, waterGoal: 9 };

describe('chaves', () => {
  it('as chaves novas têm nomes novos e @duo_health não mudou', () => {
    expect(St.HEALTH_V2_KEY).toBe('@duo_health_v2');
    expect(St.HEALTH_CONNECT_KEY).toBe('@duo_health_connect');
    expect(H.HEALTH_KEY).toBe('@duo_health');
    expect(St.HEALTH_V2_KEY.startsWith('@duo_')).toBe(true); // coberta pela limpeza por prefixo
  });
});

describe('migração do v1 para o v2', () => {
  it('peso e água viram amostras "manual", com a meta de água; o v1 NÃO é alterado nem apagado', async () => {
    const raw = JSON.stringify(V1);
    const st = fakeStorage({ '@duo_health': raw });
    const r = await St.loadHealthV2(st, { now: NOW });
    expect(r.migrated).toBe(true);
    expect(r.isExample).toBe(false);
    expect(r.health.version).toBe(2);
    expect(r.health.waterGoal).toBe(9);
    expect(r.health.samples.filter((s: { metric: string }) => s.metric === 'weight').map((s: { value: number }) => s.value)).toEqual([80, 79.4]);
    expect(r.health.samples.filter((s: { metric: string }) => s.metric === 'water').map((s: { value: number }) => s.value)).toEqual([6, 8]);
    expect(r.health.samples.every((s: { source: string }) => s.source === 'manual')).toBe(true);
    expect(st.m.get('@duo_health')).toBe(raw); // intacto
    expect(st.calls).toEqual(['set @duo_health_v2']); // só gravou a chave nova
    expect(JSON.parse(st.m.get('@duo_health_v2')!).migratedFromV1).toBe(true);
  });

  it('a migração acontece uma vez: com o v2 gravado, o v1 não é lido de novo', async () => {
    const st = fakeStorage({ '@duo_health': JSON.stringify(V1) });
    await St.loadHealthV2(st, { now: NOW });
    st.m.set('@duo_health', JSON.stringify({ ...V1, weights: [{ date: key(0), kg: 55 }] })); // o v1 muda depois
    const again = await St.loadHealthV2(st, { now: NOW });
    expect(again.migrated).toBe(false);
    expect(again.health.samples.some((s: { value: number }) => s.value === 55)).toBe(false);
  });

  it('v1 corrompido ou com lixo: não derruba e não apaga; vira dado vazio/filtrado', async () => {
    const bad = fakeStorage({ '@duo_health': 'isto não é json{' });
    const r = await St.loadHealthV2(bad, { now: NOW });
    expect(r.health.samples).toEqual([]);
    expect(bad.m.get('@duo_health')).toBe('isto não é json{'); // nada apagado
    const junk = fakeStorage({ '@duo_health': JSON.stringify({ weights: [{ date: 'x', kg: 'y' }, null, { date: key(0), kg: 70 }], water: { [key(0)]: -4, [key(-1)]: 5 } }) });
    const r2 = await St.loadHealthV2(junk, { now: NOW });
    expect(r2.health.samples.map((s: { metric: string; value: number }) => `${s.metric}:${s.value}`).sort()).toEqual(['water:5', 'weight:70']);
  });

  it('v2 corrompido vira ausente (cai no v1 / vazio) sem apagar a chave', async () => {
    const st = fakeStorage({ '@duo_health_v2': '{quebrado' });
    const r = await St.loadHealthV2(st, { now: NOW });
    expect(r.health.samples).toEqual([]);
    expect(st.m.get('@duo_health_v2')).toBe('{quebrado');
  });

  it('sem nada gravado: vazio fora do demo; exemplo (não gravado) no Modo Demo', async () => {
    const st = fakeStorage();
    expect((await St.loadHealthV2(st, { now: NOW })).health.samples).toEqual([]);
    const demo = await St.loadHealthV2(st, { isDemo: true, now: NOW });
    expect(demo.isExample).toBe(true);
    expect(demo.health.samples.length).toBeGreaterThan(50);
    expect(st.calls).toEqual([]); // o exemplo não é gravado
  });
});

describe('mudanças puras', () => {
  const base = St.normalizeHealthV2(undefined);
  it('addSample valida, substitui a do mesmo dia/origem e ignora a inválida', () => {
    let h = St.addSample(base, { metric: 'weight', value: 80, date: key(0), source: 'manual' });
    h = St.addSample(h, { metric: 'weight', value: 79.5, date: key(0), source: 'manual' });
    expect(h.samples).toHaveLength(1);
    expect(h.samples[0].value).toBe(79.5);
    expect(St.addSample(h, { metric: 'weight', value: 5, date: key(0), source: 'manual' }).samples).toHaveLength(1);
  });
  it('removeSample, removeBySource e meta de água', () => {
    let h = St.addSamples(base, [
      { metric: 'steps', value: 100, date: key(0), source: 'apple_saude', at: '2026-06-10T10:00:00Z' },
      { metric: 'steps', value: 90, date: key(-1), source: 'manual' },
    ]);
    expect(St.removeBySource(h, 'apple_saude').samples).toHaveLength(1);
    expect(St.removeSample(h, { metric: 'steps', date: key(-1) }).samples).toHaveLength(1);
    expect(St.setWaterGoalV2(h, 99).waterGoal).toBe(20);
    expect(St.setWaterGoalV2(h, 0).waterGoal).toBe(1);
  });
});

describe('conexão: consentimento explícito e desconectar apagando o importado', () => {
  it('sem consentimento nada vale; com categorias marcadas registra provedor, data e categorias', () => {
    expect(St.normalizeConnection({ provider: 'apple_saude', categories: { sleep: true } })).toEqual(St.emptyConnection()); // sem consentAt
    expect(St.grantConsent(St.emptyConnection(), { provider: 'apple_saude', categories: [] })).toEqual(St.emptyConnection()); // nenhuma categoria
    expect(St.grantConsent(St.emptyConnection(), { provider: 'fitbit', categories: ['sleep'] })).toEqual(St.emptyConnection());
    const c = St.grantConsent(St.emptyConnection(), { provider: 'health_connect', categories: ['sleep', 'steps_inexistente', 'activity'], now: NOW });
    expect(c.provider).toBe('health_connect');
    expect(c.categories).toEqual({ sleep: true, activity: true });
    expect(c.consentAt).toBe(NOW.toISOString());
    expect(St.normalizeConnection(c)).toEqual(c);
  });
  it('desconectar apaga só o que veio do aparelho; manual e exemplo ficam', () => {
    const h = St.addSamples(St.normalizeHealthV2(undefined), [
      { metric: 'steps', value: 5000, date: key(0), source: 'apple_saude', at: '2026-06-10T10:00:00Z' },
      { metric: 'sleep_duration', value: 400, date: key(0), source: 'apple_saude' },
      { metric: 'weight', value: 80, date: key(0), source: 'manual' },
      { metric: 'water', value: 3, date: key(0), source: 'exemplo' },
    ]);
    const conn = St.grantConsent(St.emptyConnection(), { provider: 'apple_saude', categories: ['activity', 'sleep'], now: NOW });
    const r = St.disconnectAndErase(h, conn);
    expect(r.removed).toBe(2);
    expect(r.health.samples.map((s: { source: string }) => s.source).sort()).toEqual(['exemplo', 'manual']);
    expect(r.connection).toEqual(St.emptyConnection());
    expect(St.disconnectAndErase(h, St.emptyConnection()).removed).toBe(0); // sem conexão, nada some
  });
  it('estado da conexão persiste e volta normalizado', async () => {
    const st = fakeStorage();
    const c = St.grantConsent(St.emptyConnection(), { provider: 'apple_saude', categories: ['sleep'], now: NOW });
    await St.saveConnection(st, c);
    expect(await St.loadConnection(st)).toEqual(c);
    expect(await St.loadConnection(fakeStorage({ '@duo_health_connect': 'lixo' }))).toEqual(St.emptyConnection());
  });
});

describe('limpeza: Resetar tudo, Sair do demo e Excluir conta', () => {
  const seed = () => fakeStorage({ '@duo_user': '{}', '@duo_health': JSON.stringify(V1), '@duo_health_v2': JSON.stringify({ version: 2, samples: [{ metric: 'weight', value: 80, date: key(0), source: 'manual', tz: 'UTC', unit: 'kg' }] }), '@duo_health_connect': '{}', outra: 'fica' });
  it('Resetar tudo e Sair do demo (clearAllDuoData, por prefixo) apagam as chaves novas e o v1', async () => {
    const st = seed();
    const removed = await clearAllDuoData(st);
    expect(removed).toEqual(expect.arrayContaining(['@duo_health_v2', '@duo_health_connect', '@duo_health']));
    expect([...st.m.keys()]).toEqual(['outra']);
  });
  it('Excluir conta limpa as chaves NOVAS (v2 vira marcador vazio, conexão some) e o v1 não ressuscita os dados', async () => {
    const st = seed();
    await St.clearHealthData(st, NOW);
    expect(st.m.has('@duo_health_connect')).toBe(false);
    const v2 = JSON.parse(st.m.get('@duo_health_v2')!);
    expect(v2).toMatchObject({ version: 2, samples: [], migratedFromV1: true, clearedAt: NOW.toISOString() });
    expect(st.m.get('@duo_user')).toBe('{}'); // as outras chaves ficam
    const again = await St.loadHealthV2(st, { now: NOW });
    expect(again.health.samples).toEqual([]); // o @duo_health antigo (ainda lá) não foi migrado de novo
    expect(again.migrated).toBe(false);
  });
});

describe('Modo Demo: dados de exemplo em TODAS as categorias, rotulados', () => {
  const demo = St.buildDemoHealthV2(NOW);
  it('toda amostra tem origem "exemplo" e todas as categorias têm dados', () => {
    expect(demo.samples.every((s: { source: string }) => s.source === 'exemplo')).toBe(true);
    for (const c of M.CATEGORIES) expect(M.hasCategoryData(demo.samples, c.id), c.id).toBe(true);
    for (const metric of Object.keys(M.METRICS)) expect(demo.samples.some((s: { metric: string }) => s.metric === metric), metric).toBe(true);
    expect(M.originOf(demo.samples, 'sleep', { days: 7, now: NOW })).toBe('Dados de exemplo');
  });
  it('é determinístico, relativo a "agora", sem datas futuras e idempotente na normalização', () => {
    expect(St.buildDemoHealthV2(NOW)).toEqual(demo);
    expect(Math.max(...demo.samples.map((s: { date: string }) => s.date.localeCompare(H.dayKey(NOW)))) <= 0).toBe(true);
    expect(St.normalizeHealthV2(demo)).toEqual(demo);
  });
  it('sono de exemplo: 14 noites com duração, hora de dormir e de acordar', () => {
    expect(M.dailyValues(demo.samples, 'sleep_duration')).toHaveLength(14);
    expect(M.dailyValues(demo.samples, 'bedtime')).toHaveLength(14);
    expect(M.dailyValues(demo.samples, 'wake_time')).toHaveLength(14);
  });
});

describe('provedores (interface estendida)', () => {
  const ALL = M.CATEGORIES.map((c: { id: string }) => c.id);
  it('manual: disponível, permissões "granted", sem leitura de aparelho e nunca lança', async () => {
    const p = P.createManualProvider();
    expect(p.source).toBe('manual');
    expect(p.sampleSource).toBe('manual');
    expect(await p.isAvailable()).toBe(true);
    expect(Object.values(await p.getPermissions()).every((v) => v === 'granted')).toBe(true);
    expect(await p.readSamples({ categories: ALL, from: '2026-01-01', to: '2026-12-31' })).toBeNull();
  });
  it('stubs: indisponíveis, permissão "unavailable" e requestPermissions NÃO pede nada (devolve negado/indisponível)', async () => {
    for (const [make, source, origin] of [[P.createHealthKitProvider, 'healthkit', 'apple_saude'], [P.createHealthConnectProvider, 'healthconnect', 'health_connect']] as const) {
      const p = make();
      expect(p.source).toBe(source);
      expect(p.sampleSource).toBe(origin);
      expect(await p.isAvailable()).toBe(false);
      expect(Object.values(await p.getPermissions()).every((v) => v === 'unavailable')).toBe(true);
      expect(await p.requestPermissions(['sleep'])).toEqual({ granted: [], denied: ['sleep'], unavailable: true });
      expect(await p.readSamples({ categories: ALL })).toBeNull();
    }
  });
  it('MockProvider: "dados de exemplo", leitura por intervalo e por categoria, e a forma antiga (passos, sono, FC)', async () => {
    const p = P.createMockProvider({ now: NOW });
    expect(p.label).toBe('Dados de exemplo');
    expect(p.isExample).toBe(true);
    expect(p.sampleSource).toBe('exemplo');
    const sleep = await p.readSamples({ categories: ['sleep'], from: key(-6), to: key(0) });
    expect(sleep.every((s: { source: string; metric: string }) => s.source === 'exemplo' && ['sleep_duration', 'bedtime', 'wake_time'].includes(s.metric))).toBe(true);
    expect(sleep.every((s: { date: string }) => s.date >= key(-6) && s.date <= key(0))).toBe(true);
    expect(await p.readSamples({ categories: ['sleep'], from: '2020-01-01', to: '2020-01-31' })).toBeNull(); // sem dado = null
    const steps = await p.getSteps({ from: key(-2), to: key(0) });
    expect(steps.byDay).toHaveLength(3);
    expect(steps.total).toBe(steps.byDay.reduce((a: number, d: { steps: number }) => a + d.steps, 0));
    expect((await p.getSleep({})).byNight.length).toBe(14);
    expect((await p.getHeartRate({})).samples.length).toBe(14);
  });
  it('selectProvider: o Modo Demo usa o Mock; fora dele, o mesmo de selectHealthProvider; a antiga não muda', () => {
    expect(P.selectProvider({ isDemo: true, flag: 'true', platform: 'ios', now: NOW }).source).toBe('mock');
    expect(P.selectProvider({ flag: 'false', platform: 'ios' }).source).toBe('manual');
    expect(P.selectProvider({ flag: 'true', platform: 'ios' }).source).toBe('healthkit');
    expect(P.selectProvider({ flag: 'true', platform: 'android' }).source).toBe('healthconnect');
    expect(P.selectHealthProvider({ flag: 'true', platform: 'ios', isDemo: true }).source).toBe('manual'); // compatibilidade
  });
  it('nenhum módulo nativo novo e a flag continua desligada por padrão', () => {
    const pkg = JSON.parse(readFileSync(path.join(REPO, 'package.json'), 'utf8'));
    expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).join(' ')).not.toMatch(/health/i);
    expect(readFileSync(path.join(REPO, 'src/data/healthConfig.js'), 'utf8')).toMatch(/\|\| 'false'/);
    for (const f of ['src/utils/healthStore.js', 'src/utils/healthProviders.js', 'src/utils/healthModel.js']) {
      expect(readFileSync(path.join(REPO, f), 'utf8'), f).not.toMatch(/from\s+['"](react|expo|react-native|@kingstinct|react-native-health)/);
    }
  });
});
