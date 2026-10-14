// Renderiza o conteúdo de src/ia/catalog.ts a partir do app (src/utils/workoutGenerator.js e
// src/data/combosEquipment.js), para o backend usar exatamente o mesmo catálogo
// de exercícios, combos e bloqueios por limitação.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error módulo JS do app, sem tipos
import { EXERCISE_DB, HIGH_IMPACT_IDS, LIMITATION_BLOCKED } from '../../src/utils/workoutGenerator.js';
// @ts-expect-error módulo JS do app, sem tipos
import { COMBOS } from '../../src/data/combosEquipment.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const CATALOG_PATH = path.join(here, '..', 'src', 'ia', 'catalog.ts');

interface RawExercise {
  id: string;
  name: string;
  category: string;
  equipment: string;
  difficulty: string;
  sets: number;
  reps: string;
  rest: number;
  isTime?: boolean;
}

export function renderCatalog(): string {
  const exercises: RawExercise[] = [];
  for (const list of Object.values(EXERCISE_DB) as RawExercise[][]) {
    for (const ex of list) {
      exercises.push({
        id: ex.id,
        name: ex.name,
        category: ex.category,
        equipment: ex.equipment,
        difficulty: ex.difficulty,
        sets: ex.sets,
        reps: ex.reps,
        rest: ex.rest,
        ...(ex.isTime ? { isTime: true } : {}),
      });
    }
  }
  const comboEquipment: Record<string, string[]> = {};
  for (const c of COMBOS as { id: string; equipment: string[] }[]) comboEquipment[c.id] = c.equipment;

  return `// GERADO por scripts/sync-catalog.ts a partir do app. NÃO EDITE À MÃO.
// Rode "npm run sync-catalog" depois de mudar src/utils/workoutGenerator.js
// ou src/data/combosEquipment.js. O CI roda "npm run check-catalog".

export interface CatalogExercise {
  id: string;
  name: string;
  category: string;
  equipment: string;
  difficulty: string;
  sets: number;
  reps: string;
  rest: number;
  isTime?: boolean;
}

export const CATALOG: CatalogExercise[] = ${JSON.stringify(exercises, null, 2)};

export const COMBO_EQUIPMENT: Record<string, string[]> = ${JSON.stringify(comboEquipment, null, 2)};

export const LIMITATION_BLOCKED: Record<string, string[]> = ${JSON.stringify(LIMITATION_BLOCKED, null, 2)};

// Exercícios de impacto, removidos para menor de 18, 46+ e obesidade (avoidHighImpact).
export const HIGH_IMPACT_IDS: string[] = ${JSON.stringify(HIGH_IMPACT_IDS, null, 2)};
`;
}

