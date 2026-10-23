// Menores de 18: a categoria de IMC de adulto e o objetivo "Emagrecer" não mexem na série.
// Adultos: o wrapper (planForAge.js) é transparente, provado contra o gerador direto e por hash.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { getIMCRecommendations } from '../../src/utils/imc.js';
// @ts-expect-error módulo JS do app, sem tipos
import { generateWorkoutPlan, hydratePlan } from '../../src/utils/workoutGenerator.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as P from '../../src/utils/planForAge.js';
// @ts-expect-error módulo JS do app, sem tipos
import { COMBOS } from '../../src/data/combosEquipment.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as G from '../../src/utils/guidedPlan.js';

const REPO = path.resolve(__dirname, '../..');
const CATS = [undefined, 'underweight', 'normal', 'overweight', 'obese1', 'obese2'] as const;
const GOALS_ALL = ['lose_weight', 'gain_muscle', 'maintain', 'health'];
const GOAL_SETS: string[][] = [];
for (let m = 0; m < 16; m++) GOAL_SETS.push(GOALS_ALL.filter((_, i) => m & (1 << i)));
const GENDERS = [undefined, 'male', 'female'] as const;
const ADULT_AGES = [undefined, '18-25', '26-35', '36-45', '46+'] as const;
const elite = (COMBOS as { id: string; equipment: string[] }[]).find((c) => c.id === 'elite')!.equipment;

type Recs = { notes: string[] } & Record<string, unknown>;
const noNotes = (r: Recs) => { const { notes, ...rest } = r; void notes; return rest; };
const base = { level: 'beginner', days: 3, time: 60, equipment: elite, limitation: 'none' };
const gen = (p: Record<string, unknown>) => generateWorkoutPlan({ ...base, ...p }) as { exercises: { category: string; sets: number; rest: number; id: string }[]; personalNotes: string[] }[];
const strength = (w: { exercises: { id: string; category: string; sets: number; rest: number }[] }) => w.exercises.filter((e) => e.category !== 'Cardio');
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('adultos: nada muda', () => {
  it('hash das recomendações de adultos (5 faixas x 6 categorias x 16 objetivos x 3 sexos = 1440), pelo wrapper', () => {
    const out: unknown[] = [];
    for (const c of CATS) for (const g of GOAL_SETS) for (const s of GENDERS) for (const a of ADULT_AGES) {
      const viaWrapper = P.recommendationsForAge(c, g, s, a) as Recs;
      expect(viaWrapper).toEqual(getIMCRecommendations(c, g, s, a)); // idêntico, notas incluídas
      out.push([c, g, s, a, noNotes(viaWrapper)]);
    }
    expect(out).toHaveLength(1440);
    expect(createHash('sha256').update(JSON.stringify(out)).digest('hex')).toBe('6d039414c72740bf18e18e3691b2129bfa3ae5a23e6aa513348afe74cbc917b5');
  });

  it('adjustForAge devolve os mesmos valores (mesmas referências) para adultos', () => {
    for (const a of ADULT_AGES) {
      const goals = ['lose_weight'];
      const r = P.adjustForAge({ imcCategory: 'overweight', goals, ageGroup: a });
      expect(r.imcCategory).toBe('overweight');
      expect(r.goals).toBe(goals);
      expect(P.effectiveGoals(goals, a)).toBe(goals);
    }
  });

  it('o wrapper gera a MESMA série que o gerador direto (todos os combos, categorias, objetivos, níveis e sexos)', () => {
    let n = 0;
    for (const combo of COMBOS as { equipment: string[] }[]) {
      for (const imcCategory of CATS) for (const goals of [[], ['lose_weight'], ['gain_muscle', 'health'], ['maintain']]) {
        for (const ageGroup of ADULT_AGES) for (const gender of ['male', 'female']) {
          const p = { ...base, equipment: combo.equipment, imcCategory, goals, gender, ageGroup, level: n % 2 ? 'beginner' : 'advanced' };
          expect(JSON.stringify(P.generatePlanForAge(p))).toBe(JSON.stringify(generateWorkoutPlan(p)));
          n++;
        }
      }
    }
    expect(n).toBeGreaterThan(900);
  });

  it('hydratePlan: idêntico ao direto para adultos', () => {
    const plan = { series: [{ serie: 'A', name: 'A', focus: 'x', exercises: [{ id: 'bench_press', sets: 3, reps: '10', rest: 60 }, { id: 'squat', sets: 3, reps: '10', rest: 60 }] }] };
    for (const ageGroup of ADULT_AGES) for (const imcCategory of CATS) {
      const o = { goals: ['lose_weight'], gender: 'male', ageGroup, imcCategory };
      expect(JSON.stringify(P.hydratePlanForAge(plan, o))).toBe(JSON.stringify(hydratePlan(plan, o)));
    }
  });

  it('adulto com "Emagrecer" continua com cardio no início e descanso curto', () => {
    const w = gen({ goals: ['lose_weight'], imcCategory: 'normal', gender: 'male', ageGroup: '26-35' })[0]!;
    expect(w.exercises[0]!.category).toBe('Cardio');
    expect(Math.round(avg(strength(w).map((e) => e.rest)))).toBeLessThanOrEqual(45);
    expect(JSON.stringify(P.generatePlanForAge({ ...base, goals: ['lose_weight'], imcCategory: 'normal', gender: 'male', ageGroup: '26-35' }))).toBe(JSON.stringify(gen({ goals: ['lose_weight'], imcCategory: 'normal', gender: 'male', ageGroup: '26-35' })));
  });
});

describe('menores de 18', () => {
  it('"Emagrecer" vira "Saúde geral", sem duplicar; objetivos ausentes seguem ausentes', () => {
    expect(P.effectiveGoals(['lose_weight'], 'under18')).toEqual(['health']);
    expect(P.effectiveGoals(['lose_weight', 'health'], 'under18')).toEqual(['health']);
    expect(P.effectiveGoals(['lose_weight', 'gain_muscle'], 'under18')).toEqual(['health', 'gain_muscle']);
    expect(P.effectiveGoals('lose_weight', 'under18')).toEqual(['health']);
    expect(P.effectiveGoals(undefined, 'under18')).toBeUndefined();
    expect(P.effectiveGoals([], 'under18')).toEqual([]);
  });

  it('qualquer categoria de adulto = nenhuma categoria (recomendações iguais, notas incluídas), em todas as combinações', () => {
    let n = 0;
    for (const c of CATS) for (const g of GOAL_SETS) for (const s of GENDERS) {
      const semCategoria = P.recommendationsForAge(undefined, g, s, 'under18');
      expect(P.recommendationsForAge(c, g, s, 'under18'), `${c}/${g.join('+')}/${s}`).toEqual(semCategoria);
      n++;
    }
    expect(n).toBe(288);
  });

  it('"Emagrecer" = "Saúde geral" nas recomendações de menores (sem cardio no início, sem descanso de 45 s)', () => {
    for (const c of CATS) for (const s of GENDERS) {
      const r = P.recommendationsForAge(c, ['lose_weight'], s, 'under18') as Recs;
      expect(r).toEqual(P.recommendationsForAge(c, ['health'], s, 'under18'));
      expect(r.cardioFirst).toBe(false);
      expect(r.restBetweenSets as number).toBeGreaterThan(45);
      expect(r.avoidHighImpact).toBe(true);
      expect(r.setsMultiplier as number).toBeLessThanOrEqual(0.9);
    }
  });

  it('as séries geradas de menores não dependem da categoria (todos os combos)', () => {
    for (const combo of COMBOS as { equipment: string[] }[]) {
      for (const goals of [[], ['health'], ['gain_muscle'], ['lose_weight']]) {
        const p = { ...base, equipment: combo.equipment, goals, gender: 'male', ageGroup: 'under18' };
        const ref = JSON.stringify(P.generatePlanForAge({ ...p, imcCategory: undefined }));
        for (const c of CATS) expect(JSON.stringify(P.generatePlanForAge({ ...p, imcCategory: c })), `${c}/${goals}`).toBe(ref);
      }
    }
  });

  it('série de menor com "Emagrecer": sem cardio no início, descanso igual ao de "Saúde geral", sem impacto', () => {
    for (const c of CATS) {
      const lose = P.generatePlanForAge({ ...base, goals: ['lose_weight'], imcCategory: c, gender: 'female', ageGroup: 'under18' }) as ReturnType<typeof gen>;
      const health = P.generatePlanForAge({ ...base, goals: ['health'], imcCategory: c, gender: 'female', ageGroup: 'under18' }) as ReturnType<typeof gen>;
      for (const w of lose) expect(w.exercises[0]!.category).not.toBe('Cardio');
      expect(lose.map((w) => strength(w).map((e) => [e.id, e.sets, e.rest]))).toEqual(health.map((w) => strength(w).map((e) => [e.id, e.sets, e.rest])));
      expect(Math.round(avg(strength(lose[0]!).map((e) => e.rest)))).toBeGreaterThan(45);
      expect(lose.flatMap((w) => w.personalNotes).join(' ')).not.toMatch(/10min de cardio|menos descanso/);
    }
  });

  it('o que NÃO é categoria de IMC segue valendo para menores (volume leve, sem impacto, nota de supervisão)', () => {
    const r = P.recommendationsForAge('obese2', ['gain_muscle'], 'male', 'under18') as Recs;
    expect(r.setsMultiplier).toBe(0.9);
    expect(r.avoidHighImpact).toBe(true);
    expect(r.notes.join(' ')).toMatch(/supervisão de um adulto/);
    // e as notas de faixa de adulto não aparecem
    expect(r.notes.join(' ')).not.toMatch(/alto impacto nas articulações|movimentos controlados|exercícios compostos/);
  });

  it('hydratePlan de menores ignora a categoria e trata "Emagrecer" como "Saúde geral"', () => {
    const plan = { series: [{ serie: 'A', name: 'A', focus: 'x', exercises: [{ id: 'bench_press', sets: 3, reps: '10', rest: 60 }, { id: 'squat', sets: 3, reps: '10', rest: 60 }] }] };
    const ref = JSON.stringify(P.hydratePlanForAge(plan, { goals: ['health'], gender: 'male', ageGroup: 'under18' }));
    for (const c of CATS) expect(JSON.stringify(P.hydratePlanForAge(plan, { goals: ['lose_weight'], gender: 'male', ageGroup: 'under18', imcCategory: c }))).toBe(ref);
  });

  it('a série guiada de menores também (peso/altura de sobrepeso e obesidade de adulto não mudam nada)', () => {
    const user = { gender: 'male', ageGroup: 'under18' };
    const mk = (weight: number, goals: string[]) => ({ ...G.defaultSettings({ ...user, goals, level: 'beginner', weight, height: 170 }), combo: 'elite', goals, weight, height: 170, days: 3, time: 60 });
    const sig = (s: unknown) => JSON.stringify((G.generateGuidedPlan(s, user) as { workouts: unknown }).workouts);
    for (const goals of [['lose_weight'], ['health']]) {
      const ref = sig(mk(60, goals)); // 20,8: normal
      for (const peso of [45, 75, 90, 110]) expect(sig(mk(peso, goals)), `${peso} kg`).toBe(ref);
    }
    expect(sig(mk(75, ['lose_weight']))).toBe(sig(mk(75, ['health'])));
  });

  it('as razões do guiado de menores não falam em cardio nem em descanso curto por "Emagrecer"', () => {
    const user = { gender: 'female', ageGroup: 'under18' };
    const s = { ...G.defaultSettings({ ...user, goals: ['lose_weight'], level: 'beginner', weight: 80, height: 165 }), combo: 'elite', goals: ['lose_weight'], weight: 80, height: 165, days: 3, time: 60 };
    const plan = G.generateGuidedPlan(s, user);
    const text = (G.buildReasons(s, plan, user) as string[]).join(' | ');
    expect(text).not.toMatch(/comecei com cardio|deixei o descanso curto|Pelo objetivo que você escolheu/);
  });
});

describe('um ponto central: o app só chama o gerador pelo planForAge', () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
    const full = path.join(dir, f);
    return statSync(full).isDirectory() ? walk(full) : /\.js$/.test(f) ? [full] : [];
  });
  it('nenhum arquivo de src/ (fora do próprio planForAge, do gerador e do imc) usa generateWorkoutPlan/hydratePlan/getIMCRecommendations', () => {
    const allowed = new Set(['planForAge.js', 'workoutGenerator.js', 'imc.js']);
    const offenders = walk(path.join(REPO, 'src')).filter((f) => !allowed.has(path.basename(f)))
      .filter((f) => /\b(generateWorkoutPlan|hydratePlan|getIMCRecommendations)\s*[(,}]|import[^;]*\b(generateWorkoutPlan|hydratePlan|getIMCRecommendations)\b/.test(readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '')));
    expect(offenders.map((f) => path.relative(REPO, f))).toEqual([]);
  });
  it('workoutGenerator.js e imc.js não foram editados por esta mudança (lógica intacta)', () => {
    expect(readFileSync(path.join(REPO, 'src/utils/workoutGenerator.js'), 'utf8')).not.toMatch(/planForAge/);
    expect(readFileSync(path.join(REPO, 'src/utils/imc.js'), 'utf8')).not.toMatch(/planForAge/);
  });
});
