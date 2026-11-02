// Ícone de cada exercício (um DIFERENTE por exercício do EXERCISE_DB). Só as famílias que o app já tem: Ionicons e MaterialCommunityIcons
// (ambas do @expo/vector-icons; as duas fontes são pré-carregadas no App.js). Os nomes são conferidos por teste contra os glifos da versão instalada.
// Id desconhecido (exercício novo, plano vindo da API) cai no ícone de reserva. O ícone é decorativo: o nome do exercício vem ao lado.
export const FAMILY = { IONICONS: 'ionicons', MCI: 'material-community' };

const I = (name) => ({ family: FAMILY.IONICONS, name });
const M = (name) => ({ family: FAMILY.MCI, name });

export const EXERCISE_ICONS = {
  // peito
  chest_press_machine: M('seat-recline-normal'),
  smith_bench_press: M('weight-lifter'),
  cable_crossover: M('shuffle-variant'),
  db_press: M('dumbbell'),
  db_fly: M('arrow-split-vertical'),
  pushup: M('human-handsdown'),
  incline_pushup: M('slope-uphill'),
  // costas
  lat_pulldown_ex: M('arrow-down-bold'),
  rear_delt_machine: M('arrow-left-right-bold'),
  seated_cable_row: M('rowing'),
  row_db: M('arrow-up-bold'),
  pullover: M('rotate-right'),
  reverse_fly: M('bird'),
  superman: M('airplane'),
  // pernas
  leg_press_ex: M('piston'),
  smith_squat: M('axis-y-arrow'),
  leg_extension: M('seat-legroom-extra'),
  leg_curl: M('seat-legroom-reduced'),
  adductor_machine: M('arrow-collapse-horizontal'),
  abductor_machine: M('arrow-expand-horizontal'),
  goblet_squat: M('kettlebell'),
  rdl: M('weight'),
  squat: M('arrow-up-down-bold'),
  lunge: M('walk'),
  calf_raise: M('shoe-sneaker'),
  wall_sit: M('wall'),
  // glúteos
  hip_thrust_machine: M('bench-back'),
  glute_machine_ex: M('bike-pedal'),
  cable_kickback: M('shoe-cleat'),
  glute_bridge: M('bridge'),
  donkey_kick: M('donkey'),
  fire_hydrant: M('dog-side'),
  sumo_squat: M('karate'),
  // ombros
  shoulder_machine_press: M('arrow-up-bold-box'),
  cable_lateral_raise: M('angle-right'),
  shoulder_press: M('human-handsup'),
  lateral_raise: I('accessibility'),
  front_raise: M('hand-front-right'),
  pike_pushup: M('triangle'),
  // braços
  cable_pushdown: M('arrow-down-bold-box'),
  cable_curl: M('cable-data'),
  barbell_curl: I('barbell'),
  bicep_curl: M('arm-flex'),
  hammer_curl: M('hammer'),
  tricep_ext: M('angle-acute'),
  tricep_dip: M('bench'),
  // core
  cable_crunch: M('ethernet-cable'),
  plank: M('timer'),
  crunch: M('arrow-collapse-down'),
  leg_raise: M('chevron-double-up'),
  russian_twist: M('rotate-360'),
  dead_bug: M('bug'),
  // cardio
  jumping_jack: M('jump-rope'),
  high_knees: M('run-fast'),
  step_touch: M('foot-print'),
  burpee: M('gymnastics'),
  march_place: I('footsteps'),
  treadmill: M('run'),
  bike_cardio: M('bike'),
};

// Ids de src/data/exercises.js (a lista da aba Exercícios e o Criar treino) que não são ids do EXERCISE_DB: usam o ícone do equivalente.
export const ICON_ALIASES = { dumbbell_row: 'row_db' };

// Ícone de reserva para id desconhecido (o mesmo genérico que as telas usavam antes).
export const FALLBACK_ICON = I('fitness-outline');

export function getExerciseIcon(id) {
  const key = ICON_ALIASES[id] || id;
  return Object.prototype.hasOwnProperty.call(EXERCISE_ICONS, key) ? EXERCISE_ICONS[key] : FALLBACK_ICON;
}
