// Saúde (src/utils/health.js e healthProviders.js): histórico, vírgula decimal, Duo Score,
// componentes ausentes, limites 0 a 100, menores de 18, relatório e provedores.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as H from '../../src/utils/health.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as P from '../../src/utils/healthProviders.js';

const REPO = path.resolve(__dirname, '../..');
const NOW = new Date(2026, 5, 10, 12, 0, 0); // quarta, 10/06/2026, meio-dia local
const key = (off: number) => H.addDays(H.dayKey(NOW), off);
const sessionsOn = (offs: number[]) => offs.map((o, i) => ({ id: String(i), completedAt: new Date(2026, 5, 10 + o, 9, 0).toISOString() }));
const waterOn = (map: Record<number, number>) => Object.fromEntries(Object.entries(map).map(([o, g]) => [key(Number(o)), g]));

describe('peso: vírgula decimal e validação', () => {
  it.each([
    ['78', 78], ['78,5', 78.5], ['78.5', 78.5], [' 78,5 kg ', 78.5], ['78,55', 78.6], ['102,3', 102.3], ['65 KG', 65],
  ])('aceita %j -> %d', (input, expected) => {
    expect(H.parseWeightInput(input)).toBe(expected);
  });
  it.each(['', 'abc', '78,5,2', '7', '29', '301', '1.234,5', '-70', '78 quilos', null, undefined])('recusa %j', (input) => {
    expect(H.parseWeightInput(input)).toBeNull();
  });
  it('aceita número vindo do código e formata com vírgula', () => {
    expect(H.parseWeightInput(70.04)).toBe(70);
    expect(H.formatKg(78.5)).toBe('78,5 kg');
    expect(H.formatKg(80)).toBe('80 kg');
  });
});

describe('histórico de peso', () => {
  it('um registro por dia (o segundo substitui), ordenado por data, sem mutar', () => {
    const h0 = H.emptyHealth();
    const h1 = H.addWeight(h0, '80,5', key(-3));
    const h2 = H.addWeight(h1, '79', key(-10));
    const h3 = H.addWeight(h2, '80', key(-3));
    expect(h3.weights).toEqual([{ date: key(-10), kg: 79 }, { date: key(-3), kg: 80 }]);
    expect(h0.weights).toEqual([]);
    expect(h1.weights).toHaveLength(1);
  });
  it('peso inválido ou data inválida não muda nada', () => {
    const h = H.addWeight(H.emptyHealth(), 70, key(0));
    expect(H.addWeight(h, 'abc', key(0))).toEqual(h);
    expect(H.addWeight(h, 70, '2026-13-45').weights).toEqual(h.weights);
  });
  it('remove por data', () => {
    const h = H.addWeight(H.addWeight(H.emptyHealth(), 70, key(-1)), 71, key(0));
    expect(H.removeWeight(h, key(-1)).weights).toEqual([{ date: key(0), kg: 71 }]);
  });
  it('normalizeHealth descarta lixo e mantém o que presta', () => {
    const h = H.normalizeHealth({
      weights: [{ date: key(0), kg: 70 }, { date: 'ontem', kg: 70 }, { date: key(-1), kg: 5 }, { date: key(-2), kg: 'x' }, null],
      water: { [key(0)]: 4, [key(-1)]: -2, ruim: 3, [key(-2)]: 99 },
      waterGoal: 500,
    });
    expect(h.weights).toEqual([{ date: key(0), kg: 70 }]);
    expect(h.water).toEqual({ [key(0)]: 4, [key(-2)]: 30 });
    expect(h.waterGoal).toBe(20);
    expect(H.normalizeHealth('lixo')).toEqual(H.emptyHealth());
    expect(H.normalizeHealth(null)).toEqual(H.emptyHealth());
  });
  it('tendência exige 2 registros em dias diferentes na janela', () => {
    expect(H.getWeightTrend(H.emptyHealth(), { now: NOW })).toBeNull();
    const one = H.addWeight(H.emptyHealth(), 70, key(0));
    expect(H.getWeightTrend(one, { now: NOW })).toBeNull();
    const two = H.addWeight(one, 71, key(-14));
    const t = H.getWeightTrend(two, { now: NOW });
    expect(t).toMatchObject({ delta: -1, days: 14, count: 2 });
    expect(t.perWeek).toBe(-0.5);
    const old = H.addWeight(H.addWeight(H.emptyHealth(), 70, key(-90)), 75, key(-80));
    expect(H.getWeightTrend(old, { days: 30, now: NOW })).toBeNull();
  });
  it('pontos do gráfico ficam entre 0 e 1, mesmo com série reta ou 1 ponto', () => {
    expect(H.getChartPoints([])).toEqual([]);
    const flat = H.getChartPoints([{ date: key(-7), kg: 70 }, { date: key(0), kg: 70 }]);
    for (const p of flat) { expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(1); expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(1); }
    const one = H.getChartPoints([{ date: key(0), kg: 70 }]);
    expect(one[0].x).toBe(0.5);
    const up = H.getChartPoints([{ date: key(-14), kg: 70 }, { date: key(-7), kg: 72 }, { date: key(0), kg: 74 }]);
    expect(up.map((p: { y: number }) => p.y)).toEqual([0, 0.5, 1]);
    expect(up.map((p: { x: number }) => p.x)).toEqual([0, 0.5, 1]);
  });
});

describe('água', () => {
  it('soma, limita entre 0 e 30 e não vai abaixo de zero', () => {
    let h = H.emptyHealth();
    h = H.addGlass(h, 1, key(0));
    h = H.addGlass(h, 1, key(0));
    expect(H.getWater(h, key(0))).toBe(2);
    h = H.addGlass(h, -5, key(0));
    expect(H.getWater(h, key(0))).toBe(0);
    h = H.setWater(h, 500, key(0));
    expect(H.getWater(h, key(0))).toBe(30);
    expect(H.getWater(h, key(-1))).toBe(0);
  });
  it('meta editável entre 1 e 20 (padrão 8)', () => {
    expect(H.emptyHealth().waterGoal).toBe(8);
    expect(H.setWaterGoal(H.emptyHealth(), 10).waterGoal).toBe(10);
    expect(H.setWaterGoal(H.emptyHealth(), 0).waterGoal).toBe(1);
    expect(H.setWaterGoal(H.emptyHealth(), 99).waterGoal).toBe(20);
    expect(H.setWaterGoal(H.emptyHealth(), NaN).waterGoal).toBe(8);
  });
});

describe('treinos: contagem e sequência', () => {
  it('conta dias distintos nos últimos 7 (dois treinos no mesmo dia = 1)', () => {
    const s = [...sessionsOn([0, -1, -3, -7, -20]), ...sessionsOn([0])];
    expect(H.countTrainingDays(s, { now: NOW })).toBe(3);
  });
  it('sequência: hoje ou ontem contam, buraco quebra', () => {
    expect(H.computeStreak(sessionsOn([0, -1, -2]), NOW)).toBe(3);
    expect(H.computeStreak(sessionsOn([-1, -2, -3, -4]), NOW)).toBe(4);
    expect(H.computeStreak(sessionsOn([0, -2, -3]), NOW)).toBe(1);
    expect(H.computeStreak(sessionsOn([-2, -3]), NOW)).toBe(0);
    expect(H.computeStreak([], NOW)).toBe(0);
    expect(H.computeStreak([{ completedAt: 'lixo' }], NOW)).toBe(0);
  });
});

describe('Duo Score: componentes ausentes não penalizam', () => {
  it('sem nenhum dado: score null e todos os componentes ausentes', () => {
    const r = H.computeDuoScore({ sessions: [], health: H.emptyHealth(), goals: ['health'], ageGroup: '26-35', now: NOW });
    expect(r.score).toBeNull();
    expect(r.components.every((c: { present: boolean }) => !c.present)).toBe(true);
    expect(r.missing.length).toBe(4);
  });

  it('só treinos: score só sobre treino e sequência (50 e 20), sem hidratação e peso zerando', () => {
    const r = H.computeDuoScore({ sessions: sessionsOn([0, -1, -2]), health: H.emptyHealth(), goals: [], ageGroup: '26-35', now: NOW });
    const c = Object.fromEntries(r.components.map((x: { id: string }) => [x.id, x]));
    expect(c.consistency.value).toBe(100);
    expect(c.streak.value).toBe(43); // 3/7
    expect(r.score).toBe(Math.round((50 * 100 + 20 * 43) / 70)); // 84
    expect(r.score).toBe(84);
    expect(c.hydration.present).toBe(false);
    expect(r.missing.join(' ')).toMatch(/copos de água/);
    expect(r.missing.join(' ')).toMatch(/seu peso/);
  });

  it('adicionar um componente ausente não derruba o score por "estar zero"', () => {
    const base = { sessions: sessionsOn([0, -1, -2, -3, -4, -5, -6]), goals: [] as string[], ageGroup: '26-35', now: NOW };
    const sem = H.computeDuoScore({ ...base, health: H.emptyHealth() });
    expect(sem.score).toBe(100);
    const com = H.computeDuoScore({ ...base, health: H.setWater(H.emptyHealth(), 8, key(0)) });
    expect(com.score).toBe(100); // hidratação 100% entra e mantém 100
  });

  it('pesos reais: hidratação ruim puxa para baixo só porque existe', () => {
    const base = { sessions: sessionsOn([0, -1, -2, -3, -4, -5, -6]), goals: [] as string[], ageGroup: '26-35', now: NOW };
    const r = H.computeDuoScore({ ...base, health: H.setWater(H.emptyHealth(), 2, key(0)) });
    // hidratação = 2/8 = 25. (50*100 + 20*100 + 15*25) / 85
    expect(r.score).toBe(Math.round((5000 + 2000 + 375) / 85));
    const hyd = r.components.find((c: { id: string }) => c.id === 'hydration');
    expect(hyd.value).toBe(25);
  });

  it('treinou antes mas não nos últimos 7 dias: consistência 0 é dado, não ausência', () => {
    const r = H.computeDuoScore({ sessions: sessionsOn([-20, -21]), health: H.emptyHealth(), goals: [], ageGroup: '26-35', now: NOW });
    const c = r.components.find((x: { id: string }) => x.id === 'consistency');
    expect(c.present).toBe(true);
    expect(c.value).toBe(0);
    expect(r.score).toBe(0);
  });

  it('sempre entre 0 e 100, inteiro, com combinações extremas', () => {
    const goalsList = [[], ['lose_weight'], ['gain_muscle'], ['health'], ['lose_weight', 'gain_muscle']];
    for (const goals of goalsList) {
      for (const offs of [[], [0], [0, -1, -2, -3, -4, -5, -6, -7, -8, -9], [-30]]) {
        for (const weights of [[], [[-14, 90], [0, 60]], [[-14, 60], [0, 95]], [[-10, 70], [0, 70]]]) {
          for (const glasses of [0, 1, 8, 30]) {
            let h = H.setWater(H.emptyHealth(), glasses, key(0));
            for (const [off, kg] of weights as number[][]) h = H.addWeight(h, kg, key(off!));
            const r = H.computeDuoScore({ sessions: sessionsOn(offs), health: h, goals, ageGroup: '26-35', now: NOW });
            if (r.score !== null) {
              expect(Number.isInteger(r.score)).toBe(true);
              expect(r.score).toBeGreaterThanOrEqual(0);
              expect(r.score).toBeLessThanOrEqual(100);
            }
            for (const c of r.components) if (c.present) { expect(c.value).toBeGreaterThanOrEqual(0); expect(c.value).toBeLessThanOrEqual(100); }
          }
        }
      }
    }
  });

  it('detalhamento: as parcelas (points) somam o score, e as fatias somam ~100%', () => {
    let h = H.setWater(H.emptyHealth(), 6, key(0));
    h = H.addWeight(H.addWeight(h, 76, key(-14)), 76.6, key(0));
    const r = H.computeDuoScore({ sessions: sessionsOn([0, -2, -4]), health: h, goals: ['gain_muscle'], ageGroup: '26-35', now: NOW });
    const present = r.components.filter((c: { present: boolean }) => c.present);
    expect(present).toHaveLength(4);
    const sum = present.reduce((s: number, c: { points: number }) => s + c.points, 0);
    expect(Math.abs(sum - r.score)).toBeLessThanOrEqual(0.3);
    expect(present.reduce((s: number, c: { share: number }) => s + c.share, 0)).toBeGreaterThanOrEqual(99);
  });
});

describe('Duo Score: hidratação', () => {
  it('conta dias sem registro como 0 só depois que a pessoa começou a registrar', () => {
    // começou há 3 dias (dias -3 e -1 registrados com a meta cheia; -2 e hoje em branco): (1+0+1+0)/4 = 50
    const h = { ...H.emptyHealth(), water: waterOn({ [-3]: 8, [-1]: 8 }) };
    const r = H.computeDuoScore({ sessions: [], health: h, goals: [], ageGroup: '26-35', now: NOW });
    const hyd = r.components.find((c: { id: string }) => c.id === 'hydration');
    expect(hyd.value).toBe(50);
    expect(r.score).toBe(50); // só hidratação existe
  });
  it('registro mais antigo que 7 dias não conta', () => {
    const h = { ...H.emptyHealth(), water: waterOn({ [-9]: 8 }) };
    expect(H.computeDuoScore({ health: h, now: NOW }).components.find((c: { id: string }) => c.id === 'hydration').present).toBe(false);
  });
  it('meta editada muda a nota', () => {
    const h = { ...H.emptyHealth(), waterGoal: 4, water: waterOn({ 0: 4 }) };
    expect(H.computeDuoScore({ health: h, now: NOW }).score).toBe(100);
  });
});

describe('Duo Score: tendência de peso conforme o objetivo', () => {
  const withTrend = (kgStart: number, kgEnd: number) => H.addWeight(H.addWeight(H.emptyHealth(), kgStart, key(-14)), kgEnd, key(0));
  const weightComp = (goals: string[], h: unknown, age = '26-35') =>
    H.computeDuoScore({ health: h, goals, ageGroup: age, now: NOW }).components.find((c: { id: string }) => c.id === 'weight');

  it('precisa de 2 registros com 7+ dias entre eles', () => {
    const tooClose = H.addWeight(H.addWeight(H.emptyHealth(), 70, key(-3)), 69, key(0));
    expect(weightComp([], tooClose).present).toBe(false);
    expect(weightComp([], H.emptyHealth()).present).toBe(false);
  });
  it('objetivo de baixar: queda de ~0,5 kg/sem é "no rumo"; subir fica fora', () => {
    expect(weightComp(['lose_weight'], withTrend(80, 79)).value).toBe(100);
    expect(weightComp(['lose_weight'], withTrend(80, 81)).value).toBe(40);
    expect(weightComp(['lose_weight'], withTrend(80, 80.2)).value).toBe(70);
  });
  it('queda muito rápida não ganha nota máxima (não incentiva perda acelerada)', () => {
    const c = weightComp(['lose_weight'], withTrend(80, 76)); // ~2 kg/sem
    expect(c.value).toBe(60);
    expect(c.value).toBeLessThan(100);
  });
  it('objetivo de ganhar massa: subida lenta é "no rumo"', () => {
    expect(weightComp(['gain_muscle'], withTrend(70, 71)).value).toBe(100);
    expect(weightComp(['gain_muscle'], withTrend(70, 68)).value).toBe(40);
  });
  it('manutenção/saúde: estável é nota máxima', () => {
    expect(weightComp(['health'], withTrend(70, 70.2)).value).toBe(100);
    expect(weightComp(['maintain'], withTrend(70, 73)).value).toBe(40);
    expect(weightComp([], withTrend(70, 70)).value).toBe(100);
  });
  it('mudar de objetivo muda a leitura do mesmo histórico', () => {
    const h = withTrend(80, 79);
    expect(weightComp(['lose_weight'], h).value).not.toBe(weightComp(['gain_muscle'], h).value);
  });
});

describe('menores de 18 (under18): só hábitos', () => {
  const minorH = H.addWeight(H.addWeight(H.setWater(H.emptyHealth(), 8, key(0)), 60, key(-14)), 58, key(0));
  const input = { sessions: sessionsOn([0, -1, -2]), health: minorH, goals: ['lose_weight'], ageGroup: 'under18', now: NOW };

  it('não existe componente de peso e a meta de peso é nula', () => {
    const r = H.computeDuoScore(input);
    expect(r.components.map((c: { id: string }) => c.id)).toEqual(['consistency', 'streak', 'hydration']);
    expect(H.getWeightDirection(['lose_weight'], 'under18')).toBeNull();
    expect(r.minor).toBe(true);
    expect(r.missing.join(' ')).not.toMatch(/peso/);
  });
  it('o peso registrado não influencia o score', () => {
    const semPeso = H.computeDuoScore({ ...input, health: H.setWater(H.emptyHealth(), 8, key(0)) });
    expect(H.computeDuoScore(input).score).toBe(semPeso.score);
  });
  it('relatório e recomendações não falam de peso nem de emagrecimento', () => {
    const rep = H.buildWeeklyReport({ ...input, health: H.emptyHealth() });
    expect(rep.recommendations.join(' ')).not.toMatch(/peso|emagre|balan/i);
    expect(rep.categories.map((c: { id: string }) => c.id)).toEqual(['consistency', 'hydration', 'progress']);
  });
});

describe('relatório semanal e recomendações', () => {
  it('3 categorias com nota ou "Sem dados"', () => {
    const rep = H.buildWeeklyReport({ sessions: sessionsOn([0, -1]), health: H.emptyHealth(), goals: [], ageGroup: '26-35', now: NOW });
    const c = Object.fromEntries(rep.categories.map((x: { id: string }) => [x.id, x]));
    expect(c.consistency.value).toBe(67);
    expect(c.hydration.value).toBeNull();
    expect(c.hydration.grade).toBe('Sem dados');
    expect(c.consistency.label).toBe('Consistência');
    expect(c.consistency.grade).toBe('Bom');
    expect(c.progress.value).not.toBeNull();
  });
  it('2 a 3 recomendações, sem repetir', () => {
    const cenarios = [
      { sessions: [], health: H.emptyHealth() },
      { sessions: sessionsOn([0]), health: H.emptyHealth() },
      { sessions: sessionsOn([0, -1, -2, -3]), health: H.setWater(H.emptyHealth(), 8, key(0)) },
      { sessions: sessionsOn([0, -1, -2]), health: H.setWater(H.emptyHealth(), 1, key(0)) },
    ];
    for (const c of cenarios) {
      const r = H.buildWeeklyReport({ ...c, goals: [], ageGroup: '26-35', now: NOW }).recommendations as string[];
      expect(r.length).toBeGreaterThanOrEqual(2);
      expect(r.length).toBeLessThanOrEqual(3);
      expect(new Set(r).size).toBe(r.length);
    }
  });
  it('recomenda treinar o que falta para a meta e registrar água quando não há registro', () => {
    const r = H.buildWeeklyReport({ sessions: sessionsOn([0]), health: H.emptyHealth(), goals: [], ageGroup: '26-35', now: NOW }).recommendations.join(' ');
    expect(r).toMatch(/mais 2 dias/);
    expect(r).toMatch(/Registre seus copos de água/);
  });
  it('recomendações nunca usam termos de dieta, déficit, dose ou emagrecimento (todos os cenários e idades)', () => {
    const PROIBIDOS = /dieta|d[eé]ficit|caloria|kcal|emagre|dose|dosag|jejum|suplement|\bmg\b|gordura|barriga|perder peso|queimar/i;
    for (const age of ['under18', '18-25', '26-35', '36-45', '46+']) {
      for (const goals of [[], ['lose_weight'], ['gain_muscle']]) {
        for (const offs of [[], [0], [0, -1, -2, -3]]) {
          for (const g of [0, 2, 8]) {
            for (const w of [[], [[-14, 90], [0, 80]]]) {
              let h = H.setWater(H.emptyHealth(), g, key(0));
              for (const [off, kg] of w as number[][]) h = H.addWeight(h, kg, key(off!));
              const rep = H.buildWeeklyReport({ sessions: sessionsOn(offs), health: h, goals, ageGroup: age, now: NOW });
              const text = [...rep.recommendations, ...rep.components.map((c: { detail: string }) => c.detail), ...rep.missing].join(' | ');
              expect(PROIBIDOS.test(text), text).toBe(false);
            }
          }
        }
      }
    }
  });
  it('avisos fixos', () => {
    expect(H.SCORE_DISCLAIMER).toBe('O Duo Score mede hábitos. Não é uma avaliação médica.');
    expect(H.PRIVACY_NOTE).toMatch(/só neste aparelho/);
  });
});

describe('faixas do score', () => {
  it.each([[null, 'Sem dados ainda'], [0, 'Dá para melhorar'], [39, 'Dá para melhorar'], [40, 'Regular'], [60, 'Bom'], [80, 'Ótimo'], [100, 'Ótimo']])('%s -> %s', (s, label) => {
    expect(H.scoreBand(s).label).toBe(label);
  });
});

describe('Modo Demo: histórico de exemplo', () => {
  it('é determinístico, válido e gera um score com todos os componentes', () => {
    const a = H.buildDemoHealth(NOW);
    expect(a).toEqual(H.buildDemoHealth(NOW));
    expect(H.normalizeHealth(a)).toEqual(a);
    expect(a.weights.length).toBeGreaterThanOrEqual(5);
    expect(Object.keys(a.water)).toHaveLength(7);
    const r = H.computeDuoScore({ sessions: sessionsOn([-1, -2, -3, -4, -6, -7]), health: a, goals: ['gain_muscle', 'health'], ageGroup: '26-35', now: NOW });
    expect(r.components.every((c: { present: boolean }) => c.present)).toBe(true);
    expect(r.score).toBeGreaterThan(0);
  });
});

describe('integração (provedores)', () => {
  it('manual por padrão: sem passos, sono nem batimentos, e nunca lança', async () => {
    const p = P.selectHealthProvider({});
    expect(p.source).toBe('manual');
    expect(await p.isAvailable()).toBe(true);
    expect(await p.getSteps({})).toBeNull();
    expect(await p.getSleep({})).toBeNull();
    expect(await p.getHeartRate({})).toBeNull();
  });
  it('flag desligada ("false", vazia, ausente) mantém o manual em qualquer plataforma', () => {
    for (const flag of ['false', '', undefined, '0', 'nao']) {
      for (const platform of ['ios', 'android', 'web']) expect(P.selectHealthProvider({ flag, platform }).source).toBe('manual');
    }
  });
  it('flag ligada escolhe o stub da plataforma, que continua indisponível e sem dados', async () => {
    const ios = P.selectHealthProvider({ flag: 'true', platform: 'ios' });
    const droid = P.selectHealthProvider({ flag: '1', platform: 'android' });
    expect(ios.source).toBe('healthkit');
    expect(droid.source).toBe('healthconnect');
    for (const p of [ios, droid]) {
      expect(await p.isAvailable()).toBe(false);
      expect(await p.getSteps({})).toBeNull();
      expect(await p.getSleep({})).toBeNull();
      expect(await p.getHeartRate({})).toBeNull();
    }
    expect(P.selectHealthProvider({ flag: 'true', platform: 'web' }).source).toBe('manual');
  });
  it('Modo Demo nunca usa integração', () => {
    expect(P.selectHealthProvider({ flag: 'true', platform: 'ios', isDemo: true }).source).toBe('manual');
  });
  it('cartão de conexão: "em breve" e desabilitado', () => {
    expect(P.CONNECT_CARD).toMatchObject({ status: 'em breve', enabled: false });
    expect(P.CONNECT_CARD.title).toBe('Conectar Apple Saúde / Health Connect');
  });
  it('a flag do app padrão é false e não há segredo nem módulo nativo nos arquivos', () => {
    const cfg = readFileSync(path.join(REPO, 'src/data/healthConfig.js'), 'utf8');
    expect(cfg).toMatch(/\|\| 'false'/);
    const providers = readFileSync(path.join(REPO, 'src/utils/healthProviders.js'), 'utf8');
    expect(providers).not.toMatch(/from\s+['"](react|expo|react-native|@kingstinct|react-native-health)/);
    const pkg = JSON.parse(readFileSync(path.join(REPO, 'package.json'), 'utf8'));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).join(' ');
    expect(deps).not.toMatch(/health/i);
  });
});
