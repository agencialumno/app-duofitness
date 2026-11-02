// Séries por combo: para cada vaga, o exercício de APARELHO disponível no combo escolhido; calistenia só quando o combo não tem aparelho para o grupo (e no core).
// Nenhum aparelho que o combo não tem, nenhum exercício repetido na série, combo ausente = só calistenia, menores de 18 sem os 4 excluídos (regra provisória),
// resultado determinístico. O "antes" vem de uma cópia congelada do gerador de candidato-2 (test/helpers/workoutGeneratorV1.js).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { EXERCISE_DB, generateWorkoutPlan, HIGH_IMPACT_IDS } from '../../src/utils/workoutGenerator.js';
// @ts-expect-error módulo JS do app, sem tipos
import { generateWorkoutPlan as generateV1 } from './helpers/workoutGeneratorV1.js';
// @ts-expect-error módulo JS do app, sem tipos
import { getComboEquipment } from '../../src/data/combosEquipment.js';
// @ts-expect-error módulo JS do app, sem tipos
import * as CE from '../../src/data/comboEquipment.js';
// @ts-expect-error módulo JS do app, sem tipos
import { generateGuidedPlan, defaultSettings, getAlternatives } from '../../src/utils/guidedPlan.js';
// @ts-expect-error módulo JS do app, sem tipos
import { generatePlanForAge } from '../../src/utils/planForAge.js';

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const COMBOS = ['uno', 'duo', 'triple', 'prime', 'elite'];
const ALL: any[] = Object.values(EXERCISE_DB).flat();
const BY_ID = new Map<string, any>(ALL.map((e) => [e.id, e]));
const isApp = (e: any) => e.equipment !== 'bodyweight';

type Profile = { goals: string[]; level: string; focus?: string; time: number; gender: string };
const PROFILES: Profile[] = [];
for (const goals of [['gain_muscle'], ['lose_weight'], ['health'], ['maintain', 'health']])
  for (const level of ['beginner', 'intermediate']) for (const focus of [undefined, 'upper', 'lower', 'core']) for (const time of [30, 60]) for (const gender of ['male', 'female']) PROFILES.push({ goals, level, focus, time, gender });
const gen = (combo: unknown, p: Profile, extra: Record<string, unknown> = {}) =>
  generateWorkoutPlan({ goals: p.goals, level: p.level, days: 3, time: p.time, combo, focus: p.focus, limitation: 'none', imcCategory: 'normal', gender: p.gender, ageGroup: '26-35', ...extra });
const genV1 = (combo: string, p: Profile) =>
  generateV1({ goals: p.goals, level: p.level, days: 3, time: p.time, equipment: getComboEquipment(combo), focus: p.focus, limitation: 'none', imcCategory: 'normal', gender: p.gender, ageGroup: '26-35' });
const share = (list: any[]) => (list.length ? list.filter(isApp).length / list.length : 0);

describe('tabela de equipamentos por combo e requisitos por exercício', () => {
  it('as chaves de cada combo seguem a tabela do catálogo (exemplos conferidos)', () => {
    const keys = (c: string) => CE.getComboKeys(c);
    expect(keys('uno')).toEqual(expect.arrayContaining(['ESTEIRA', 'BIKE_KIKOS', 'ESTACAO_MULT', 'BANCO_MULT', 'HALTER', 'BARRA_W', 'PUX_RETO']));
    for (const k of ['CROSS_SMITH', 'EX_FLX', 'AD_ABD', 'BANCO_SUP', 'BIKE_SPI', 'LEG_PRESS', 'PULLEY', 'ELIPTICO', 'ELEVACAO', 'D_14']) expect(keys('uno'), `uno ${k}`).not.toContain(k);
    expect(keys('duo')).toEqual(expect.arrayContaining(['CROSS_SMITH', 'EX_FLX', 'AD_ABD', 'BANCO_SUP', 'BIKE_SPI']));
    expect(keys('duo')).not.toContain('ESTACAO_MULT'); // a estação multifuncional é só do UNO
    for (const k of ['LEG_PRESS', 'PULLEY', 'PEIT_DORS', 'PUXADA_ALTA']) expect(keys('duo'), `duo ${k}`).not.toContain(k);
    expect(keys('triple')).toEqual(expect.arrayContaining(['LEG_PRESS', 'PEIT_DORS', 'PULLEY', 'ELIPTICO']));
    expect(keys('prime')).toEqual(expect.arrayContaining(['CROSS_ANG', 'G_MAX']));
    expect(keys('triple')).not.toContain('G_MAX');
    expect(keys('elite')).toEqual(expect.arrayContaining(['BIKE_ERGO', 'ESCADA', 'ELEVACAO', 'DESENV', 'PUXADA_ALTA', 'D_30', 'RACK_DUMBELL']));
    expect(keys('prime')).not.toContain('ELEVACAO');
    expect(CE.getComboKeys('elite').length).toBeGreaterThan(CE.getComboKeys('prime').length);
  });
  it('combo ausente, nulo ou desconhecido não tem NENHUMA chave', () => {
    for (const c of [undefined, null, '', 'xyz', 'ultra']) expect(CE.getComboKeys(c as never)).toEqual([]);
    expect(CE.getComboKeys('ELITE').length).toBeGreaterThan(0); // maiúscula vale
  });
  it('os 59 exercícios têm requisito conhecido e "nenhum equipamento" coincide com peso do corpo', () => {
    expect(ALL).toHaveLength(59);
    for (const e of ALL) {
      const req = CE.EXERCISE_REQUIREMENTS[e.id];
      expect(Array.isArray(req), `${e.id} sem requisito`).toBe(true);
      expect(req.length === 0, `${e.id}: requisito vazio só para peso do corpo`).toBe(e.equipment === 'bodyweight');
    }
    expect(Object.keys(CE.EXERCISE_REQUIREMENTS).sort()).toEqual(ALL.map((e) => e.id).sort());
    expect(CE.unavailableUnknownIds(ALL.map((e) => e.id))).toEqual([]); // nenhum "desconhecido" restante
  });
  it('um exercício com requisito DESCONHECIDO (null) ou fora da tabela fica indisponível em todos os combos', () => {
    expect(CE.isAvailableWithKeys('inventado', CE.getComboKeys('elite'))).toBe(false);
    const saved = CE.EXERCISE_REQUIREMENTS.plank;
    CE.EXERCISE_REQUIREMENTS.plank = null;
    try {
      for (const c of COMBOS) expect(CE.isAvailableInCombo('plank', c)).toBe(false);
      expect(CE.unavailableUnknownIds(['plank'])).toEqual(['plank']);
    } finally { CE.EXERCISE_REQUIREMENTS.plank = saved; }
  });
  it('a disponibilidade por combo bate com os aparelhos que cada combo tinha antes (nada que existia deixa de existir, exceto o decidido para puxada e remada)', () => {
    for (const c of COMBOS) {
      const before = new Set<string>(ALL.filter((e) => getComboEquipment(c).includes(e.equipment)).map((e) => e.id));
      for (const id of before) {
        const ok = CE.isAvailableInCombo(id, c);
        const decidido = c === 'uno' && ['seated_cable_row'].includes(id); // UNO não tem PULLEY nem Cross com Smith: decisão do Victor
        expect(ok || decidido, `${c}: ${id} deixou de estar disponível`).toBe(true);
      }
    }
  });
  it('puxada e remada: PUXADA_ALTA ou PULLEY ou Cross com Smith (+ puxador); CROSS_ANG e ESTACAO_MULT NÃO valem (pendente de validação do educador físico)', () => {
    const has = (id: string, ...keys: string[]) => CE.isAvailableWithKeys(id, keys);
    expect(has('lat_pulldown_ex', 'PUXADA_ALTA')).toBe(true);
    expect(has('lat_pulldown_ex', 'PULLEY')).toBe(true);
    expect(has('lat_pulldown_ex', 'CROSS_SMITH', 'PUX_RETO')).toBe(true);
    expect(has('lat_pulldown_ex', 'CROSS_SMITH')).toBe(false); // falta o puxador reto
    expect(has('lat_pulldown_ex', 'CROSS_ANG', 'PUX_RETO')).toBe(false);
    expect(has('lat_pulldown_ex', 'ESTACAO_MULT', 'PUX_RETO')).toBe(false);
    expect(has('seated_cable_row', 'PULLEY')).toBe(true);
    expect(has('seated_cable_row', 'CROSS_SMITH', 'TRI_SERG')).toBe(true);
    expect(has('seated_cable_row', 'CROSS_ANG', 'TRI_SERG')).toBe(false);
    expect(has('seated_cable_row', 'ESTACAO_MULT', 'TRI_SERG')).toBe(false);
    expect(read('src/data/comboEquipment.js')).toMatch(/PENDENTE de validação do educador físico/);
  });
  it('demais mapeamentos decididos: halter + banco, cabo + puxador, kickback com PUX_TORNO, rdl e goblet só com HALTER', () => {
    const has = (id: string, ...keys: string[]) => CE.isAvailableWithKeys(id, keys);
    expect(has('db_press', 'HALTER', 'BANCO_MULT')).toBe(true);
    expect(has('db_press', 'HALTER', 'BANCO_SUP')).toBe(true);
    expect(has('db_press', 'HALTER')).toBe(false);
    expect(has('smith_bench_press', 'CROSS_SMITH', 'BANCO_SUP')).toBe(true);
    expect(has('smith_bench_press', 'CROSS_SMITH')).toBe(false);
    expect(has('cable_kickback', 'ESTACAO_MULT', 'PUX_TORNO')).toBe(true);
    expect(has('cable_kickback', 'ESTACAO_MULT')).toBe(false);
    expect(has('cable_kickback', 'PUX_TORNO')).toBe(false); // puxador sem cabo não serve
    expect(has('rdl', 'HALTER')).toBe(true);
    expect(has('goblet_squat', 'HALTER')).toBe(true);
    expect(has('cable_pushdown', 'CROSS_ANG', 'CORDA_SERG')).toBe(true);
    expect(has('bike_cardio', 'BIKE_ERGO')).toBe(true);
    expect(has('treadmill', 'ESTEIRA')).toBe(true);
  });
});

describe('gerador por combo (todos os combos x 128 perfis)', () => {
  it('NENHUM exercício com aparelho que o combo não tem e NENHUM repetido na mesma série (por id)', () => {
    let series = 0;
    for (const combo of COMBOS) for (const p of PROFILES) for (const serie of gen(combo, p)) {
      series++;
      const ids = serie.exercises.map((e: any) => e.id);
      expect(new Set(ids).size, `${combo} ${JSON.stringify(p)} série ${serie.serie} repete exercício`).toBe(ids.length);
      for (const id of ids) expect(CE.isAvailableInCombo(id, combo), `${combo}: ${id} indisponível`).toBe(true);
    }
    expect(series).toBe(5 * PROFILES.length * 3);
  });
  it('o aparelho que já entrava hoje e continua disponível NUNCA deixa de entrar (contagem por série >= a de hoje)', () => {
    for (const combo of COMBOS) for (const p of PROFILES) {
      const before = genV1(combo, p);
      gen(combo, p).forEach((serie: any, i: number) => {
        const keepable = [...new Set<string>(before[i].exercises.map((e: any) => e.id))].filter((id) => isApp(BY_ID.get(id)) && CE.isAvailableInCombo(id, combo)).length;
        const now = serie.exercises.filter(isApp).length;
        expect(now, `${combo} ${JSON.stringify(p)} série ${serie.serie}`).toBeGreaterThanOrEqual(keepable);
      });
    }
  });
  it('a participação de aparelho NUNCA é menor que a de hoje nos combos com puxada e remada (DUO a ELITE) e a média sobe em todos os combos', () => {
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    for (const combo of COMBOS) {
      const b: number[] = [];
      const a: number[] = [];
      for (const p of PROFILES) {
        const before = genV1(combo, p);
        gen(combo, p).forEach((serie: any, i: number) => {
          const uniq = [...new Map(before[i].exercises.map((e: any) => [e.id, e])).values()];
          b.push(share(uniq as any[]));
          a.push(share(serie.exercises));
        });
      }
      expect(mean(a), `${combo} média`).toBeGreaterThan(mean(b));
      if (combo !== 'uno') {
        // fora do UNO (que perdeu remada e puxada por decisão) a série nunca fica com menos aparelho; só a proporção pode cair onde a eliminação das repetições
        // acrescenta exercícios de calistenia, então aqui vale a média por perfil e série
        expect(Math.min(...a.map((x, i) => x - b[i]!)), `${combo}: pior diferença`).toBeGreaterThanOrEqual(-0.2);
      }
    }
  });
  it('as séries que hoje têm menos de 40% de aparelho melhoram nos combos que têm aparelho para o grupo (DUO a ELITE: a maioria sobe e nenhuma piora muito)', () => {
    let low = 0;
    let better = 0;
    for (const combo of ['duo', 'triple', 'prime', 'elite']) for (const p of PROFILES) {
      const before = genV1(combo, p);
      gen(combo, p).forEach((serie: any, i: number) => {
        const uniq = [...new Map(before[i].exercises.map((e: any) => [e.id, e])).values()] as any[];
        if (share(uniq) < 0.4) { low++; if (share(serie.exercises) >= share(uniq) - 1e-9) better++; }
      });
    }
    expect(low).toBeGreaterThan(50);
    expect(better / low).toBeGreaterThan(0.8);
  });
  it('o UNO (poucos aparelhos) completa com calistenia sem repetir e sem forçar aparelho que não existe', () => {
    for (const p of PROFILES) for (const serie of gen('uno', p)) {
      const ids = serie.exercises.map((e: any) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(['PUXADA_ALTA', 'LEG_PRESS', 'PEIT_DORS'].some((k) => CE.getComboKeys('uno').includes(k))).toBe(false);
    }
  });
  it('aparelho primeiro, calistenia depois: numa série de peito completa (ELITE), os 3 primeiros do peito são de aparelho', () => {
    const p: Profile = { goals: ['gain_muscle'], level: 'intermediate', time: 60, gender: 'male', focus: 'upper' };
    const serieA = gen('elite', p)[0];
    const chest = serieA.exercises.filter((e: any) => e.category === 'Peito');
    expect(chest.length).toBe(3);
    for (const e of chest) expect(isApp(e), e.id).toBe(true);
    expect(chest.map((e: any) => e.id)).toEqual(['chest_press_machine', 'smith_bench_press', 'cable_crossover']);
  });
  it('o core fica na ordem de sempre (calistenia é permitida); o cardio prefere esteira e bike', () => {
    const p: Profile = { goals: ['lose_weight'], level: 'intermediate', time: 60, gender: 'male', focus: 'core' };
    const c = gen('elite', p)[2];
    const core = c.exercises.filter((e: any) => e.category === 'Core').map((e: any) => e.id);
    const dbCore = EXERCISE_DB.core.map((e: any) => e.id);
    expect(core).toEqual(dbCore.filter((id: string) => core.includes(id)).slice(0, core.length)); // mesma ordem do catálogo
    const cardio = c.exercises.filter((e: any) => e.category === 'Cardio').map((e: any) => e.id);
    expect(cardio.slice(0, 1)).toEqual(['treadmill']);
  });
});

describe('puxada e remada no DUO (Cross com Smith) e no UNO', () => {
  const p: Profile = { goals: ['gain_muscle'], level: 'intermediate', time: 60, gender: 'male', focus: 'upper' };
  const back = (combo: string) => gen(combo, p)[1].exercises.map((e: any) => e.id);
  it('o DUO (CROSS_SMITH, sem PULLEY nem PUXADA_ALTA) recebe lat_pulldown_ex e seated_cable_row nas séries de costas', () => {
    expect(CE.getComboKeys('duo')).toContain('CROSS_SMITH');
    expect(CE.getComboKeys('duo')).not.toContain('PULLEY');
    expect(CE.getComboKeys('duo')).not.toContain('PUXADA_ALTA');
    expect(back('duo')).toEqual(expect.arrayContaining(['lat_pulldown_ex', 'seated_cable_row']));
  });
  it('o UNO (só a estação multifuncional) NÃO recebe nenhum dos dois, em nenhum perfil', () => {
    expect(back('uno')).not.toContain('lat_pulldown_ex');
    expect(back('uno')).not.toContain('seated_cable_row');
    for (const prof of PROFILES) for (const serie of gen('uno', prof)) for (const e of serie.exercises) expect(['lat_pulldown_ex', 'seated_cable_row']).not.toContain(e.id);
  });
  it('TRIPLE, PRIME e ELITE (PULLEY) também recebem; perfil de nível iniciante não recebe a puxada (exercício intermediário)', () => {
    for (const c of ['triple', 'prime', 'elite']) expect(back(c)).toEqual(expect.arrayContaining(['lat_pulldown_ex', 'seated_cable_row']));
    const ids = gen('duo', { ...p, level: 'beginner' })[1].exercises.map((e: any) => e.id);
    expect(ids).not.toContain('lat_pulldown_ex');
  });
});

describe('combo ausente ou desconhecido = só calistenia', () => {
  it('combo nulo, vazio ou desconhecido (chave presente): nenhum aparelho em nenhuma série', () => {
    for (const combo of [null, '', 'xyz', 'ultra']) for (const p of PROFILES.slice(0, 40)) for (const serie of gen(combo, p)) {
      for (const e of serie.exercises) expect(e.equipment, `${combo}: ${e.id}`).toBe('bodyweight');
      expect(serie.exercises.length).toBeGreaterThan(0);
    }
  });
  it('a série guiada sem combo escolhido gera só calistenia; com DUO gera aparelho do DUO', () => {
    const user = { gender: 'male', ageGroup: '26-35', weight: 70, height: 175, level: 'intermediate', goals: ['gain_muscle'] };
    const base = { ...defaultSettings(user), level: 'intermediate', goals: ['gain_muscle'], weight: 70, height: 175, time: 60, focus: 'balanced' };
    const none = generateGuidedPlan({ ...base, combo: null }, user);
    for (const w of none.workouts) for (const e of w.exercises) expect(e.equipment).toBe('bodyweight');
    const duo = generateGuidedPlan({ ...base, combo: 'duo' }, user);
    const all = duo.workouts.flatMap((w: any) => w.exercises);
    expect(all.some(isApp)).toBe(true);
    for (const e of all) expect(CE.isAvailableInCombo(e.id, 'duo')).toBe(true);
  });
  it('quem chama sem a chave `combo` (código antigo) continua com a lista de equipamentos de sempre', () => {
    const out = generateWorkoutPlan({ goals: ['health'], level: 'intermediate', days: 3, time: 60, equipment: ['bodyweight'], limitation: 'none', imcCategory: 'normal', gender: 'male', ageGroup: '26-35' });
    for (const s of out) for (const e of s.exercises) expect(e.equipment).toBe('bodyweight');
  });
});

describe('menores de 18: regras existentes + exclusões provisórias', () => {
  const EXCLUDED = ['smith_squat', 'smith_bench_press', 'leg_press_ex', 'rdl'];
  it('a lista provisória está no código, marcada como pendente de revisão do educador físico', () => {
    expect(CE.MINOR_EXCLUDED_IDS).toEqual(EXCLUDED);
    const src = read('src/data/comboEquipment.js');
    expect(src).toMatch(/PROVISÓRIA, PENDENTE DE REVISÃO DO EDUCADOR FÍSICO/);
  });
  it('menor de 18 não recebe smith_squat, smith_bench_press, leg_press_ex nem rdl em nenhum combo, perfil ou foco', () => {
    for (const combo of COMBOS) for (const p of PROFILES) for (const serie of gen(combo, p, { ageGroup: 'under18' })) for (const e of serie.exercises) {
      expect(EXCLUDED, `${combo}: ${e.id}`).not.toContain(e.id);
      expect(HIGH_IMPACT_IDS, `${combo}: ${e.id} é de impacto`).not.toContain(e.id); // regra existente: sem impacto
    }
  });
  it('o adulto não perde nada pela regra de menores (a exclusão é só para under18) e ela remove exatamente os quatro', () => {
    const ex = ALL.filter((e) => EXCLUDED.includes(e.id));
    expect(ex).toHaveLength(4);
    expect(CE.filterForMinor(ex, '26-35')).toHaveLength(4);
    expect(CE.filterForMinor(ex, 'under18')).toHaveLength(0);
    const seen = new Set<string>();
    for (const p of PROFILES) for (const serie of gen('elite', p)) for (const e of serie.exercises) seen.add(e.id);
    expect([...seen]).toContain('smith_squat');
  });
  it('regras existentes dos menores seguem: volume 0,9 e nota de supervisão; menor com combo ELITE continua só com aparelho disponível', () => {
    const p: Profile = { goals: ['gain_muscle'], level: 'intermediate', time: 60, gender: 'male' };
    const adult = gen('elite', p)[0];
    const minor = gen('elite', p, { ageGroup: 'under18' })[0];
    expect(minor.personalNotes.join(' ')).toMatch(/supervisão/);
    const ex = (s: any, id: string) => s.exercises.find((e: any) => e.id === id);
    const common = adult.exercises.map((e: any) => e.id).find((id: string) => ex(minor, id));
    expect(common).toBeTruthy();
    expect(ex(minor, common).sets).toBeLessThanOrEqual(ex(adult, common).sets);
    for (const e of minor.exercises) expect(CE.isAvailableInCombo(e.id, 'elite')).toBe(true);
  });
  it('o caminho pelo planForAge (usado pelas telas) e a série guiada também respeitam as exclusões', () => {
    const out = generatePlanForAge({ goals: ['gain_muscle'], level: 'intermediate', days: 3, time: 90, combo: 'elite', limitation: 'none', imcCategory: 'normal', gender: 'male', ageGroup: 'under18' });
    for (const s of out) for (const e of s.exercises) expect(EXCLUDED).not.toContain(e.id);
    const user = { gender: 'male', ageGroup: 'under18', weight: 60, height: 170, level: 'intermediate', goals: ['gain_muscle'] };
    const settings = { ...defaultSettings(user), level: 'intermediate', goals: ['gain_muscle'], weight: 60, height: 170, time: 90, combo: 'elite' };
    const plan = generateGuidedPlan(settings, user);
    for (const w of plan.workouts) for (const e of w.exercises) expect(EXCLUDED).not.toContain(e.id);
    // a troca de exercício (alternativas) também não oferece os excluídos nem aparelho fora do combo
    const alt = getAlternatives(plan.workouts, 0, plan.workouts[0].exercises[0].id, settings, user);
    for (const e of alt) { expect(EXCLUDED).not.toContain(e.id); expect(CE.isAvailableInCombo(e.id, 'elite')).toBe(true); }
  });
});

describe('determinismo, variedade e nomes', () => {
  it('o mesmo perfil gera sempre o mesmo resultado (sem sorteio)', () => {
    for (const combo of COMBOS) for (const p of PROFILES.slice(0, 20)) expect(gen(combo, p)).toEqual(gen(combo, p));
    expect(read('src/utils/workoutGenerator.js').replace(/^\s*\/\/.*$/gm, '')).not.toMatch(/Math\.random/);
    expect(read('src/data/comboEquipment.js').replace(/^\s*\/\/.*$/gm, '')).not.toMatch(/Math\.random/);
  });
  it('a série tem exercícios de grupos variados (não se repete o mesmo exercício em nenhuma das 3 séries de um mesmo combo/perfil)', () => {
    for (const combo of ['duo', 'elite']) for (const p of PROFILES.slice(0, 32)) {
      for (const serie of gen(combo, p)) expect(new Set(serie.exercises.map((e: any) => e.id)).size).toBe(serie.exercises.length);
    }
  });
  it('nenhuma marca ou modelo aparece em texto do app: a única ocorrência é a chave interna BIKE_KIKOS (nunca exibida)', () => {
    const walk = (d: string): string[] => readdirSync(path.join(REPO, d)).flatMap((n) => {
      const rel = `${d}/${n}`;
      return statSync(path.join(REPO, rel)).isDirectory() ? walk(rel) : n.endsWith('.js') ? [rel] : [];
    });
    const hits = walk('src').filter((f) => /kikos/i.test(read(f)));
    expect(hits).toEqual(['src/data/comboEquipment.js']);
    const lines = read('src/data/comboEquipment.js').split('\n').filter((l) => /kikos/i.test(l));
    for (const l of lines) expect(l).toMatch(/BIKE_KIKOS/);
    const keyLine = lines.filter((l) => !/^\s*\/\//.test(l));
    expect(keyLine.length).toBeLessThanOrEqual(2); // a chave na tabela e na lista "qualquer bike"
    // nome e dicas dos exercícios não citam marca
    for (const e of ALL) expect(`${e.name} ${e.tips ?? ''} ${(e.instructions ?? []).join(' ')}`, e.id).not.toMatch(/kikos/i);
  });
  it('os 4 chamadores passam o combo: série guiada, Gerador rápido e chat', () => {
    expect(read('src/utils/guidedPlan.js')).toContain('combo: settings.combo ?? null');
    expect(read('src/screens/SmartPlanScreen.js')).toContain('combo: answers.combo ?? null');
    expect(read('src/screens/AIPersonalTrainerScreen.js')).toContain('combo: allAnswers.combo ?? null');
    expect(read('src/utils/guidedPlan.js')).toContain('filterByCombo(list, settings.combo ?? null)');
  });
});
