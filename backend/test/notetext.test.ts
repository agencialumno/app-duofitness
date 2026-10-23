// Notas antigas já salvas: na exibição a frase antiga vira a nova (exata), sem alterar o dado salvo e sem migração.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { LEGACY_NOTES, displayNote, displayNotes } from '../../src/utils/noteText.js';
// @ts-expect-error módulo JS do app, sem tipos
import { getIMCRecommendations } from '../../src/utils/imc.js';
import { PROIBIDOS_NOTAS } from './textrules';

const REPO = path.resolve(__dirname, '../..');
const DEFICIT_ANTIGO = 'Déficit calórico + treino = resultado mais rápido';
const DEFICIT_NOVO = 'Treinar com regularidade e dormir bem ajudam mais do que intensidade pontual';

describe('exibição de notas antigas', () => {
  it('a frase do déficit calórico vira a nova, exatamente', () => {
    expect(displayNote(DEFICIT_ANTIGO)).toBe(DEFICIT_NOVO);
  });

  it('as 6 frases reescritas têm correspondência, e o texto exibido nunca contém termo proibido', () => {
    expect(Object.keys(LEGACY_NOTES)).toHaveLength(6);
    for (const [antigo, novo] of Object.entries(LEGACY_NOTES) as [string, string][]) {
      expect(displayNote(antigo)).toBe(novo);
      expect(PROIBIDOS_NOTAS.test(novo), novo).toBe(false);
      expect(novo).not.toBe(antigo);
    }
  });

  it('só troca frase EXATA: variações, outra caixa, espaços e frases novas ficam como estão', () => {
    expect(displayNote(`${DEFICIT_ANTIGO}.`)).toBe(`${DEFICIT_ANTIGO}.`);
    expect(displayNote(` ${DEFICIT_ANTIGO}`)).toBe(` ${DEFICIT_ANTIGO}`);
    expect(displayNote(DEFICIT_ANTIGO.toLowerCase())).toBe(DEFICIT_ANTIGO.toLowerCase());
    expect(displayNote('Progrida a carga a cada 2 semanas')).toBe('Progrida a carga a cada 2 semanas');
    expect(displayNote(DEFICIT_NOVO)).toBe(DEFICIT_NOVO);
  });

  it('entradas estranhas não quebram (null, número, objeto, propriedades herdadas)', () => {
    expect(displayNote(null)).toBeNull();
    expect(displayNote(undefined)).toBeUndefined();
    expect(displayNote(42)).toBe(42);
    expect(displayNote('toString')).toBe('toString');
    expect(displayNote('__proto__')).toBe('__proto__');
    expect(displayNotes(undefined)).toEqual([]);
    expect(displayNotes('texto')).toEqual([]);
    expect(displayNotes([])).toEqual([]);
  });

  it('série já salva: exibe a frase nova SEM alterar o dado salvo (sem migração)', () => {
    const salva = {
      id: 'w1', serie: 'A', name: 'Série A', exercises: [],
      personalNotes: ['Inicie cada sessão com 10min de cardio leve', DEFICIT_ANTIGO, 'Progrida a carga a cada 2 semanas'],
    };
    const json = JSON.stringify(salva); // como está gravada em @duo_workouts
    const exibidas = displayNotes(salva.personalNotes);
    expect(exibidas).toEqual(['Inicie cada sessão com 10min de cardio leve', DEFICIT_NOVO, 'Progrida a carga a cada 2 semanas']);
    expect(JSON.stringify(salva)).toBe(json); // o objeto salvo continua com a frase antiga
    expect(salva.personalNotes[1]).toBe(DEFICIT_ANTIGO);
    expect(exibidas).not.toBe(salva.personalNotes); // lista nova, a original não é reaproveitada
  });

  it('ao exibir um JSON antigo lido do armazenamento, nada é regravado: o helper não usa armazenamento', () => {
    const src = readFileSync(path.join(REPO, 'src/utils/noteText.js'), 'utf8');
    expect(src).not.toMatch(/AsyncStorage|setItem|localStorage|import /);
  });
});

describe('fiação', () => {
  const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
  it('o gerador rápido exibe as notas pelo helper (e é o único lugar que exibe personalNotes hoje)', () => {
    expect(read('src/screens/SmartPlanScreen.js')).toMatch(/displayNotes\(plan\[0\]\.personalNotes\)\.map/);
    // qualquer tela nova que exiba personalNotes precisa passar pelo helper
    const fs = require('node:fs') as typeof import('node:fs');
    const walk = (d: string, out: string[] = []): string[] => {
      for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) walk(p, out); else if (/\.js$/.test(f)) out.push(p);
      }
      return out;
    };
    for (const f of walk(path.join(REPO, 'src/screens')).concat(walk(path.join(REPO, 'src/components')))) {
      const src = fs.readFileSync(f, 'utf8');
      if (/\.personalNotes/.test(src)) expect(src, path.relative(REPO, f)).toMatch(/displayNotes\(/);
    }
  });

  it('o gerador atual já nunca produz as frases antigas (a troca na exibição só vale para dados salvos)', () => {
    const antigas = new Set(Object.keys(LEGACY_NOTES));
    for (const c of [undefined, 'underweight', 'normal', 'overweight', 'obese1', 'obese2']) {
      for (const g of [[], ['lose_weight'], ['gain_muscle', 'health']]) {
        for (const s of [undefined, 'male', 'female']) {
          for (const a of [undefined, 'under18', '18-25', '46+']) {
            for (const n of (getIMCRecommendations(c, g, s, a) as { notes: string[] }).notes) expect(antigas.has(n), n).toBe(false);
          }
        }
      }
    }
  });
});
