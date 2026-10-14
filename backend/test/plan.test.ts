import { describe, expect, it } from 'vitest';
import { allowedExercises } from '../src/ia/filters.js';
import { validatePlan } from '../src/ia/plan.js';
import { validToolInput } from './helpers.js';

const ctx = { combo: 'elite' as const, limitation: 'none' as const };

describe('validatePlan', () => {
  it('aceita plano válido', () => {
    const r = validatePlan(validToolInput(ctx), ctx);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.plan.series).toHaveLength(3);
      expect(r.collected.weight).toBe(78);
    }
  });

  it('rejeita estrutura inválida', () => {
    expect(validatePlan({ series: 'x' }, ctx).ok).toBe(false);
    expect(validatePlan(null, ctx).ok).toBe(false);
    expect(validatePlan({ series: [] }, ctx).ok).toBe(false);
  });

  it('descarta ids fora do subconjunto (combo UNO não tem leg_press_ex) e rejeita se sobrar menos de 5', () => {
    const uno = { combo: 'uno' as const, limitation: 'none' as const };
    const input = validToolInput(ctx, 6);
    input.series = [input.series[0]!];
    input.series[0]!.exercises = [
      ...input.series[0]!.exercises.slice(0, 4).map(() => ({ id: 'leg_press_ex', sets: 3, reps: '10', rest: 60 })),
      { id: 'squat', sets: 3, reps: '10', rest: 60 },
    ];
    const r = validatePlan(input, uno);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/série A/);
  });

  it('descarta ids bloqueados pela limitação e mantém o plano se restarem 5+', () => {
    const knee = { combo: 'elite' as const, limitation: 'knee' as const };
    const allowed = allowedExercises(knee).map((e) => e.id);
    const exercises = [...allowed.slice(0, 5), 'squat', 'lunge'].map((id) => ({ id, sets: 3, reps: '10', rest: 60 }));
    const r = validatePlan({ series: [{ serie: 'A', name: 'A', focus: 'F', exercises }] }, knee);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.discarded).toBe(2);
      expect(r.plan.series[0]!.exercises.map((e) => e.id)).not.toContain('squat');
    }
  });

  it('usa o IMC coletado na conversa para tirar exercícios de impacto', () => {
    const base = { combo: 'elite' as const, limitation: 'none' as const };
    const ids = allowedExercises(base).map((e) => e.id);
    const withBurpee = ['burpee', ...ids.filter((i) => i !== 'burpee').slice(0, 5)];
    const exercises = withBurpee.map((id) => ({ id, sets: 3, reps: '10', rest: 60 }));
    const obese = validatePlan({ perfil: { weight: 130, height: 170 }, series: [{ serie: 'A', name: 'A', focus: 'F', exercises }] }, base);
    expect(obese.ok && obese.discarded).toBe(1);
    const normal = validatePlan({ perfil: { weight: 70, height: 175 }, series: [{ serie: 'A', name: 'A', focus: 'F', exercises }] }, base);
    expect(normal.ok && normal.discarded).toBe(0);
  });

  it('descarta números fora dos limites (sets 1–6, rest 0–180, reps curta)', () => {
    const ids = allowedExercises(ctx).map((e) => e.id);
    const good = ids.slice(0, 5).map((id) => ({ id, sets: 3, reps: '10', rest: 60 }));
    const bad = [
      { id: ids[5], sets: 9, reps: '10', rest: 60 },
      { id: ids[6], sets: 3, reps: '10', rest: 500 },
      { id: ids[7], sets: 3, reps: 'x'.repeat(40), rest: 60 },
      { id: ids[8], sets: 0, reps: '10', rest: 60 },
    ];
    const r = validatePlan({ series: [{ serie: 'A', name: 'A', focus: 'F', exercises: [...good, ...bad] }] }, ctx);
    expect(r.ok && r.discarded).toBe(4);
  });

  it('descarta id repetido na mesma série', () => {
    const ids = allowedExercises(ctx).map((e) => e.id);
    const ex = [...ids.slice(0, 5), ids[0]!].map((id) => ({ id, sets: 3, reps: '10', rest: 60 }));
    const r = validatePlan({ series: [{ serie: 'A', name: 'A', focus: 'F', exercises: ex }] }, ctx);
    expect(r.ok && r.discarded).toBe(1);
  });

  it('rejeita série repetida', () => {
    const input = validToolInput(ctx);
    input.series[1]!.serie = 'A';
    expect(validatePlan(input, ctx).ok).toBe(false);
  });

  it('devolve o que foi coletado quando rejeita (fallback para o app)', () => {
    const input = validToolInput(ctx);
    input.series[0]!.exercises = input.series[0]!.exercises.slice(0, 2);
    const r = validatePlan(input, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.collected).toMatchObject({ days: 3, time: 45 });
  });
});
