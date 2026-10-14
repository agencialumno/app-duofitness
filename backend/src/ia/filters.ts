// Subconjunto do catálogo permitido para um usuário. Espelha as regras do app
// (workoutGenerator.js: filterByEquipment/Level/Limitation e imc.js:
// avoidHighImpact). Testes comparam com o app para não divergir.
import { CATALOG, COMBO_EQUIPMENT, LIMITATION_BLOCKED, type CatalogExercise } from './catalog.js';

export const COMBOS = ['uno', 'duo', 'triple', 'prime', 'elite'] as const;
export type Combo = (typeof COMBOS)[number];
export const LIMITATIONS = ['none', 'knee', 'shoulder', 'back'] as const;
export type Limitation = (typeof LIMITATIONS)[number];
export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type Level = (typeof LEVELS)[number];

// Exercícios de impacto: saem quando imc.js marca avoidHighImpact
// (menor de 18, 46+, obesidade). Regra só do servidor: o gerador offline do app
// ainda não filtra por isso.
export const HIGH_IMPACT_IDS = ['jumping_jack', 'burpee', 'high_knees'];

export type ImcCategory = 'underweight' | 'normal' | 'overweight' | 'obese1' | 'obese2';

// Mesmos cortes de getIMCCategory em src/utils/imc.js.
export function imcCategoryOf(weightKg?: number, heightCm?: number): ImcCategory | undefined {
  if (!weightKg || !heightCm) return undefined;
  const m = heightCm / 100;
  const imc = weightKg / (m * m);
  if (imc < 18.5) return 'underweight';
  if (imc < 25) return 'normal';
  if (imc < 30) return 'overweight';
  if (imc < 35) return 'obese1';
  return 'obese2';
}

export interface FilterContext {
  combo: Combo;
  level?: Level | undefined;
  limitation?: Limitation | undefined;
  ageGroup?: string | undefined;
  imcCategory?: ImcCategory | undefined;
}

export function avoidHighImpact(ctx: Pick<FilterContext, 'ageGroup' | 'imcCategory'>): boolean {
  return ctx.ageGroup === 'under18' || ctx.ageGroup === '46+' || ctx.imcCategory === 'obese1' || ctx.imcCategory === 'obese2';
}

export function allowedExercises(ctx: FilterContext): CatalogExercise[] {
  const equipment = COMBO_EQUIPMENT[ctx.combo] ?? ['bodyweight'];
  const blocked = new Set<string>(ctx.limitation && ctx.limitation !== 'none' ? (LIMITATION_BLOCKED[ctx.limitation] ?? []) : []);
  const noImpact = avoidHighImpact(ctx);

  return CATALOG.filter((ex) => {
    if (ex.equipment !== 'bodyweight' && !equipment.includes(ex.equipment)) return false;
    if (ctx.level === 'beginner' && ex.difficulty !== 'Iniciante') return false;
    if (blocked.has(ex.id)) return false;
    if (noImpact && HIGH_IMPACT_IDS.includes(ex.id)) return false;
    return true;
  });
}
