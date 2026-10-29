// Textos de notes e dicas: nada de dieta, déficit, caloria, emagrecimento, dose, suplemento, "resultado mais rápido"
// nem promessa de resultado. Varre as notes de imc.js em TODAS as combinações de IMC, objetivo, sexo e faixa
// etária, as dicas de cada faixa, as séries geradas, as séries de exemplo do demo e os textos de apoio das telas.
// Também garante que a LÓGICA de imc.js (faixas, multiplicadores, descanso...) não mudou com a troca de textos.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { getIMCCategory, getIMCRecommendations } from '../../src/utils/imc.js';
// @ts-expect-error módulo JS do app, sem tipos
import { EXERCISE_DB, generateWorkoutPlan } from '../../src/utils/workoutGenerator.js';
// @ts-expect-error módulo JS do app, sem tipos
import { DEMO_WORKOUTS } from './helpers/demoData.js';
import { PROIBIDOS_NOTAS, PROIBIDOS_NUCLEO } from './textrules';
// @ts-expect-error módulo JS do app, sem tipos
import { COMBOS } from '../../src/data/combosEquipment.js';

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');

const CATS = [undefined, 'underweight', 'normal', 'overweight', 'obese1', 'obese2'] as const;
const GOALS_ALL = ['lose_weight', 'gain_muscle', 'maintain', 'health'];
const GOAL_SETS: string[][] = [];
for (let m = 0; m < 16; m++) GOAL_SETS.push(GOALS_ALL.filter((_, i) => m & (1 << i)));
const GENDERS = [undefined, 'male', 'female'] as const;
const AGES = [undefined, 'under18', '18-25', '26-35', '36-45', '46+'] as const;

describe('scanner: as notes de imc.js em todas as combinações', () => {
  it('1728 combinações (6 faixas x 16 conjuntos de objetivos x 3 sexos x 6 faixas etárias) sem termo proibido', () => {
    let combos = 0;
    const seen = new Set<string>();
    for (const c of CATS) for (const g of GOAL_SETS) for (const s of GENDERS) for (const a of AGES) {
      combos++;
      const { notes } = getIMCRecommendations(c, g, s, a) as { notes: string[] };
      for (const n of notes) {
        seen.add(n);
        expect(PROIBIDOS_NOTAS.test(n), `${c}/${g.join('+')}/${s}/${a}: "${n}"`).toBe(false);
      }
    }
    expect(combos).toBe(1728);
    expect(seen.size).toBeGreaterThanOrEqual(14); // todas as frases possíveis foram exercitadas
  });

  it('a frase do déficit calórico saiu e a nova (só de hábitos) entrou para quem escolhe emagrecer', () => {
    const { notes } = getIMCRecommendations('normal', ['lose_weight'], 'male', '26-35') as { notes: string[] };
    expect(notes).toContain('Treinar com regularidade e dormir bem ajudam mais do que intensidade pontual');
    expect(notes.join(' ')).not.toMatch(/d[eé]ficit|resultado mais r[aá]pido/i);
    // nenhuma outra frase do app tem a frase antiga (só o mapa de compatibilidade para séries antigas pode tê-la)
    const hits = ['src/utils/imc.js', 'src/utils/workoutGenerator.js', 'src/screens/SmartPlanScreen.js', 'src/data/infoContent.js'].filter((f) => /Déficit calórico \+ treino/.test(read(f)));
    expect(hits).toEqual([]);
  });

  it('as dicas de cada faixa de IMC passam (de 10 a 50, passo 0,5)', () => {
    const tips = new Set<string>();
    for (let imc = 10; imc <= 50; imc += 0.5) {
      const c = getIMCCategory(imc) as { tip: string };
      tips.add(c.tip);
      expect(PROIBIDOS_NOTAS.test(c.tip), c.tip).toBe(false);
    }
    expect(tips.size).toBe(5);
  });

  it('o scanner funciona: pega as frases antigas e deixa passar as novas', () => {
    for (const ruim of ['Déficit calórico + treino = resultado mais rápido', 'Glúteos e pernas têm resposta excelente a volume alto', 'Sua recuperação é ótima — aproveite para progredir rápido', 'Aquecimento longo é essencial para proteger as articulações', 'Combinação de cardio e musculação será ideal', 'Amplitude completa gera mais resultado que carga alta', 'Faça uma dieta', 'Tome um suplemento', 'Dose de 5 g', 'Reduza as calorias']) {
      expect(PROIBIDOS_NOTAS.test(ruim), ruim).toBe(true);
    }
    for (const ok of ['Treinar com regularidade e dormir bem ajudam mais do que intensidade pontual', 'A série dá atenção extra a glúteos e pernas', 'Aumente a carga aos poucos, respeitando o descanso entre os treinos', 'Faça um aquecimento mais longo e vá no seu ritmo', 'Cardio leve e musculação, no seu ritmo', 'Priorize exercícios compostos, com boa técnica']) {
      expect(PROIBIDOS_NOTAS.test(ok), ok).toBe(false);
    }
  });
});

describe('scanner: séries geradas, exercícios, demo e textos de apoio das telas', () => {
  it('as personalNotes das séries geradas (todos os combos, objetivos e idades) passam', () => {
    for (const combo of COMBOS as { equipment: string[] }[]) {
      for (const goals of [['lose_weight'], ['gain_muscle', 'health'], []]) {
        for (const ageGroup of ['under18', '26-35', '46+']) {
          for (const imcCategory of ['underweight', 'normal', 'overweight', 'obese2']) {
            const plan = generateWorkoutPlan({ goals, level: 'beginner', days: 3, time: 60, equipment: combo.equipment, limitation: 'none', imcCategory, gender: 'female', ageGroup }) as { personalNotes: string[] }[];
            for (const w of plan) for (const n of w.personalNotes) expect(PROIBIDOS_NOTAS.test(n), n).toBe(false);
          }
        }
      }
    }
  });

  it('as dicas e o passo a passo de todos os exercícios passam no núcleo (dieta, caloria, déficit, dose, suplemento...)', () => {
    let count = 0;
    for (const list of Object.values(EXERCISE_DB as Record<string, { tips?: string; instructions?: string[]; description?: string }[]>)) {
      for (const ex of list) {
        for (const tx of [ex.tips, ex.description, ...(ex.instructions || [])].filter(Boolean) as string[]) {
          count++;
          expect(PROIBIDOS_NUCLEO.test(tx), tx).toBe(false);
        }
      }
    }
    expect(count).toBeGreaterThan(200);
  });

  it('as séries de exemplo do Modo Demo (personalNotes) passam', () => {
    for (const w of DEMO_WORKOUTS as { personalNotes: string[] }[]) for (const n of w.personalNotes) expect(PROIBIDOS_NOTAS.test(n), n).toBe(false);
  });

  it('os textos de apoio (sub/hint/tip) das telas e do guiado passam', () => {
    const files = ['src/screens/onboarding/ProfileSetupScreen.js', 'src/screens/SmartPlanScreen.js', 'src/utils/guidedPlan.js', 'src/utils/imc.js'];
    let count = 0;
    for (const f of files) {
      for (const m of read(f).matchAll(/\b(?:sub|hint|tip):\s*'([^']+)'/g)) {
        count++;
        expect(PROIBIDOS_NOTAS.test(m[1]!), `${f}: ${m[1]}`).toBe(false);
      }
    }
    expect(count).toBeGreaterThan(20);
    // a tela de carregamento do gerador rápido também
    expect(read('src/screens/SmartPlanScreen.js')).not.toMatch(/séries ideais/);
  });

  it('as razões do guiado (guidedPlan.js) não prometem resultado', () => {
    const src = read('src/utils/guidedPlan.js');
    const reasons = [...src.matchAll(/reasons\.push\(`([^`]+)`\)|reasons\.push\('([^']+)'\)/g)].map((m) => m[1] || m[2]!);
    expect(reasons.length).toBeGreaterThan(5);
    for (const r of reasons) expect(PROIBIDOS_NUCLEO.test(r), r).toBe(false);
  });
});

describe('a lógica de imc.js não mudou (só os textos)', () => {
  it('faixas, multiplicadores, descanso, cardio e impacto idênticos em 1728 combinações + 10 valores de IMC', () => {
    const out: unknown[] = [];
    for (const c of CATS) for (const g of GOAL_SETS) for (const s of GENDERS) for (const a of AGES) {
      const { notes, ...rest } = getIMCRecommendations(c, g, s, a) as { notes: string[] } & Record<string, unknown>;
      void notes;
      out.push([c, g, s, a, rest]);
    }
    for (const imc of [10, 17.9, 18.5, 24.9, 25, 29.9, 30, 34.9, 35, 50]) {
      const { tip, ...rest } = getIMCCategory(imc) as { tip: string } & Record<string, unknown>;
      void tip;
      out.push(['cat', imc, rest]);
    }
    // valor calculado com o imc.js ANTERIOR à troca de textos (git HEAD de ajuda-video): mesmo resultado
    expect(createHash('sha256').update(JSON.stringify(out)).digest('hex')).toBe('ce52f6594525767796e780f496f9de321fea7c7304da892f311daf72da03f3c7');
  });
});
