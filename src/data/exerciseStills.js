// Mapa do id do exercício do app -> as duas fotos de referência (posição inicial e final) do banco free-exercise-db (Unlicense),
// relativas à pasta exercises/ do banco. SÓ exercícios com correspondência de confiança "alta" em docs/musculos-exercicios.md; os de confiança
// média ou sem correspondência ficam de fora. GERADO por: node scripts/preparar-fotos-exercicios.mjs --gerar-mapa (2026-10-30).
// As fotos em si NÃO estão no git (assets/exercicios-ref/ está no .gitignore): veja docs/procedencia-midia.md.
export const EXERCISE_STILLS = {
  chest_press_machine: ['Machine_Bench_Press/0.jpg', 'Machine_Bench_Press/1.jpg'],
  smith_bench_press: ['Smith_Machine_Bench_Press/0.jpg', 'Smith_Machine_Bench_Press/1.jpg'],
  cable_crossover: ['Cable_Crossover/0.jpg', 'Cable_Crossover/1.jpg'],
  db_press: ['Dumbbell_Bench_Press/0.jpg', 'Dumbbell_Bench_Press/1.jpg'],
  db_fly: ['Dumbbell_Flyes/0.jpg', 'Dumbbell_Flyes/1.jpg'],
  pushup: ['Pushups/0.jpg', 'Pushups/1.jpg'],
  incline_pushup: ['Incline_Push-Up/0.jpg', 'Incline_Push-Up/1.jpg'],
  lat_pulldown_ex: ['Wide-Grip_Lat_Pulldown/0.jpg', 'Wide-Grip_Lat_Pulldown/1.jpg'],
  superman: ['Superman/0.jpg', 'Superman/1.jpg'],
  leg_press_ex: ['Leg_Press/0.jpg', 'Leg_Press/1.jpg'],
  smith_squat: ['Smith_Machine_Squat/0.jpg', 'Smith_Machine_Squat/1.jpg'],
  leg_extension: ['Leg_Extensions/0.jpg', 'Leg_Extensions/1.jpg'],
  leg_curl: ['Seated_Leg_Curl/0.jpg', 'Seated_Leg_Curl/1.jpg'],
  adductor_machine: ['Thigh_Adductor/0.jpg', 'Thigh_Adductor/1.jpg'],
  abductor_machine: ['Thigh_Abductor/0.jpg', 'Thigh_Abductor/1.jpg'],
  squat: ['Bodyweight_Squat/0.jpg', 'Bodyweight_Squat/1.jpg'],
  cable_kickback: ['One-Legged_Cable_Kickback/0.jpg', 'One-Legged_Cable_Kickback/1.jpg'],
  glute_bridge: ['Butt_Lift_Bridge/0.jpg', 'Butt_Lift_Bridge/1.jpg'],
  shoulder_machine_press: ['Machine_Shoulder_Military_Press/0.jpg', 'Machine_Shoulder_Military_Press/1.jpg'],
  shoulder_press: ['Dumbbell_Shoulder_Press/0.jpg', 'Dumbbell_Shoulder_Press/1.jpg'],
  lateral_raise: ['Side_Lateral_Raise/0.jpg', 'Side_Lateral_Raise/1.jpg'],
  front_raise: ['Front_Dumbbell_Raise/0.jpg', 'Front_Dumbbell_Raise/1.jpg'],
  cable_pushdown: ['Triceps_Pushdown_-_Rope_Attachment/0.jpg', 'Triceps_Pushdown_-_Rope_Attachment/1.jpg'],
  cable_curl: ['Standing_Biceps_Cable_Curl/0.jpg', 'Standing_Biceps_Cable_Curl/1.jpg'],
  barbell_curl: ['EZ-Bar_Curl/0.jpg', 'EZ-Bar_Curl/1.jpg'],
  bicep_curl: ['Dumbbell_Bicep_Curl/0.jpg', 'Dumbbell_Bicep_Curl/1.jpg'],
  hammer_curl: ['Hammer_Curls/0.jpg', 'Hammer_Curls/1.jpg'],
  tricep_ext: ['Standing_Dumbbell_Triceps_Extension/0.jpg', 'Standing_Dumbbell_Triceps_Extension/1.jpg'],
  tricep_dip: ['Bench_Dips/0.jpg', 'Bench_Dips/1.jpg'],
  cable_crunch: ['Cable_Crunch/0.jpg', 'Cable_Crunch/1.jpg'],
  plank: ['Plank/0.jpg', 'Plank/1.jpg'],
  crunch: ['Crunches/0.jpg', 'Crunches/1.jpg'],
  russian_twist: ['Russian_Twist/0.jpg', 'Russian_Twist/1.jpg'],
  dead_bug: ['Dead_Bug/0.jpg', 'Dead_Bug/1.jpg'],
};

// Nomes das duas fotos de um exercício ou null.
export function getStillFiles(id) {
  return EXERCISE_STILLS[id] || null;
}
