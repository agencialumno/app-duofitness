// healthScores.js: notas por categoria e Duo Score V2 (estende o atual sem alterá-lo).
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as S from '../../src/utils/healthScores.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as H from '../../src/utils/health.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as M from '../../src/utils/healthModel.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as St from '../../src/utils/healthStore.js';

const NOW = new Date(2026, 5, 10, 12);
const key = (off: number) => H.addDays('2026-06-10', off);
const sample = (metric: string, value: number, off: number, source = 'manual') => ({ metric, value, date: key(off), source, tz: 'America/Sao_Paulo' });
const list = (...xs: ReturnType<typeof sample>[]) => M.normalizeSamples(xs);
const sessionsOn = (offs: number[]) => offs.map((o, i) => ({ id: `s${i}`, completedAt: new Date(2026, 5, 10 + o, 9).toISOString() }));
const days = (metric: string, values: number[], endOff = 0) => values.map((v, i) => sample(metric, v, endOff - (values.length - 1 - i)));

// @ts-expect-error módulo JS de teste, sem tipos
import * as SH from './helpers/sampleHealth.js';
describe('pesos', () => {
  it('somam 100 e as notas de treino do Duo Score atual seguem com os mesmos valores', () => {
    expect(Object.values(S.SCORE_WEIGHTS_V2).reduce((a: number, b: unknown) => a + (b as number), 0)).toBe(100);
    const old = H.computeDuoScore({ sessions: sessionsOn([0, -1, -2]), health: H.emptyHealth(), goals: [], ageGroup: '26-35', now: NOW });
    const v2 = S.computeDuoScoreV2({ sessions: sessionsOn([0, -1, -2]), samples: [], ageGroup: '26-35', now: NOW });
    for (const id of ['consistency', 'streak']) {
      expect(v2.components.find((c: { id: string }) => c.id === id).value).toBe(old.components.find((c: { id: string }) => c.id === id).value);
    }
  });
});

describe('Atividade (7 dias)', () => {
  it('passos: média dos dias COM dado ÷ 7.000; dia sem dado não conta (nunca zero)', () => {
    const n = S.activityNote(list(...days('steps', [7000, 7000, 7000])), NOW); // 3 dias, o resto ausente
    expect(n).toMatchObject({ present: true, value: 100 });
    expect(n.detail).toContain('7.000 passos por dia em 3 dias');
    expect(S.activityNote(list(...days('steps', [3500, 3500, 3500])), NOW).value).toBe(50);
    expect(S.activityNote(list(...days('steps', [20000, 20000, 20000])), NOW).value).toBe(100); // teto
  });
  it('exercício: média/dia × 7 ÷ 150 min; a nota é a média das partes disponíveis', () => {
    const only = S.activityNote(list(...days('exercise_minutes', [30, 30, 30, 30])), NOW); // 210 min/semana
    expect(only.value).toBe(100);
    expect(only.detail).toContain('3h30 de exercício por semana');
    const both = S.activityNote(list(...days('steps', [3500, 3500, 3500]), ...days('exercise_minutes', [15, 15, 15])), NOW); // 50 e 70
    expect(both.value).toBe(60);
  });
  it('menos de 3 dias com dado: ausente e diz o que falta (não penaliza)', () => {
    const n = S.activityNote(list(...days('steps', [9000, 9000])), NOW);
    expect(n.present).toBe(false);
    expect(n.value).toBeNull();
    expect(n.missing).toMatch(/falta registrar passos ou minutos de exercício \(3 dias ou mais/);
    expect(S.activityNote([], NOW).present).toBe(false);
  });
  it('dado fora da janela de 7 dias não conta', () => {
    expect(S.activityNote(list(...days('steps', [9000, 9000, 9000], -10)), NOW).present).toBe(false);
  });
});

describe('Sono (7 dias)', () => {
  it('duração: 7 a 9 h = 100; abaixo cai até 0 em 4 h; acima cai até 70 em 11 h', () => {
    expect(S.nightScore(420)).toBe(100);
    expect(S.nightScore(540)).toBe(100);
    expect(S.nightScore(330)).toBe(50); // 5h30, a meio caminho entre 4 h e 7 h
    expect(S.nightScore(240)).toBe(0);
    expect(S.nightScore(100)).toBe(0);
    expect(S.nightScore(600)).toBe(85);
    expect(S.nightScore(900)).toBe(70);
  });
  it('menores de 18 usam a faixa de 8 a 10 h', () => {
    expect(S.nightScore(450, true)).toBeLessThan(100);
    expect(S.nightScore(450, false)).toBe(100);
    expect(S.nightScore(540, true)).toBe(100);
  });
  it('precisa de 3 noites; com 3 ou mais, nota pela duração média das noites', () => {
    expect(S.sleepNote(list(...days('sleep_duration', [420, 420])), { now: NOW }).present).toBe(false);
    const n = S.sleepNote(list(...days('sleep_duration', [420, 480, 540])), { now: NOW });
    expect(n).toMatchObject({ present: true, value: 100 });
    expect(n.detail).toContain('média de 8h por noite em 3 noites');
    expect(S.sleepNote(list(...days('sleep_duration', [330, 330, 330, 330])), { now: NOW }).value).toBe(50);
  });
  it('regularidade: horário de dormir estável mantém 100; muito variável derruba para 70% duração + 30% x 40', () => {
    const stable = S.sleepNote(list(...days('sleep_duration', [450, 450, 450]), ...days('bedtime', [1380, 1385, 1390])), { now: NOW });
    expect(stable.value).toBe(100);
    const irregular = S.sleepNote(list(...days('sleep_duration', [450, 450, 450]), ...days('bedtime', [1320, 60, 1380])), { now: NOW });
    expect(irregular.value).toBeLessThan(100);
    expect(irregular.detail).toMatch(/horário de dormir variou cerca de \d+ min/);
  });
  it('hora de dormir atravessa a meia-noite sem confundir (23:50, 00:10, 00:00 são regulares)', () => {
    const sp = S.bedtimeSpread(list(...days('bedtime', [1430, 10, 0])), NOW);
    expect(sp.minutes).toBeLessThan(15);
  });
});

describe('Hidratação (7 dias)', () => {
  it('média de min(copos ÷ meta, 1) só dos dias COM registro; sem registro: ausente', () => {
    expect(S.hydrationNote(list(sample('water', 8, 0), sample('water', 4, -2)), { waterGoal: 8, now: NOW }).value).toBe(75);
    expect(S.hydrationNote(list(sample('water', 16, 0)), { waterGoal: 8, now: NOW }).value).toBe(100);
    const n = S.hydrationNote([], { now: NOW });
    expect(n.present).toBe(false);
    expect(n.missing).toBe('falta registrar seus copos de água');
  });
  it('um 0 registrado conta 0; dia sem registro não conta', () => {
    expect(S.hydrationNote(list(sample('water', 0, 0), sample('water', 8, -1)), { waterGoal: 8, now: NOW }).value).toBe(50);
  });
});

describe('Composição corporal (30 dias, sem meta nem objetivo)', () => {
  it('50% acompanhamento + 50% estabilidade', () => {
    const w = list(sample('weight', 80, -28), sample('weight', 80.2, -21), sample('weight', 80.1, -14), sample('weight', 80.3, -7)); // 4 registros, 0,1 kg/sem
    const n = S.compositionNote(w, NOW);
    expect(n).toMatchObject({ present: true, value: 100 });
    expect(n.detail).toContain('4 registros em 30 dias');
    const two = S.compositionNote(list(sample('weight', 80, -14), sample('weight', 81, -1)), NOW); // 2 registros: 50; 0,54 kg/sem: 80
    expect(two.value).toBe(65);
  });
  it('variação grande por semana derruba só a estabilidade, igual para subir ou descer (sem direção de objetivo)', () => {
    const up = S.compositionNote(list(sample('weight', 80, -14), sample('weight', 84, -1)), NOW);
    const down = S.compositionNote(list(sample('weight', 84, -14), sample('weight', 80, -1)), NOW);
    expect(up.value).toBe(down.value);
    expect(up.value).toBe(55);
  });
  it('precisa de 2 registros com 7 dias ou mais; senão ausente', () => {
    expect(S.compositionNote(list(sample('weight', 80, 0)), NOW).present).toBe(false);
    expect(S.compositionNote(list(sample('weight', 80, -3), sample('weight', 81, 0)), NOW).present).toBe(false);
    expect(S.compositionNote(list(sample('weight', 80, -40), sample('weight', 81, -35)), NOW).present).toBe(false); // fora dos 30 dias
    expect(S.compositionNote(list(sample('weight', 80, -14), sample('weight', 81, -1)), NOW).missing).toBeUndefined();
  });
  it('% de gordura e massa magra não entram na nota (só aparecem nos cartões)', () => {
    const w = list(sample('weight', 80, -14), sample('weight', 80, -1));
    const withFat = list(sample('weight', 80, -14), sample('weight', 80, -1), sample('body_fat', 30, -1), sample('lean_mass', 40, -1));
    expect(S.compositionNote(withFat, NOW).value).toBe(S.compositionNote(w, NOW).value);
  });
});

describe('Duo Score V2', () => {
  it('categoria sem dados NÃO entra na conta nem penaliza: o score considera só o que existe', () => {
    const treino = S.computeDuoScoreV2({ sessions: sessionsOn([0, -1, -2]), samples: [], ageGroup: '26-35', now: NOW });
    expect(treino.components.filter((c: { present: boolean }) => c.present).map((c: { id: string }) => c.id)).toEqual(['consistency', 'streak']);
    // (30 × 100 + 10 × 43) / 40
    expect(treino.score).toBe(Math.round((30 * 100 + 10 * Math.round((3 / 7) * 100)) / 40));
    const comSono = S.computeDuoScoreV2({ sessions: sessionsOn([0, -1, -2]), samples: list(...days('sleep_duration', [60, 60, 60])), ageGroup: '26-35', now: NOW });
    // sono ruim (nota 0) agora ENTRA e puxa para baixo; sem o dado, não puxava
    expect(comSono.score).toBeLessThan(treino.score);
  });
  it('sem nenhum dado o score é null e a lista diz tudo o que falta', () => {
    const r = S.computeDuoScoreV2({ sessions: [], samples: [], ageGroup: '26-35', now: NOW });
    expect(r.score).toBeNull();
    expect(r.missing).toHaveLength(5); // "falta concluir um treino" aparece uma vez só
    expect(new Set(r.missing).size).toBe(r.missing.length);
    expect(r.components.every((c: { present: boolean; points: number | null }) => !c.present && c.points === null)).toBe(true);
  });
  it('"por que este número": cada componente presente traz nota, peso (%) e pontos, e a soma dos pontos fecha o score', () => {
    const r = S.computeDuoScoreV2({
      sessions: sessionsOn([0, -1, -2, -3]),
      samples: list(...days('steps', [7000, 7000, 7000]), ...days('sleep_duration', [450, 450, 450]), sample('water', 8, 0), sample('water', 8, -1)),
      ageGroup: '26-35', now: NOW,
    });
    const present = r.components.filter((c: { present: boolean }) => c.present);
    expect(present.map((c: { id: string }) => c.id).sort()).toEqual(['activity', 'consistency', 'hydration', 'sleep', 'streak']);
    for (const c of present) {
      expect(typeof c.value).toBe('number');
      expect(c.detail.length).toBeGreaterThan(5);
      expect(c.share).toBeGreaterThan(0);
    }
    expect(present.reduce((s: number, c: { share: number }) => s + c.share, 0)).toBeGreaterThanOrEqual(99);
    expect(Math.abs(present.reduce((s: number, c: { points: number }) => s + c.points, 0) - r.score)).toBeLessThan(1);
  });
  it('menores de 18: sem composição corporal na conta (mesmo com peso registrado) e sono na faixa de 8 a 10 h', () => {
    const samples = list(sample('weight', 60, -14), sample('weight', 61, -1), ...days('sleep_duration', [450, 450, 450]));
    const minor = S.computeDuoScoreV2({ sessions: [], samples, ageGroup: 'under18', now: NOW });
    expect(minor.minor).toBe(true);
    expect(minor.components.some((c: { id: string }) => c.id === 'composition')).toBe(false);
    const adult = S.computeDuoScoreV2({ sessions: [], samples, ageGroup: '26-35', now: NOW });
    expect(adult.components.find((c: { id: string }) => c.id === 'composition').present).toBe(true);
    expect(minor.components.find((c: { id: string }) => c.id === 'sleep').value).toBeLessThan(adult.components.find((c: { id: string }) => c.id === 'sleep').value);
  });
  it('os objetivos do perfil não mudam as notas (sem direção de peso nem meta)', () => {
    const samples = list(sample('weight', 80, -14), sample('weight', 76, -1));
    const a = S.computeDuoScoreV2({ sessions: sessionsOn([0]), samples, goals: ['lose_weight'], ageGroup: '26-35', now: NOW });
    const b = S.computeDuoScoreV2({ sessions: sessionsOn([0]), samples, goals: ['gain_muscle'], ageGroup: '26-35', now: NOW });
    expect(a.score).toBe(b.score);
  });
  it('o Duo Score atual (health.js) continua igual: mesmos pesos e mesma fórmula', () => {
    expect(H.SCORE_WEIGHTS).toEqual({ consistency: 50, streak: 20, hydration: 15, weight: 15 });
    expect(S.SCORE_WEIGHTS_V2).toEqual({ consistency: 30, streak: 10, activity: 15, sleep: 20, hydration: 15, composition: 10 });
  });
  it('limites: o score fica entre 0 e 100 com dados extremos', () => {
    const r = S.computeDuoScoreV2({ sessions: sessionsOn([0, -1, -2, -3, -4, -5, -6]), samples: list(...days('steps', [100000, 100000, 100000]), ...days('sleep_duration', [1, 1, 1]), sample('water', 60, 0)), ageGroup: '26-35', now: NOW });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
  it('categoryNotes: composição some para menores; sem dado vira "Sem dados"', () => {
    const adult = S.categoryNotes(S.computeDuoScoreV2({ sessions: [], samples: [], ageGroup: '26-35', now: NOW }));
    expect(adult.map((c: { id: string }) => c.id)).toEqual(['composition', 'activity', 'sleep', 'hydration']);
    expect(adult.every((c: { value: number | null; grade: string }) => c.value === null && c.grade === 'Sem dados')).toBe(true);
    const minor = S.categoryNotes(S.computeDuoScoreV2({ sessions: [], samples: [], ageGroup: 'under18', now: NOW }));
    expect(minor.map((c: { id: string }) => c.id)).toEqual(['activity', 'sleep', 'hydration']);
  });
  it('o demo (dados de exemplo em todas as categorias) gera um score com todos os componentes presentes', () => {
    const demo = SH.buildDemoHealthV2(NOW);
    const r = S.computeDuoScoreV2({ sessions: sessionsOn([0, -1, -2, -3, -4, -6, -7]), samples: demo.samples, waterGoal: demo.waterGoal, ageGroup: '26-35', now: NOW });
    expect(r.components.every((c: { present: boolean }) => c.present)).toBe(true);
    expect(r.score).toBeGreaterThan(50);
  });
});
