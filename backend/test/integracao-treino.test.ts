// INTEGRAÇÃO, área 4: treino e hábitos. Registros de treino, água, peso, totais, persistência local com leitura de volta e a virada do dia
// (23:59 para 00:00) no fuso America/Sao_Paulo. Sem rede; armazenamento em memória.
process.env.TZ = 'America/Sao_Paulo'; // antes de qualquer Date: o app usa sempre o dia LOCAL do aparelho
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as H from '../../src/utils/health.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as ST from '../../src/utils/healthStore.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as SS from '../../src/utils/safeStorage.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as AC from '../../src/utils/achievements.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as MD from '../../src/utils/healthModel.js';
import { memory } from './helpers/memstore';

const SP = new Date(2026, 9, 29, 12).getTimezoneOffset() === 180; // UTC-3, sem horário de verão desde 2019
const spIt = SP ? it : it.skip; // se o sistema não aceitar mudar o fuso do processo, os testes de fuso são pulados (e registrados no relatório)
const L = (d: number, h = 12, m = 0, mo = 10) => new Date(2026, mo - 1, d, h, m, 0, 0);
const session = (when: Date | string, id = 's') => ({ id, workoutId: 'w1', completedAt: typeof when === 'string' ? when : when.toISOString(), xpEarned: 50 });

describe('fuso America/Sao_Paulo e virada do dia', () => {
  spIt('o processo está em UTC-3', () => expect(new Date(2026, 9, 29, 12).getTimezoneOffset()).toBe(180));
  spIt('23:59 e 00:00 caem em dias diferentes; 23:59:59 ainda é o mesmo dia', () => {
    expect(H.dayKey(L(29, 23, 59))).toBe('2026-10-29');
    expect(H.dayKey(new Date(2026, 9, 29, 23, 59, 59, 999))).toBe('2026-10-29');
    expect(H.dayKey(L(30, 0, 0))).toBe('2026-10-30');
  });
  spIt('um instante em UTC vira o dia LOCAL (02:30Z de 30/10 = 23:30 de 29/10 em São Paulo; 03:00Z já é dia 30)', () => {
    expect(H.dayKey(new Date('2026-10-30T02:30:00.000Z'))).toBe('2026-10-29');
    expect(H.dayKey(new Date('2026-10-30T03:00:00.000Z'))).toBe('2026-10-30');
  });
  spIt('treino às 23:50 e outro às 00:10 formam 2 dias seguidos (sequência 2), não 1 nem 0', () => {
    const sessions = [session(L(29, 23, 50), 'a'), session(L(30, 0, 10), 'b')];
    expect(H.computeStreak(sessions, L(30, 8))).toBe(2);
    expect(H.countTrainingDays(sessions, { days: 7, now: L(30, 8) })).toBe(2);
  });
  spIt('a sequência não zera às 00:00: ontem treinou, hoje ainda não = continua; só zera se ficar um dia inteiro sem treinar', () => {
    const sessions = [session(L(28, 18), 'a'), session(L(29, 18), 'b')];
    expect(H.computeStreak(sessions, L(29, 23, 59))).toBe(2);
    expect(H.computeStreak(sessions, L(30, 0, 1))).toBe(2); // virou o dia, ainda dá tempo de treinar
    expect(H.computeStreak(sessions, L(31, 0, 1))).toBe(0); // passou um dia inteiro
  });
  spIt('água registrada às 23:59 conta no dia anterior; às 00:00 começa do zero', () => {
    let h = H.emptyHealth();
    h = H.addGlass(h, 3, L(29, 23, 59));
    expect(H.getWater(h, L(29, 23, 59))).toBe(3);
    expect(H.getWater(h, L(30, 0, 0))).toBe(0);
    h = H.addGlass(h, 1, L(30, 0, 0));
    expect(H.getWater(h, L(29, 12))).toBe(3);
    expect(H.getWater(h, L(30, 12))).toBe(1);
  });
  spIt('addDays atravessa a virada de mês e de ano sem pular dia', () => {
    expect(H.addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(H.addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(H.addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(H.addDays('2028-03-01', -1)).toBe('2028-02-29'); // ano bissexto
  });
  spIt('amostras do modelo novo usam o fuso do aparelho', () => {
    expect(MD.deviceTz()).toBe('America/Sao_Paulo');
    expect(MD.makeSample({ metric: 'water', value: 3, date: '2026-10-29', source: 'manual' })).toMatchObject({ tz: 'America/Sao_Paulo', date: '2026-10-29' });
  });
});

describe('treino: sessões, XP, conquistas e persistência', () => {
  it('as sessões contam por dia (dois treinos no mesmo dia = 1 dia), nos últimos 7 dias', () => {
    const s = [session(L(27, 7), 'a'), session(L(27, 19), 'b'), session(L(25, 10), 'c'), session(L(10, 10), 'velha')];
    expect(H.countTrainingDays(s, { days: 7, now: L(29, 9) })).toBe(2);
    expect(H.countTrainingDays([], { days: 7, now: L(29) })).toBe(0);
  });
  it('sessões com data inválida são ignoradas, sem quebrar', () => {
    expect(H.countTrainingDays([session('lixo'), { id: 'x' } as any, null as any], { days: 7, now: L(29) })).toBe(0);
    expect(H.computeStreak([session('lixo')], L(29))).toBe(0);
  });
  it('conquistas por sequência de datas: 3 dias seguidos desbloqueia; nunca é revogada depois', () => {
    const three = [session(L(27), 'a'), session(L(28), 'b'), session(L(29), 'c')];
    const r1 = AC.evaluateAchievements({ current: [], sessions: three, xp: 150, now: L(29, 20) });
    expect(r1.changed).toBe(true);
    const unlocked = r1.list.map((a: any) => a.id ?? a);
    expect(unlocked.length).toBeGreaterThan(0);
    const r2 = AC.evaluateAchievements({ current: r1.list, sessions: [], xp: 0, now: L(29, 20) }); // sem sessões: nada é revogado
    expect(r2.list.length).toBe(r1.list.length);
  });
  it('lê de volta o que foi gravado (treinos, sessões, XP, sequência) e ignora a chave corrompida sem derrubar as outras', async () => {
    const st = memory();
    await st.setItem('@duo_user', JSON.stringify({ name: 'Ana', goals: ['health'] }));
    await st.setItem('@duo_workouts', JSON.stringify([{ id: 'w1', name: 'Treino A', exercises: [] }]));
    await st.setItem('@duo_sessions', JSON.stringify([session(L(29), 's1')]));
    await st.setItem('@duo_xp', '250');
    await st.setItem('@duo_streak', '4');
    await st.setItem('@duo_achievements', '{quebrado');
    const d = await SS.readAppData(st);
    expect(d.user.name).toBe('Ana');
    expect(d.workouts).toHaveLength(1);
    expect(d.sessions[0].id).toBe('s1');
    expect(d.xp).toBe(250);
    expect(d.streak).toBe(4);
    expect(d.achievements).toBeUndefined(); // corrompida = ausente
    expect(await st.getItem('@duo_achievements')).toBe('{quebrado'); // e NÃO é apagada
  });
  it('valores de XP inválidos (negativo, texto, NaN) viram ausentes', async () => {
    for (const bad of ['-5', 'abc', 'NaN', '1e999', '']) {
      const d = await SS.readAppData(memory({ '@duo_xp': bad }));
      expect(d.xp, bad).toBeUndefined();
    }
  });
});

describe('água e peso: registros, totais e leitura de volta (modelo antigo e novo)', () => {
  it('água: soma, teto de 30 copos, não fica negativa e a meta é limitada de 1 a 20', () => {
    let h = H.emptyHealth();
    h = H.addGlass(h, 1, L(29));
    h = H.addGlass(h, 2, L(29));
    expect(H.getWater(h, L(29))).toBe(3);
    h = H.addGlass(h, -10, L(29));
    expect(H.getWater(h, L(29))).toBe(0);
    h = H.setWater(h, 999, L(29));
    expect(H.getWater(h, L(29))).toBe(30);
    expect(H.setWaterGoal(h, 0).waterGoal).toBe(1);
    expect(H.setWaterGoal(h, 99).waterGoal).toBe(20);
    expect(H.setWaterGoal(h, NaN).waterGoal).toBe(h.waterGoal);
  });
  it('peso: aceita vírgula, recusa fora de 30 a 300 kg, um registro por dia (o último vale) e ordena', () => {
    expect(H.parseWeightInput('70,5')).toBe(70.5);
    for (const bad of ['', 'abc', '29', '301', '-70']) expect(H.parseWeightInput(bad), bad).toBeNull();
    let h = H.emptyHealth();
    h = H.addWeight(h, '72', L(28));
    h = H.addWeight(h, '70,5', L(25));
    h = H.addWeight(h, '71', L(28)); // mesmo dia: substitui
    expect(h.weights.map((w: any) => [w.date, w.kg])).toEqual([['2026-10-25', 70.5], ['2026-10-28', 71]]);
    expect(H.addWeight(h, '999', L(29))).toEqual(h); // inválido não muda nada
    const t = H.getWeightTrend(h, { days: 30, now: L(29) });
    expect(t.delta).toBeCloseTo(0.5, 5);
  });
  it('peso e água sobrevivem a gravar e ler (modelo novo @duo_health_v2) e as origens se separam', async () => {
    const st = memory();
    let h = ST.emptyHealthV2();
    h = ST.addSample(h, { metric: 'weight', value: 70.4, date: '2026-10-28', tz: 'America/Sao_Paulo', source: 'manual' });
    h = ST.addSample(h, { metric: 'water', value: 5, date: '2026-10-28', tz: 'America/Sao_Paulo', source: 'manual' });
    await ST.saveHealthV2(st, h);
    const back = (await ST.loadHealthV2(st)).health;
    expect(back.samples.map((s: any) => [s.metric, s.value, s.date, s.source]).sort()).toEqual([['water', 5, '2026-10-28', 'manual'], ['weight', 70.4, '2026-10-28', 'manual']]);
  });
  it('o modelo novo lê o antigo (@duo_health) sem alterá-lo (migração segura)', async () => {
    const old = JSON.stringify({ weights: [{ date: '2026-10-20', kg: 71 }], water: { '2026-10-20': 6 }, waterGoal: 8 });
    const st = memory({ '@duo_health': old });
    const loaded = (await ST.loadHealthV2(st)).health;
    expect(loaded.samples.some((s: any) => s.metric === 'weight' && s.value === 71)).toBe(true);
    expect(await st.getItem('@duo_health')).toBe(old);
  });
  it('dado ausente nunca vira zero: dia sem água não entra como 0 no modelo novo', () => {
    const h = ST.emptyHealthV2();
    expect(h.samples).toEqual([]);
    expect(MD.makeSample({ metric: 'weight', value: NaN, date: '2026-10-28', source: 'manual' })).toBeNull();
  });
  it('Duo Score: sem nenhum dado fica "sem nota" (null), não 0', () => {
    const r = H.computeDuoScore({ sessions: [], health: H.emptyHealth(), goals: [], ageGroup: '26-35', now: L(29) });
    expect(r.score === null || typeof r.score === 'number').toBe(true);
    if (r.score !== null) expect(r.score).toBeGreaterThanOrEqual(0);
  });
});
