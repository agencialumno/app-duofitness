// hydratePlan (src/utils/workoutGenerator.js, no app) contra o catálogo do backend.
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { EXERCISE_DB, generateWorkoutPlan, hydratePlan } from '../../src/utils/workoutGenerator.js';
import { CATALOG } from '../src/ia/catalog.js';

type AppExercise = { id: string; name: string; instructions: string[]; tips: string; sets: number; reps: string; rest: number; category: string };
const byId = Object.fromEntries((Object.values(EXERCISE_DB) as AppExercise[][]).flat().map((e) => [e.id, e]));

describe('hydratePlan', () => {
  it('hidrata todos os ids do catálogo com os dados completos do app', () => {
    const plan = {
      series: [
        {
          serie: 'A',
          name: 'Série A — Teste',
          focus: 'Teste',
          exercises: CATALOG.map((e) => ({ id: e.id, sets: 2, reps: '8', rest: 40 })),
        },
      ],
    };
    const [a] = hydratePlan(plan, { goals: ['health'] });
    expect(a.exercises).toHaveLength(CATALOG.length);
    for (const ex of a.exercises) {
      const base = byId[ex.id]!;
      expect(ex.name).toBe(base.name);
      expect(ex.instructions).toEqual(base.instructions);
      expect(ex.tips).toBe(base.tips);
      expect([ex.sets, ex.reps, ex.rest]).toEqual([2, '8', 40]);
    }
  });

  it('ignora ids desconhecidos e mantém ordem', () => {
    const [a] = hydratePlan({ series: [{ serie: 'A', name: 'A', focus: 'F', exercises: [{ id: 'squat', sets: 3, reps: '10', rest: 60 }, { id: 'nao_existe', sets: 3, reps: '10', rest: 60 }, { id: 'plank', sets: 3, reps: '30s', rest: 45 }] }] });
    expect(a.exercises.map((e: { id: string }) => e.id)).toEqual(['squat', 'plank']);
  });

  it('devolve o mesmo formato de generateWorkoutPlan', () => {
    const generated = generateWorkoutPlan({ goals: ['health'], level: 'intermediate', days: 3, time: 45, equipment: ['bodyweight'], limitation: 'none', imcCategory: 'normal' });
    const hydrated = hydratePlan({ series: [{ serie: 'A', name: 'A', focus: 'F', exercises: [{ id: 'squat', sets: 3, reps: '10', rest: 60 }] }] }, { goals: ['health'], imcCategory: 'normal' });
    expect(Object.keys(hydrated[0]).sort()).toEqual(Object.keys(generated[0]).sort());
    expect(hydrated[0].category).toBe('Pernas');
    expect(hydrated[0].personalNotes.length).toBeGreaterThan(0);
  });

  it('plano vazio ou ausente vira lista vazia', () => {
    expect(hydratePlan({ series: [] })).toEqual([]);
    expect(hydratePlan(undefined)).toEqual([]);
  });
});
