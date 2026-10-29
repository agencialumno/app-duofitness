// Série guiada (src/utils/guidedPlan.js): parser de texto livre, ajustes, troca de exercício,
// razões, etapas do "Montando" e selo "IA". O gerador (workoutGenerator.js) não é alterado.
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as G from '../../src/utils/guidedPlan.js';
// @ts-expect-error módulo JS do app, sem tipos
import { EXERCISE_DB, HIGH_IMPACT_IDS, LIMITATION_BLOCKED } from '../../src/utils/workoutGenerator.js';
// @ts-expect-error módulo JS do app, sem tipos
import { getComboEquipment } from '../../src/data/combosEquipment.js';

type Ex = { id: string; name: string; equipment: string; category: string; sets: number; rest: number; muscleGroup: string[] };
type Workout = { serie: string; exercises: Ex[]; generatedByAI: boolean };

const base = (over: Record<string, unknown> = {}) => ({
  ...G.defaultSettings({ weight: 70, height: 170, goals: ['health'], level: 'intermediate' }),
  combo: 'elite',
  limitation: 'none',
  time: 60,
  ...over,
});
const user = { gender: 'male', ageGroup: '26-35' };
const ids = (ws: Workout[]) => ws.flatMap((w) => w.exercises.map((e) => e.id));

describe('parseAdjustment (texto livre por palavras-chave)', () => {
  const types = (t: string) => G.parseAdjustment(t).actions.map((a: { type: string; value?: unknown }) => (a.value !== undefined ? `${a.type}:${a.value}` : a.type));

  it('chips de sugestão são entendidos', () => {
    expect(types('Mais glúteo')).toEqual(['more_glutes']);
    expect(types('Treino mais curto')).toEqual(['shorter']);
    expect(types('Evitar impacto')).toEqual(['avoid_impact']);
  });

  it('ignora acentos, maiúsculas e entende variações', () => {
    expect(types('QUERO MAIS GLUTEOS e bumbum')).toEqual(['more_glutes']);
    expect(types('sem pular, por favor')).toEqual(['avoid_impact']);
    expect(types('quero um treino mais rápido')).toEqual(['shorter']);
    expect(types('treino mais longo')).toEqual(['longer']);
  });

  it('entende vários pedidos numa frase só', () => {
    expect(types('mais glúteo e treino mais curto, sem impacto').sort()).toEqual(['avoid_impact', 'more_glutes', 'shorter']);
  });

  it('minutos explícitos viram o tempo disponível mais próximo; dias viram days', () => {
    expect(types('só tenho 35 minutos')).toEqual(['time:30']);
    expect(types('quero 50 min')).toEqual(['time:45']);
    expect(types('prefiro 2 dias por semana')).toEqual(['days:2']);
  });

  it('foco por região', () => {
    expect(types('mais perna')).toEqual(['focus:lower']);
    expect(types('foco em parte superior')).toEqual(['focus:upper']);
    expect(types('quero trabalhar abdômen')).toEqual(['focus:core']);
  });

  it('limitação só com contexto de dor ou cuidado ("mais ombro" não vira lesão)', () => {
    expect(types('estou com dor no joelho')).toEqual(['limitation:knee']);
    expect(types('cuidado com o ombro')).toEqual(['limitation:shoulder']);
    expect(types('dor na lombar')).toEqual(['limitation:back']);
    expect(types('mais ombro')).toEqual([]);
  });

  it('"menos glúteo" não reforça glúteo', () => {
    expect(types('menos glúteo')).toEqual([]);
  });

  it('não entendeu: understood false e nenhuma ação', () => {
    for (const t of ['', '   ', 'blablabla', 'quero ficar bonito', 'xyz 123']) {
      const r = G.parseAdjustment(t);
      expect(r.understood, t).toBe(false);
      expect(r.actions, t).toEqual([]);
    }
    expect(G.parseAdjustment(undefined).understood).toBe(false);
  });
});

describe('applyAdjustment', () => {
  it('aplica e descreve o que mudou, sem mutar o original', () => {
    const s = base();
    const r = G.applyAdjustment(s, G.parseAdjustment('mais glúteo, treino mais curto, evitar impacto').actions);
    expect(r.settings).toMatchObject({ extraGlutes: true, avoidImpact: true, time: 45 });
    expect(r.changed).toBe(true);
    expect(r.changes).toHaveLength(3);
    expect(s.time).toBe(60);
    expect(s.extraGlutes).toBe(false);
  });

  it('no limite diz que já está no mínimo, sem mudar', () => {
    const r = G.applyAdjustment(base({ time: 30 }), [{ type: 'shorter' }]);
    expect(r.changed).toBe(false);
    expect(r.settings.time).toBe(30);
    expect(r.notes[0]).toMatch(/mínimo/);
  });

  it('pedido repetido não conta como mudança', () => {
    const r = G.applyAdjustment(base({ avoidImpact: true }), [{ type: 'avoid_impact' }]);
    expect(r.changed).toBe(false);
  });
});

describe('generateGuidedPlan', () => {
  it('mesmo formato do gerador, sem selo de IA e sem tocar nos campos dos treinos', () => {
    const p = G.generateGuidedPlan(base(), user);
    expect(p.source).toBe('local');
    expect(p.workouts.map((w: Workout) => w.serie)).toEqual(['A', 'B', 'C']);
    for (const w of p.workouts as Workout[]) {
      expect(w.generatedByAI).toBe(false);
      expect(Object.keys(w).sort()).toEqual(['category', 'exercises', 'focus', 'generatedByAI', 'name', 'personalNotes', 'serie'].sort());
    }
    expect(p.imc).toBe('24.2');
  });

  it('só usa exercícios do combo escolhido', () => {
    const uno = new Set(getComboEquipment('uno'));
    const p = G.generateGuidedPlan(base({ combo: 'uno' }), user);
    for (const w of p.workouts as Workout[]) for (const e of w.exercises) expect(uno.has(e.equipment), e.id).toBe(true);
  });

  it('evitar impacto remove exercícios de impacto', () => {
    const withImpact = G.generateGuidedPlan(base({ goals: ['lose_weight'], time: 90 }), user);
    const without = G.generateGuidedPlan(base({ goals: ['lose_weight'], time: 90, avoidImpact: true }), user);
    expect(ids(without.workouts).some((i) => HIGH_IMPACT_IDS.includes(i))).toBe(false);
    expect(withImpact.workouts.length).toBe(without.workouts.length);
  });

  it('mais glúteo aumenta os glúteos e mantém o tamanho das séries', () => {
    const gluteIds = new Set((EXERCISE_DB.glutes as Ex[]).map((e) => e.id));
    const a = G.generateGuidedPlan(base(), user);
    const b = G.generateGuidedPlan(base({ extraGlutes: true }), user);
    const count = (p: { workouts: Workout[] }) => ids(p.workouts).filter((i) => gluteIds.has(i)).length;
    expect(count(b)).toBeGreaterThan(count(a));
    a.workouts.forEach((w: Workout, i: number) => expect(b.workouts[i].exercises.length).toBe(w.exercises.length));
  });

  it('mais glúteo respeita a limitação (joelho)', () => {
    const p = G.generateGuidedPlan(base({ limitation: 'knee', extraGlutes: true }), user);
    for (const i of ids(p.workouts)) expect(LIMITATION_BLOCKED.knee).not.toContain(i);
  });

  it('tempo menor reduz exercícios por série', () => {
    const long = G.generateGuidedPlan(base({ time: 90 }), user);
    const short = G.generateGuidedPlan(base({ time: 30 }), user);
    expect(Math.max(...short.workouts.map((w: Workout) => w.exercises.length))).toBeLessThan(Math.max(...long.workouts.map((w: Workout) => w.exercises.length)));
  });

  it('1 dia gera só a série A', () => {
    expect(G.generateGuidedPlan(base({ days: 1 }), user).workouts.map((w: Workout) => w.serie)).toEqual(['A']);
  });
});

describe('troca de exercício', () => {
  const settings = base({ combo: 'triple', limitation: 'knee' });
  const plan = G.generateGuidedPlan(settings, user);
  const first = (plan.workouts[0] as Workout).exercises.find((e) => e.category !== 'Cardio')!;

  it('alternativas: mesmo grupo, equipamento do combo, limitação respeitada, fora da série', () => {
    const alts = G.getAlternatives(plan.workouts, 0, first.id, settings, user) as Ex[];
    const group = G.findGroupKey(first.id);
    const combo = new Set(getComboEquipment('triple'));
    const inSerie = new Set((plan.workouts[0] as Workout).exercises.map((e) => e.id));
    for (const a of alts) {
      expect(G.findGroupKey(a.id)).toBe(group);
      expect(combo.has(a.equipment), a.id).toBe(true);
      expect(LIMITATION_BLOCKED.knee).not.toContain(a.id);
      expect(inSerie.has(a.id)).toBe(false);
      expect(a.id).not.toBe(first.id);
    }
  });

  it('troca mantém séries e descanso do que saiu, não mexe nas outras séries nem no original', () => {
    const slot = (plan.workouts[0] as Workout).exercises.findIndex((e) => e.category === 'Peito' || e.category === 'Costas' || e.category === 'Ombros');
    const target = (plan.workouts[0] as Workout).exercises[slot]!;
    const alts = G.getAlternatives(plan.workouts, 0, target.id, settings, user) as Ex[];
    if (alts.length === 0) return; // nenhum alternativo neste combo: nada a trocar
    const before = JSON.stringify(plan.workouts);
    const out = G.swapExercise(plan.workouts, 0, target.id, alts[0]!.id, settings, user) as Workout[];
    const swapped = out[0]!.exercises[slot]!;
    expect(swapped.id).toBe(alts[0]!.id);
    expect(swapped.sets).toBe(target.sets);
    expect(swapped.rest).toBe(target.rest);
    expect(out[0]!.exercises).toHaveLength((plan.workouts[0] as Workout).exercises.length);
    expect(out[1]).toBe(plan.workouts[1]);
    expect(JSON.stringify(plan.workouts)).toBe(before);
  });

  it('exercício que não é alternativa válida é recusado (devolve o mesmo plano)', () => {
    const forbidden = (LIMITATION_BLOCKED.knee as string[])[0];
    expect(G.swapExercise(plan.workouts, 0, first.id, forbidden, settings, user)).toBe(plan.workouts);
    expect(G.swapExercise(plan.workouts, 0, first.id, 'nao_existe', settings, user)).toBe(plan.workouts);
    expect(G.getAlternatives(plan.workouts, 9, first.id, settings, user)).toEqual([]);
  });

  it('há alternativa para pelo menos um exercício de cada série no combo completo', () => {
    const s = base({ combo: 'elite' });
    const p = G.generateGuidedPlan(s, user);
    p.workouts.forEach((w: Workout, i: number) => {
      const has = w.exercises.some((e) => G.getAlternatives(p.workouts, i, e.id, s, user).length > 0);
      expect(has, `série ${w.serie}`).toBe(true);
    });
  });
});

describe('razões e etapas (dados reais)', () => {
  it('3 a 4 razões, citando equipamento do combo e valores do plano', () => {
    const s = base({ combo: 'elite', goals: ['gain_muscle'], limitation: 'knee' });
    const p = G.generateGuidedPlan(s, user);
    const reasons = G.buildReasons(s, p, user) as string[];
    expect(reasons.length).toBeGreaterThanOrEqual(3);
    expect(reasons.length).toBeLessThanOrEqual(4);
    expect(reasons[0]).toMatch(/Usei .+ porque o seu combo ELITE tem /);
    expect(reasons.join(' ')).toMatch(/joelho/);
    expect(reasons.join(' ')).toMatch(/ganhar massa/);
    const maxSets = Math.max(...ids(p.workouts).length ? p.workouts.flatMap((w: Workout) => w.exercises.map((e) => e.sets)) : [0]);
    expect(reasons.join(' ')).toContain(`${maxSets} séries`);
  });

  it('a razão do equipamento cita um exercício que está mesmo no plano', () => {
    const s = base({ combo: 'prime' });
    const p = G.generateGuidedPlan(s, user);
    const names = p.workouts.flatMap((w: Workout) => w.exercises.map((e) => e.name));
    const m = (G.buildReasons(s, p, user) as string[])[0]!.match(/^Usei (.+) porque/);
    expect(names).toContain(m![1]);
  });

  it('combo UNO sem máquinas específicas ainda gera razões coerentes', () => {
    const s = base({ combo: 'uno', goals: ['lose_weight'] });
    const p = G.generateGuidedPlan(s, user);
    const reasons = G.buildReasons(s, p, user) as string[];
    expect(reasons.length).toBeGreaterThanOrEqual(3);
    expect(reasons.every((r: string) => r.length > 20)).toBe(true);
  });

  it('impacto vira razão quando evitado', () => {
    const s = base({ avoidImpact: true });
    expect((G.buildReasons(s, G.generateGuidedPlan(s, user), user) as string[]).join(' ')).toMatch(/impacto/);
  });

  it('5 etapas do "Montando", cada uma com número vindo do plano', () => {
    const s = base();
    const p = G.generateGuidedPlan(s, user);
    const steps = G.getPlanSteps(s, p, user) as { id: string; label: string; detail: string }[];
    expect(steps.map((x) => x.id)).toEqual(['profile', 'equipment', 'balance', 'goal', 'final']);
    const total = ids(p.workouts).length;
    expect(steps[4]!.detail).toBe(`${total} exercícios no total`);
    expect(steps[0]!.detail).toContain('IMC 24.2');
    expect(steps[1]!.label).toContain('ELITE');
    expect(steps[1]!.detail).toMatch(/^\d+ exercícios disponíveis/);
  });
});

describe('selo do plano', () => {
  it('"IA" só com flag, API configurada e série vinda da API', () => {
    const on = { source: 'ai', aiEnabled: true, apiConfigured: true };
    expect(G.getPlanBadge(on)).toBe('IA');
    expect(G.getPlanBadge({ ...on, aiEnabled: false })).toBeNull();
    expect(G.getPlanBadge({ ...on, apiConfigured: false })).toBeNull();
    expect(G.getPlanBadge({ ...on, source: 'local' })).toBeNull();
    expect(G.getPlanBadge()).toBeNull();
  });
  it('rótulo do gerador local', () => {
    expect(G.PLAN_LABEL).toBe('Personal Trainer Duo');
  });
});

describe('perfil', () => {
  it('campos faltando e medidas', () => {
    expect(G.missingProfileFields(G.getProfileDefaults({}))).toEqual(['weight', 'height', 'goals', 'level']);
    expect(G.missingProfileFields(G.getProfileDefaults({ weight: 70, height: 170, goals: ['health'], level: 'beginner' }))).toEqual([]);
    expect(G.parseMeasure('78,5', { min: 30, max: 300 })).toBe(78.5);
    expect(G.parseMeasure('abc', { min: 30, max: 300 })).toBeNull();
    expect(G.parseMeasure('900', { min: 30, max: 300 })).toBeNull();
  });
  it('chips do perfil mostram valores e deixam faltantes como null', () => {
    const chips = G.getProfileChips({ weight: 70, height: null, goals: ['gain_muscle'], level: 'beginner' });
    expect(chips.map((c: { value: string | null }) => c.value)).toEqual(['70 kg', null, 'Ganhar massa', 'Iniciante']);
  });
});
