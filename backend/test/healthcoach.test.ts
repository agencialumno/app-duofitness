// healthCoach.js e healthCoachTexts.js: regras (não IA), no máximo 3 sugestões com motivo e ação, e scanner de termos proibidos.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as C from '../../src/utils/healthCoach.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as T from '../../src/data/healthCoachTexts.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as H from '../../src/utils/health.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as M from '../../src/utils/healthModel.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as St from '../../src/utils/healthStore.js';

const REPO = path.resolve(__dirname, '../..');
const NOW = new Date(2026, 5, 10, 12);
const key = (off: number) => H.addDays('2026-06-10', off);
const sample = (metric: string, value: number, off: number) => ({ metric, value, date: key(off), source: 'manual', tz: 'America/Sao_Paulo' });
const days = (metric: string, values: number[]) => values.map((v, i) => sample(metric, v, -(values.length - 1 - i)));
const L = (...xs: unknown[]) => M.normalizeSamples(xs.flat());
const sessionsOn = (offs: number[]) => offs.map((o, i) => ({ id: `s${i}`, completedAt: new Date(2026, 5, 10 + o, 9).toISOString() }));
type Sug = { id: string; category: string; reason: string; action: string };
const run = (over: Record<string, unknown>) => C.buildCoachSuggestions({ samples: [], sessions: [], goals: [], ageGroup: '26-35', waterGoal: 8, now: NOW, ...over }) as { suggestions: Sug[]; insufficient: boolean; message: string | null };

// Termos que NUNCA podem aparecer (a lista do pedido + tom): dieta, calorias, déficit, metas de peso ou de gordura, prazos,
// suplementos, doses, diagnóstico, alerta clínico e linguagem de culpa.
const PROIBIDOS = /dieta|calor[ií]a|kcal|d[eé]ficit|emagre|perder peso|perda de peso|reduzir peso|queim|jejum|\bdose|dosag|suplement|whey|prote[ií]na em p[oó]|meta de peso|meta de gordura|peso ideal|gordura|obes|magreza|sobrepeso|prazo|em \d+ (dias|semanas|meses)|diagn[oó]stic|doen[cç]|alerta|risco|sintoma|cl[ií]nic|tratamento|culpa|fracass|pregui[cç]|falhou|voc[eê] deveria|resultado garant|milagr|detox|card[aá]pio|r[aá]pid[oa]/i;

describe('scanner de termos proibidos', () => {
  it('o scanner funciona: pega frases proibidas e deixa passar as nossas', () => {
    for (const ruim of ['Faça uma dieta', 'Corte as calorias', 'Meta de peso: 70 kg', 'Reduza a gordura corporal', 'Tome um suplemento', 'Dose de 5 g', 'Você falhou de novo', 'Isso pode indicar uma doença', 'Em 30 dias você vai emagrecer', 'Alerta: procure um médico']) {
      expect(PROIBIDOS.test(ruim), ruim).toBe(true);
    }
    for (const ok of ['Beba um copo de água ao acordar', 'Faça uma caminhada de 10 minutos hoje', 'Você dormiu em média 5h40 nos últimos 7 dias']) expect(PROIBIDOS.test(ok), ok).toBe(false);
  });

  it('todos os textos de healthCoachTexts.js passam (modelos e frases soltas)', () => {
    const all = T.allCoachStrings() as string[];
    expect(all.length).toBeGreaterThanOrEqual(20);
    for (const t of all) expect(PROIBIDOS.test(t), t).toBe(false);
  });

  it('toda sugestão gerada, em muitos cenários, objetivos e idades, passa no scanner', () => {
    const cenarios = [
      L(days('sleep_duration', [300, 320, 340, 310]), days('bedtime', [1380, 60, 1320, 90])),
      L(days('steps', [2000, 3000, 2500]), days('exercise_minutes', [0, 10, 5]), sample('water', 2, 0), sample('water', 3, -1)),
      L(days('resting_hr', [58, 58, 58, 58, 58, 58, 58, 64, 64, 64, 64, 64, 64, 64])),
      St.buildDemoHealthV2(NOW).samples,
      [],
    ];
    let n = 0;
    for (const samples of cenarios) for (const age of ['under18', '18-25', '26-35', '46+']) for (const goals of [[], ['lose_weight'], ['gain_muscle'], ['health', 'maintain'], ['lose_weight', 'gain_muscle']]) for (const sessions of [[], sessionsOn([0]), sessionsOn([0, -1, -2, -3])]) {
      const r = run({ samples, ageGroup: age, goals, sessions });
      const text = [r.message ?? '', ...r.suggestions.flatMap((s) => [s.reason, s.action])].join(' | ');
      expect(PROIBIDOS.test(text), text).toBe(false);
      n++;
    }
    expect(n).toBe(5 * 4 * 5 * 3);
  });
});

describe('regras', () => {
  it('sono curto: motivo com a média real ("5h40") e ação concreta', () => {
    const r = run({ samples: L(days('sleep_duration', [340, 340, 340, 340, 340])) });
    const s = r.suggestions.find((x) => x.id === 'sleep_short')!;
    expect(s.reason).toBe('Você dormiu em média 5h40 nos últimos 7 dias (5 noites registradas).');
    expect(s.action).toMatch(/Esta noite, tente apagar a luz 15 minutos mais cedo/);
  });
  it('menores de 18: texto próprio, faixa de 8 a 10 h (7h30 já é "curto" para eles, não para adultos)', () => {
    const samples = L(days('sleep_duration', [450, 450, 450]));
    expect(run({ samples, ageGroup: 'under18' }).suggestions.some((s) => s.id === 'sleep_short')).toBe(true);
    expect(run({ samples, ageGroup: '26-35' }).suggestions.some((s) => s.id === 'sleep_short')).toBe(false);
    expect(run({ samples, ageGroup: 'under18' }).suggestions[0]!.reason).toContain('8 a 10 horas');
  });
  it('horário de dormir irregular', () => {
    const r = run({ samples: L(days('sleep_duration', [450, 450, 450, 450]), days('bedtime', [1320, 60, 1380, 120])) });
    expect(r.suggestions.find((s) => s.id === 'sleep_irregular')!.reason).toMatch(/variou cerca de \d+h?/);
  });
  it('hidratação baixa: média de copos e meta', () => {
    const r = run({ samples: L(sample('water', 3, 0), sample('water', 4, -1), sample('water', 2, -2)), waterGoal: 8 });
    expect(r.suggestions.find((s) => s.id === 'hydration_low')!.reason).toBe('Nos últimos 7 dias você registrou em média 3 de 8 copos de água por dia.');
  });
  it('passos e exercício baixos', () => {
    const r = run({ samples: L(days('steps', [3200, 3300, 3100]), days('exercise_minutes', [10, 10, 10])) });
    const ids = r.suggestions.map((s) => s.id);
    expect(ids).toContain('steps_low'); // uma sugestão por categoria: ficam a de maior prioridade
    expect(r.suggestions.find((s) => s.category === 'activity')!.reason).toMatch(/passos por dia|exercício por semana/);
  });
  it('treinos do app abaixo de 3 dias; com objetivo de ganhar massa o texto muda', () => {
    const base = run({ sessions: sessionsOn([0]), goals: [] });
    expect(base.suggestions.find((s) => s.id === 'training_low')!.reason).toBe('Você treinou 1 dia nos últimos 7.');
    const muscle = run({ sessions: sessionsOn([0, -1]), goals: ['gain_muscle'] });
    expect(muscle.suggestions.find((s) => s.id === 'training_low')!.action).toMatch(/treino de força/);
  });
  it('FC em repouso acima da semana anterior vira só uma sugestão leve (sem alerta)', () => {
    const hr = L(days('resting_hr', [58, 58, 58, 58, 58, 58, 58, 64, 64, 64, 64, 64, 64, 64]));
    const r = run({ samples: hr });
    const s = r.suggestions.find((x) => x.id === 'recovery_hr')!;
    expect(s.reason).toBe('Sua frequência cardíaca em repouso ficou cerca de 6 bpm acima da semana anterior.');
    expect(s.action).toMatch(/treino mais leve/);
    expect(run({ samples: L(days('resting_hr', [58, 58, 58, 58, 58, 58, 58, 59, 59, 59, 59, 59, 59, 59])) }).suggestions.some((x) => x.id === 'recovery_hr')).toBe(false);
    expect(run({ samples: L(days('resting_hr', [58, 58, 64, 64])) }).suggestions.some((x) => x.id === 'recovery_hr')).toBe(false); // pouco dado
  });
  it('tudo em dia: mensagem positiva, sem inventar problema', () => {
    const ok = L(days('sleep_duration', [450, 450, 450]), days('steps', [9000, 9000, 9000]), sample('water', 8, 0), sample('water', 8, -1));
    const r = run({ samples: ok, sessions: sessionsOn([0, -1, -2]) });
    expect(r.suggestions).toHaveLength(1);
    expect(r.suggestions[0]).toMatchObject({ id: 'keep_going', category: 'general' });
  });
});

describe('limites e prioridades', () => {
  const muitos = L(days('sleep_duration', [300, 300, 300, 300]), days('bedtime', [1320, 60, 1380, 120]), sample('water', 1, 0), sample('water', 2, -1), days('steps', [1000, 1000, 1000]), days('exercise_minutes', [0, 0, 0]), days('resting_hr', [58, 58, 58, 58, 58, 58, 58, 66, 66, 66, 66, 66, 66, 66]));
  it('no máximo 3 sugestões, uma por categoria, sem repetir, cada uma com motivo e ação', () => {
    const r = run({ samples: muitos, sessions: sessionsOn([0]) });
    expect(r.suggestions.length).toBeLessThanOrEqual(3);
    expect(r.suggestions.length).toBeGreaterThanOrEqual(2);
    expect(new Set(r.suggestions.map((s) => s.category)).size).toBe(r.suggestions.length);
    for (const s of r.suggestions) {
      expect(s.reason).toMatch(/\d/); // o motivo traz um número da pessoa
      expect(s.action.length).toBeGreaterThan(20);
      expect(s.reason + s.action).not.toMatch(/\{\w+\}/); // nenhum marcador sem preencher
    }
    expect(C.MAX_SUGGESTIONS).toBe(3);
  });
  it('os objetivos mudam a ordem (ganhar massa puxa sono e treino; hábitos gerais puxam água e atividade)', () => {
    const base = { samples: L(days('sleep_duration', [400, 400, 400]), sample('water', 4, 0), sample('water', 4, -1)), sessions: sessionsOn([0]) };
    const musculo = run({ ...base, goals: ['gain_muscle'] }).suggestions.map((s) => s.category);
    const saude = run({ ...base, goals: ['health'] }).suggestions.map((s) => s.category);
    expect(musculo[0]).not.toBe('hydration');
    expect(saude.indexOf('hydration')).toBeLessThanOrEqual(musculo.indexOf('hydration') === -1 ? 99 : musculo.indexOf('hydration'));
  });
  it('mais de um objetivo é aceito e "emagrecer" é tratado como hábitos (sem falar de peso)', () => {
    const r = run({ samples: L(sample('water', 2, 0), sample('water', 2, -1)), goals: ['lose_weight', 'gain_muscle'] });
    expect(r.suggestions.length).toBeGreaterThan(0);
    expect(r.suggestions.map((s) => s.reason + s.action).join(' ')).not.toMatch(/peso|gordura|emagre/i);
  });
});

describe('sem dados suficientes', () => {
  it('diz que não há dados suficientes, sem sugerir nada', () => {
    const r = run({});
    expect(r).toEqual({ suggestions: [], insufficient: true, message: T.COACH_TEXTS.insufficient });
    expect(r.message).toMatch(/Ainda não há dados suficientes/);
  });
  it('1 ou 2 dias de passos/sono não bastam (limiar de 3), nem a água de um dia só vira regra errada', () => {
    expect(run({ samples: L(days('steps', [100, 100])) }).insufficient).toBe(true);
    expect(run({ samples: L(days('sleep_duration', [100, 100])) }).insufficient).toBe(true);
    expect(run({ samples: L(sample('water', 8, 0)) }).suggestions[0]!.id).toBe('keep_going'); // dado suficiente e em dia
  });
});

describe('under18: só hábitos', () => {
  it('nunca usa peso, composição nem metas, mesmo com esses dados no aparelho', () => {
    const samples = L(sample('weight', 60, -14), sample('weight', 66, -1), sample('body_fat', 30, -1), sample('lean_mass', 40, -1), days('sleep_duration', [400, 400, 400]), sample('water', 2, 0));
    const r = run({ samples, ageGroup: 'under18', goals: ['lose_weight'] });
    const text = r.suggestions.map((s) => s.reason + ' ' + s.action).join(' ');
    expect(text).not.toMatch(/peso|gordura|massa magra|composi|meta|kg/i);
    expect(r.suggestions.every((s) => ['sleep', 'hydration', 'activity', 'training', 'heart', 'general'].includes(s.category))).toBe(true);
  });
});

describe('arquivos', () => {
  it('o coach é puro (sem React Native, rede nem log) e não usa os dados de peso/gordura em nenhuma regra', () => {
    const src = readFileSync(path.join(REPO, 'src/utils/healthCoach.js'), 'utf8');
    expect(src).not.toMatch(/from\s+['"](react|expo|react-native)/);
    expect(src).not.toMatch(/fetch\(|XMLHttpRequest|console\./);
    expect(src.replace(/^\s*\/\/.*$/gm, '')).not.toMatch(/'weight'|'body_fat'|'lean_mass'/);
  });
  it('os textos são pt-BR e ficam todos no arquivo de textos (o coach só monta, não escreve frases)', () => {
    const src = readFileSync(path.join(REPO, 'src/utils/healthCoach.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toMatch(/'[^']*(você|Você|Esta noite|Faça)[^']*'/);
  });
});
