// Garante que o backend não diverge do app: catálogo (sync), filtros e IMC.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { COMBOS as APP_COMBOS } from '../../src/data/combosEquipment.js';
// @ts-expect-error módulo JS do app, sem tipos
import { getIMCCategory } from '../../src/utils/imc.js';
// @ts-expect-error módulo JS do app, sem tipos
import { EXERCISE_DB, filterByEquipment, filterByLevel, filterByLimitation } from '../../src/utils/workoutGenerator.js';
import { renderCatalog, CATALOG_PATH } from '../scripts/render-catalog.js';
import { CATALOG } from '../src/ia/catalog.js';
import { allowedExercises, COMBOS, LEVELS, LIMITATIONS, imcCategoryOf } from '../src/ia/filters.js';
import { APP_VERSION } from '../src/version.js';

describe('catalog.ts x app', () => {
  it('está em dia com o app (rode "npm run sync-catalog" se falhar)', () => {
    const current = readFileSync(CATALOG_PATH, 'utf8').replace(/\r\n/g, '\n');
    expect(current).toBe(renderCatalog());
  });

  it('tem todos os exercícios do EXERCISE_DB', () => {
    const appIds = (Object.values(EXERCISE_DB) as { id: string }[][]).flat().map((e) => e.id).sort();
    expect(CATALOG.map((e) => e.id).sort()).toEqual(appIds);
  });

  it('cobre os mesmos combos do app', () => {
    expect([...COMBOS].sort()).toEqual((APP_COMBOS as { id: string }[]).map((c) => c.id).sort());
  });
});

describe('allowedExercises x filtros do app', () => {
  const appAll = (Object.values(EXERCISE_DB) as { id: string }[][]).flat();

  for (const combo of APP_COMBOS as { id: string; equipment: string[] }[]) {
    for (const level of LEVELS) {
      for (const limitation of LIMITATIONS) {
        it(`${combo.id} / ${level} / ${limitation}`, () => {
          let expected = filterByEquipment(appAll, combo.equipment);
          expected = filterByLevel(expected, level);
          expected = filterByLimitation(expected, limitation);
          const got = allowedExercises({ combo: combo.id as (typeof COMBOS)[number], level, limitation });
          expect(got.map((e) => e.id).sort()).toEqual((expected as { id: string }[]).map((e) => e.id).sort());
        });
      }
    }
  }
});

describe('regras extras do servidor', () => {
  it('menor de 18, 46+ e obesidade tiram exercícios de impacto', () => {
    const ids = (ctx: Parameters<typeof allowedExercises>[0]) => allowedExercises(ctx).map((e) => e.id);
    for (const ctx of [{ ageGroup: 'under18' }, { ageGroup: '46+' }, { imcCategory: 'obese1' as const }]) {
      const got = ids({ combo: 'elite', ...ctx });
      for (const id of ['jumping_jack', 'burpee', 'high_knees']) expect(got).not.toContain(id);
    }
    expect(ids({ combo: 'elite', ageGroup: '26-35' })).toContain('burpee');
  });

  it('imcCategoryOf usa os mesmos cortes de getIMCCategory', () => {
    for (const [w, h] of [[50, 180], [70, 175], [85, 175], [100, 175], [140, 170]] as const) {
      const imc = w / (h / 100) ** 2;
      expect(imcCategoryOf(w, h)).toBe(getIMCCategory(imc).id);
    }
  });
});

describe('versão', () => {
  it('APP_VERSION igual ao package.json', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(APP_VERSION).toBe(pkg.version);
  });
});
