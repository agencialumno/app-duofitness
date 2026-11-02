// Equipamentos de cada combo (UNO, DUO, TRIPLE, PRIME, ELITE) e o equipamento que cada exercício exige. Fonte: catálogo do simulador.
// As CHAVES abaixo são identificadores internos (iguais aos placeholders do simulador): nunca aparecem para a pessoa. Nenhum texto do app cita marca
// ou modelo. Puro (sem React). O gerador (workoutGenerator.js) e a série guiada usam estas funções:
//  - combo ausente, nulo ou desconhecido = SÓ calistenia (padrão seguro, nunca aparelho);
//  - exercício sem requisito conhecido (null) fica INDISPONÍVEL até alguém confirmar;
//  - 13 a 17 anos: regra PROVISÓRIA (MINOR_EXCLUDED_IDS) abaixo.

export const COMBO_IDS = ['uno', 'duo', 'triple', 'prime', 'elite'];
const ALL = ['uno', 'duo', 'triple', 'prime', 'elite'];
const ID = (...names) => names.map((n) => n.toLowerCase());

// chave -> combos que têm o equipamento
export const EQUIPMENT_BY_KEY = {
  ESTEIRA: ALL,
  BIKE_KIKOS: ALL,
  BIKE_SPI: ID('DUO', 'TRIPLE', 'PRIME', 'ELITE'),
  BIKE_ERGO: ID('ELITE'),
  ELIPTICO: ID('TRIPLE', 'PRIME', 'ELITE'),
  ESCADA: ID('ELITE'),
  ESTACAO_MULT: ID('UNO'),
  CROSS_SMITH: ID('DUO', 'TRIPLE', 'PRIME', 'ELITE'),
  CROSS_ANG: ID('PRIME', 'ELITE'),
  AD_ABD: ID('DUO', 'TRIPLE', 'PRIME', 'ELITE'), // adutora / abdutora
  EX_FLX: ID('DUO', 'TRIPLE', 'PRIME', 'ELITE'), // extensora / flexora
  LEG_PRESS: ID('TRIPLE', 'PRIME', 'ELITE'),
  PEIT_DORS: ID('TRIPLE', 'PRIME', 'ELITE'), // peitoral / dorsal
  PULLEY: ID('TRIPLE', 'PRIME', 'ELITE'), // pulley com remada
  G_MAX: ID('PRIME', 'ELITE'), // glúteo máximo
  ELEVACAO: ID('ELITE'), // elevação pélvica
  DESENV: ID('ELITE'), // desenvolvimento
  PUXADA_ALTA: ID('ELITE'), // puxada alta com supino
  BANCO_MULT: ALL, // banco multi posições
  BANCO_SUP: ID('DUO', 'TRIPLE', 'PRIME', 'ELITE'), // supino regulável
  ANILHA: ALL,
  BARRA_W: ALL,
  HALTER: ALL, // halter emborrachado 10 kg
  SUP_BARRA: ALL,
  SUP_HALTER: ALL,
  D_14: ID('ELITE'),
  D_18: ID('ELITE'),
  D_22: ID('ELITE'),
  D_26: ID('ELITE'),
  D_30: ID('ELITE'),
  RACK_DUMBELL: ID('ELITE'),
  // puxadores: todos os combos os têm, mas só servem em combos com algum equipamento de cabo (veja CABO)
  PUX_RETO: ALL,
  CORDA_SERG: ALL,
  PUX_ROMA: ALL,
  PUX_TORNO: ALL,
  TRI_SERG: ALL,
  STEP_LIGHT: ALL,
  COLCHONETE: ALL,
};

// "Equipamento de cabo": quem tem um destes tem polia para os puxadores.
export const CABO = ['ESTACAO_MULT', 'CROSS_SMITH', 'CROSS_ANG', 'PULLEY'];

// Chaves que o combo tem. Combo ausente ou desconhecido = lista vazia (só calistenia).
export function getComboKeys(comboId) {
  const id = String(comboId ?? '').toLowerCase();
  if (!COMBO_IDS.includes(id)) return [];
  return Object.keys(EQUIPMENT_BY_KEY).filter((k) => EQUIPMENT_BY_KEY[k].includes(id));
}

// ---------- requisitos por exercício ----------
// Cada requisito é uma lista de cláusulas (todas precisam valer). Cláusula = chave | { any: [chave | [chaves que valem juntas], ...] }.
// [] = nenhum equipamento (calistenia). null = DESCONHECIDO: o exercício fica indisponível até confirmação.
const cabo = { any: CABO };
const banco = { any: ['BANCO_MULT', 'BANCO_SUP'] };
const anyBike = { any: ['BIKE_KIKOS', 'BIKE_SPI', 'BIKE_ERGO'] };

export const EXERCISE_REQUIREMENTS = {
  // peito
  chest_press_machine: ['PEIT_DORS'],
  smith_bench_press: ['CROSS_SMITH', banco],
  cable_crossover: [cabo],
  db_press: ['HALTER', banco],
  db_fly: ['HALTER', banco],
  pushup: [],
  incline_pushup: [],
  // costas
  // PENDENTE de validação do educador físico: o Cross com Smith tem polia alta ajustável que pode ser deixada baixa, então serve para puxada e remada.
  // NÃO se assume o mesmo para CROSS_ANG nem para ESTACAO_MULT enquanto não houver confirmação.
  lat_pulldown_ex: [{ any: ['PUXADA_ALTA', 'PULLEY', ['CROSS_SMITH', 'PUX_RETO']] }],
  rear_delt_machine: ['PEIT_DORS'],
  seated_cable_row: [{ any: ['PULLEY', ['CROSS_SMITH', 'TRI_SERG']] }],
  row_db: ['HALTER', 'BANCO_MULT'],
  pullover: ['HALTER', 'BANCO_MULT'],
  reverse_fly: ['HALTER'],
  superman: [],
  // pernas
  leg_press_ex: ['LEG_PRESS'],
  smith_squat: ['CROSS_SMITH'],
  leg_extension: ['EX_FLX'],
  leg_curl: ['EX_FLX'],
  adductor_machine: ['AD_ABD'],
  abductor_machine: ['AD_ABD'],
  goblet_squat: ['HALTER'],
  rdl: ['HALTER'],
  squat: [],
  lunge: [],
  calf_raise: [],
  wall_sit: [],
  // glúteos
  hip_thrust_machine: ['ELEVACAO'],
  glute_machine_ex: ['G_MAX'],
  cable_kickback: [cabo, 'PUX_TORNO'],
  glute_bridge: [],
  donkey_kick: [],
  fire_hydrant: [],
  sumo_squat: [],
  // ombros
  shoulder_machine_press: ['DESENV'],
  cable_lateral_raise: [cabo],
  shoulder_press: ['HALTER'],
  lateral_raise: ['HALTER'],
  front_raise: ['HALTER'],
  pike_pushup: [],
  // braços
  cable_pushdown: [cabo, 'CORDA_SERG'],
  cable_curl: [cabo, 'PUX_RETO'],
  barbell_curl: ['BARRA_W'],
  bicep_curl: ['HALTER'],
  hammer_curl: ['HALTER'],
  tricep_ext: ['HALTER'],
  tricep_dip: ['BANCO_MULT'],
  // core
  cable_crunch: [cabo, 'CORDA_SERG'],
  plank: [],
  crunch: [],
  leg_raise: [],
  russian_twist: [],
  dead_bug: [],
  // cardio
  jumping_jack: [],
  high_knees: [],
  step_touch: [],
  burpee: [],
  march_place: [],
  treadmill: ['ESTEIRA'],
  bike_cardio: [anyBike],
};

function clauseOk(clause, keys) {
  if (typeof clause === 'string') return keys.includes(clause);
  if (clause && Array.isArray(clause.any)) {
    return clause.any.some((alt) => (Array.isArray(alt) ? alt.every((k) => keys.includes(k)) : keys.includes(alt)));
  }
  return false;
}

// O exercício está disponível com estas chaves? id desconhecido ou requisito null = não.
export function isAvailableWithKeys(exerciseId, keys) {
  const req = EXERCISE_REQUIREMENTS[exerciseId];
  if (!Array.isArray(req)) return false;
  return req.every((c) => clauseOk(c, keys));
}

// Disponível no combo escolhido? (combo ausente/desconhecido: só os de calistenia, requisito [])
export function isAvailableInCombo(exerciseId, comboId) {
  return isAvailableWithKeys(exerciseId, getComboKeys(comboId));
}

export function filterByCombo(exercises, comboId) {
  const keys = getComboKeys(comboId);
  return exercises.filter((e) => isAvailableWithKeys(e.id, keys));
}

// Exercícios do catálogo com requisito DESCONHECIDO (indisponíveis até confirmação). Hoje: nenhum.
export const unavailableUnknownIds = (ids) => ids.filter((id) => EXERCISE_REQUIREMENTS[id] === null || !(id in EXERCISE_REQUIREMENTS));

// ---------- menores de 18 ----------
// REGRA PROVISÓRIA, PENDENTE DE REVISÃO DO EDUCADOR FÍSICO (docs/pendencias-usuario.md): de 13 a 17 anos, nada de agachamento com barra no Smith,
// supino no Smith, leg press nem terra romeno. Vale junto das regras que já existiam (sem impacto, 0,9 de volume e a nota de supervisão).
export const MINOR_EXCLUDED_IDS = ['smith_squat', 'smith_bench_press', 'leg_press_ex', 'rdl'];

export function filterForMinor(exercises, ageGroup) {
  if (ageGroup !== 'under18') return exercises;
  return exercises.filter((e) => !MINOR_EXCLUDED_IDS.includes(e.id));
}
