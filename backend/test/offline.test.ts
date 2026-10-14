// Regra de impacto (avoidHighImpact) no gerador offline do app e paridade com o servidor.
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { getIMCRecommendations } from '../../src/utils/imc.js';
// @ts-expect-error módulo JS do app, sem tipos
import { generateWorkoutPlan, HIGH_IMPACT_IDS as APP_HIGH_IMPACT } from '../../src/utils/workoutGenerator.js';
import { HIGH_IMPACT_IDS } from '../src/ia/catalog.js';
import { avoidHighImpact, type ImcCategory } from '../src/ia/filters.js';

const ALL_EQUIPMENT = ['bodyweight', 'dumbbells', 'barbell', 'bench', 'cable', 'cardio_machine', 'smith', 'leg_machine', 'leg_press', 'chest_back_machine', 'glute_machine', 'shoulder_machine', 'lat_pulldown', 'hip_machine'];

function idsOf(plan: { exercises: { id: string }[] }[]): string[] {
  return plan.flatMap((s) => s.exercises.map((e) => e.id));
}

function generate(over: Record<string, unknown>) {
  return generateWorkoutPlan({
    goals: ['lose_weight'], // faz o cardio entrar no início das séries
    level: 'intermediate',
    days: 3,
    time: 90,
    equipment: ALL_EQUIPMENT,
    limitation: 'none',
    imcCategory: 'normal',
    gender: 'male',
    ageGroup: '26-35',
    ...over,
  });
}

describe('lista de exercícios de impacto', () => {
  it('é a mesma no app e no catálogo do backend (lista única)', () => {
    expect(HIGH_IMPACT_IDS).toEqual(APP_HIGH_IMPACT);
  });
});

describe('gerador offline: avoidHighImpact', () => {
  it('perfil de controle (26-35, IMC normal) ainda recebe exercício de impacto', () => {
    const ids = idsOf(generate({}));
    expect(ids.some((id) => (APP_HIGH_IMPACT as string[]).includes(id))).toBe(true);
  });

  const profiles: [string, Record<string, unknown>][] = [
    ['menor de 18', { ageGroup: 'under18' }],
    ['46+', { ageGroup: '46+' }],
    ['obesidade grau I', { imcCategory: 'obese1' }],
    ['obesidade grau II', { imcCategory: 'obese2' }],
  ];

  for (const [name, over] of profiles) {
    it(`${name}: nenhuma série tem polichinelo, burpee ou corrida estacionária`, () => {
      const plan = generate(over);
      expect(plan.length).toBeGreaterThan(0);
      const ids = idsOf(plan);
      for (const id of APP_HIGH_IMPACT as string[]) expect(ids).not.toContain(id);
      // o plano continua completo: o cardio inicial é trocado por uma opção de baixo impacto
      for (const serie of plan) expect(serie.exercises.length).toBeGreaterThanOrEqual(5);
    });
  }

  it('também vale para plano só com peso do corpo', () => {
    const ids = idsOf(generate({ ageGroup: 'under18', equipment: ['bodyweight'], focus: 'core' }));
    for (const id of APP_HIGH_IMPACT as string[]) expect(ids).not.toContain(id);
  });
});

describe('servidor x imc.js', () => {
  const ages = [undefined, 'under18', '18-25', '26-35', '36-45', '46+'];
  const cats: ImcCategory[] = ['underweight', 'normal', 'overweight', 'obese1', 'obese2'];
  for (const ageGroup of ages) {
    for (const imcCategory of cats) {
      it(`avoidHighImpact igual ao app: ${ageGroup ?? 'sem idade'} / ${imcCategory}`, () => {
        const app = getIMCRecommendations(imcCategory, ['health'], 'male', ageGroup).avoidHighImpact;
        expect(avoidHighImpact({ ageGroup, imcCategory })).toBe(app);
      });
    }
  }
});
