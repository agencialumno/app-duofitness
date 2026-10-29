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

// @ts-expect-error módulo JS de teste, sem tipos
import * as SH from './helpers/sampleHealth.js';
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

  it('sem nada gravado: vazio (e nada é gravado)', async () => {
    const st = fakeStorage();
    expect((await St.loadHealthV2(st, { now: NOW })).health.samples).toEqual([]);
    expect(st.calls).toEqual([]);
    const again = await St.loadHealthV2(st, { now: NOW });
    expect(again.health.samples).toEqual([]); // o @duo_health antigo (ainda lá) não foi migrado de novo
    expect(again.migrated).toBe(false);
  });
});

describe('conjunto de exemplo dos testes (helper): todas as categorias, rotulado', () => {
  const demo = SH.buildDemoHealthV2(NOW);
  it('toda amostra tem origem "exemplo" e todas as categorias têm dados', () => {
    expect(demo.samples.every((s: { source: string }) => s.source === 'exemplo')).toBe(true);
    for (const c of M.CATEGORIES) expect(M.hasCategoryData(demo.samples, c.id), c.id).toBe(true);
    for (const metric of Object.keys(M.METRICS)) expect(demo.samples.some((s: { metric: string }) => s.metric === metric), metric).toBe(true);
    expect(M.originOf(demo.samples, 'sleep', { days: 7, now: NOW })).toBe('Dados de exemplo');
  });
  it('é determinístico, relativo a "agora", sem datas futuras e idempotente na normalização', () => {
    expect(SH.buildDemoHealthV2(NOW)).toEqual(demo);
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
  it('selectProvider: manual sem a flag; HealthKit/Health Connect com a flag; e MENOR DE 18 sempre manual, com ou sem a flag', () => {
    expect(P.selectProvider({ flag: 'false', platform: 'ios' }).source).toBe('manual');
    expect(P.selectProvider({ flag: 'true', platform: 'ios' }).source).toBe('healthkit');
    expect(P.selectProvider({ flag: 'true', platform: 'android' }).source).toBe('healthconnect');
    for (const platform of ['ios', 'android']) {
      for (const flag of ['true', '1', 'false', '']) {
        expect(P.selectProvider({ flag, platform, minor: true }).source, `${platform}/${flag}`).toBe('manual');
        expect(P.selectHealthProvider({ flag, platform, minor: true }).source).toBe('manual');
      }
    }
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

describe('importação do HealthKit (mergeImported, origem Apple)', () => {
  const T = 'America/Sao_Paulo';
  const smp = (metric: string, value: number, date: string, source = 'apple_saude') => ({ metric, value, date, tz: T, source });
  const base = (samples: unknown[]) => St.normalizeHealthV2({ version: 2, samples, waterGoal: 8, migratedFromV1: false });

  it('reler a janela não duplica: as amostras do HealthKit a partir de "from" são substituídas e as mais antigas ficam', () => {
    const h = base([smp('steps', 1000, '2026-06-01'), smp('steps', 2000, '2026-06-10')]);
    const out = St.mergeImported(h, [smp('steps', 2500, '2026-06-10')], { from: '2026-06-05' });
    expect(out.samples.map((s: { date: string; value: number }) => [s.date, s.value])).toEqual([['2026-06-01', 1000], ['2026-06-10', 2500]]);
    const again = St.mergeImported(out, [smp('steps', 2500, '2026-06-10')], { from: '2026-06-05' });
    expect(again.samples).toHaveLength(2);
  });
  it('peso do HealthKit no mesmo dia e valor PRÓXIMO do registro manual: descartado (mesmo registro, sem duplicar)', () => {
    const h = base([smp('weight', 78.5, '2026-06-10', 'manual')]);
    const out = St.mergeImported(h, [smp('weight', 78.6, '2026-06-10')], { from: '2026-06-01' });
    expect(out.samples).toHaveLength(1);
    expect(out.samples[0].source).toBe('manual');
  });
  it('valor DIFERENTE no mesmo dia entra; no dia seguinte entra; o do aparelho vence na agregação do dia', () => {
    const h = base([smp('weight', 78.5, '2026-06-10', 'manual')]);
    const out = St.mergeImported(h, [smp('weight', 80.4, '2026-06-10'), smp('weight', 78.5, '2026-06-11')], { from: '2026-06-01' });
    expect(out.samples).toHaveLength(3);
    const day = M.dailyValues(out.samples, 'weight').find((d: { date: string }) => d.date === '2026-06-10');
    expect(day.source).toBe('apple_saude'); // aparelho > manual, nunca soma nem mistura
  });
  it('somas (passos, minutos, água): o aparelho tem prioridade sobre o manual do mesmo dia (não soma duas vezes)', () => {
    const h = base([smp('steps', 3000, '2026-06-10', 'manual')]);
    const out = St.mergeImported(h, [smp('steps', 8000, '2026-06-10')], { from: '2026-06-01' });
    const day = M.dailyValues(out.samples, 'steps')[0];
    expect(day.value).toBe(8000);
  });
  it('desconectar (removeBySource apple_saude) apaga Apple Saúde E Apple Watch e deixa o manual e o exemplo', () => {
    const h = base([smp('weight', 78, '2026-06-10', 'manual'), smp('steps', 5000, '2026-06-10', 'apple_saude'), smp('heart_rate', 70, '2026-06-10', 'apple_watch'), smp('water', 4, '2026-06-10', 'exemplo')]);
    const out = St.removeBySource(h, 'apple_saude');
    expect(out.samples.map((s: { source: string }) => s.source).sort()).toEqual(['exemplo', 'manual']);
    const r = St.disconnectAndErase(h, { version: 1, provider: 'apple_saude', consentAt: '2026-06-10T10:00:00.000Z', categories: { activity: true }, importedAt: null });
    expect(r.removed).toBe(2);
    expect(r.connection.provider).toBeNull();
  });
  it('entrada inválida é ignorada sem lançar', () => {
    const h = base([]);
    expect(St.mergeImported(h, null as unknown as unknown[], {}).samples).toEqual([]);
    expect(St.mergeImported(h, [{ metric: 'nao-existe', value: 1, date: '2026-06-10', source: 'apple_saude' }, { metric: 'steps', value: -5, date: '2026-06-10', source: 'apple_saude' }], {}).samples).toEqual([]);
  });
});
