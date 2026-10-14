// GERADO por scripts/sync-catalog.ts a partir do app. NÃO EDITE À MÃO.
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

export const CATALOG: CatalogExercise[] = [
  {
    "id": "chest_press_machine",
    "name": "Supino na Máquina (Peitoral Dorsal)",
    "category": "Peito",
    "equipment": "chest_back_machine",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "10–12",
    "rest": 75
  },
  {
    "id": "smith_bench_press",
    "name": "Supino no Smith",
    "category": "Peito",
    "equipment": "smith",
    "difficulty": "Intermediário",
    "sets": 4,
    "reps": "8–12",
    "rest": 90
  },
  {
    "id": "cable_crossover",
    "name": "Crucifixo no Cabo",
    "category": "Peito",
    "equipment": "cable",
    "difficulty": "Intermediário",
    "sets": 3,
    "reps": "12–15",
    "rest": 60
  },
  {
    "id": "db_press",
    "name": "Supino com Halteres",
    "category": "Peito",
    "equipment": "dumbbells",
    "difficulty": "Intermediário",
    "sets": 4,
    "reps": "8–12",
    "rest": 90
  },
  {
    "id": "db_fly",
    "name": "Crucifixo com Halteres",
    "category": "Peito",
    "equipment": "dumbbells",
    "difficulty": "Intermediário",
    "sets": 3,
    "reps": "10–12",
    "rest": 60
  },
  {
    "id": "pushup",
    "name": "Flexão de Braço",
    "category": "Peito",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "10–15",
    "rest": 60
  },
  {
    "id": "incline_pushup",
    "name": "Flexão Inclinada",
    "category": "Peito",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "10–12",
    "rest": 60
  },
  {
    "id": "lat_pulldown_ex",
    "name": "Puxada Alta",
    "category": "Costas",
    "equipment": "lat_pulldown",
    "difficulty": "Intermediário",
    "sets": 4,
    "reps": "10–12",
    "rest": 75
  },
  {
    "id": "rear_delt_machine",
    "name": "Voador Invertido na Máquina",
    "category": "Costas",
    "equipment": "chest_back_machine",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "12–15",
    "rest": 45
  },
  {
    "id": "seated_cable_row",
    "name": "Remada no Pulley",
    "category": "Costas",
    "equipment": "cable",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "10–12",
    "rest": 60
  },
  {
    "id": "row_db",
    "name": "Remada Unilateral",
    "category": "Costas",
    "equipment": "dumbbells",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "10–12 cada",
    "rest": 60
  },
  {
    "id": "pullover",
    "name": "Pullover com Haltere",
    "category": "Costas",
    "equipment": "dumbbells",
    "difficulty": "Intermediário",
    "sets": 3,
    "reps": "12",
    "rest": 60
  },
  {
    "id": "reverse_fly",
    "name": "Voador Invertido",
    "category": "Costas",
    "equipment": "dumbbells",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "12–15",
    "rest": 45
  },
  {
    "id": "superman",
    "name": "Superman",
    "category": "Costas",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "15",
    "rest": 45
  },
  {
    "id": "leg_press_ex",
    "name": "Leg Press",
    "category": "Pernas",
    "equipment": "leg_press",
    "difficulty": "Intermediário",
    "sets": 4,
    "reps": "10–12",
    "rest": 90
  },
  {
    "id": "smith_squat",
    "name": "Agachamento no Smith",
    "category": "Pernas",
    "equipment": "smith",
    "difficulty": "Intermediário",
    "sets": 4,
    "reps": "10–12",
    "rest": 90
  },
  {
    "id": "leg_extension",
    "name": "Cadeira Extensora",
    "category": "Pernas",
    "equipment": "leg_machine",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "12–15",
    "rest": 60
  },
  {
    "id": "leg_curl",
    "name": "Cadeira Flexora",
    "category": "Pernas",
    "equipment": "leg_machine",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "12–15",
    "rest": 60
  },
  {
    "id": "adductor_machine",
    "name": "Cadeira Adutora",
    "category": "Pernas",
    "equipment": "leg_machine",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "15",
    "rest": 45
  },
  {
    "id": "abductor_machine",
    "name": "Cadeira Abdutora",
    "category": "Pernas",
    "equipment": "leg_machine",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "15",
    "rest": 45
  },
  {
    "id": "goblet_squat",
    "name": "Agachamento Goblet",
    "category": "Pernas",
    "equipment": "dumbbells",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "12",
    "rest": 75
  },
  {
    "id": "rdl",
    "name": "Levantamento Terra Romeno",
    "category": "Pernas",
    "equipment": "dumbbells",
    "difficulty": "Intermediário",
    "sets": 3,
    "reps": "10–12",
    "rest": 90
  },
  {
    "id": "squat",
    "name": "Agachamento Livre",
    "category": "Pernas",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 4,
    "reps": "12–15",
    "rest": 90
  },
  {
    "id": "lunge",
    "name": "Avanço",
    "category": "Pernas",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "10 cada",
    "rest": 60
  },
  {
    "id": "calf_raise",
    "name": "Elevação de Panturrilha",
    "category": "Pernas",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "20",
    "rest": 30
  },
  {
    "id": "wall_sit",
    "name": "Cadeira na Parede",
    "category": "Pernas",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "30–45s",
    "rest": 60,
    "isTime": true
  },
  {
    "id": "hip_thrust_machine",
    "name": "Elevação Pélvica na Máquina",
    "category": "Glúteos",
    "equipment": "hip_machine",
    "difficulty": "Intermediário",
    "sets": 4,
    "reps": "12–15",
    "rest": 60
  },
  {
    "id": "glute_machine_ex",
    "name": "Glúteo Máximo na Máquina",
    "category": "Glúteos",
    "equipment": "glute_machine",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "15",
    "rest": 45
  },
  {
    "id": "cable_kickback",
    "name": "Coice no Cabo",
    "category": "Glúteos",
    "equipment": "cable",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "15 cada",
    "rest": 45
  },
  {
    "id": "glute_bridge",
    "name": "Elevação de Quadril",
    "category": "Glúteos",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "15–20",
    "rest": 45
  },
  {
    "id": "donkey_kick",
    "name": "Coice de Burro",
    "category": "Glúteos",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "15 cada",
    "rest": 30
  },
  {
    "id": "fire_hydrant",
    "name": "Abdução Quadrupede",
    "category": "Glúteos",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "15 cada",
    "rest": 30
  },
  {
    "id": "sumo_squat",
    "name": "Agachamento Sumo",
    "category": "Glúteos",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "15",
    "rest": 45
  },
  {
    "id": "shoulder_machine_press",
    "name": "Desenvolvimento na Máquina",
    "category": "Ombros",
    "equipment": "shoulder_machine",
    "difficulty": "Iniciante",
    "sets": 4,
    "reps": "10–12",
    "rest": 75
  },
  {
    "id": "cable_lateral_raise",
    "name": "Elevação Lateral no Cabo",
    "category": "Ombros",
    "equipment": "cable",
    "difficulty": "Intermediário",
    "sets": 3,
    "reps": "12–15",
    "rest": 45
  },
  {
    "id": "shoulder_press",
    "name": "Desenvolvimento com Halteres",
    "category": "Ombros",
    "equipment": "dumbbells",
    "difficulty": "Intermediário",
    "sets": 4,
    "reps": "10–12",
    "rest": 90
  },
  {
    "id": "lateral_raise",
    "name": "Elevação Lateral",
    "category": "Ombros",
    "equipment": "dumbbells",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "12–15",
    "rest": 45
  },
  {
    "id": "front_raise",
    "name": "Elevação Frontal",
    "category": "Ombros",
    "equipment": "dumbbells",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "12",
    "rest": 45
  },
  {
    "id": "pike_pushup",
    "name": "Flexão Pike",
    "category": "Ombros",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "8–12",
    "rest": 60
  },
  {
    "id": "cable_pushdown",
    "name": "Tríceps no Pulley (Corda)",
    "category": "Braços",
    "equipment": "cable",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "12–15",
    "rest": 45
  },
  {
    "id": "cable_curl",
    "name": "Rosca no Cabo",
    "category": "Braços",
    "equipment": "cable",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "12",
    "rest": 45
  },
  {
    "id": "barbell_curl",
    "name": "Rosca Direta na Barra W",
    "category": "Braços",
    "equipment": "barbell",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "10–12",
    "rest": 45
  },
  {
    "id": "bicep_curl",
    "name": "Rosca Bíceps",
    "category": "Braços",
    "equipment": "dumbbells",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "12",
    "rest": 45
  },
  {
    "id": "hammer_curl",
    "name": "Rosca Martelo",
    "category": "Braços",
    "equipment": "dumbbells",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "12",
    "rest": 45
  },
  {
    "id": "tricep_ext",
    "name": "Extensão Tríceps com Haltere",
    "category": "Braços",
    "equipment": "dumbbells",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "12",
    "rest": 45
  },
  {
    "id": "tricep_dip",
    "name": "Tríceps no Banco",
    "category": "Braços",
    "equipment": "bench",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "10–15",
    "rest": 45
  },
  {
    "id": "cable_crunch",
    "name": "Abdominal no Cabo",
    "category": "Core",
    "equipment": "cable",
    "difficulty": "Intermediário",
    "sets": 3,
    "reps": "15",
    "rest": 45
  },
  {
    "id": "plank",
    "name": "Prancha Isométrica",
    "category": "Core",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "30–45s",
    "rest": 45,
    "isTime": true
  },
  {
    "id": "crunch",
    "name": "Abdominal Crunch",
    "category": "Core",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "20",
    "rest": 30
  },
  {
    "id": "leg_raise",
    "name": "Elevação de Pernas",
    "category": "Core",
    "equipment": "bodyweight",
    "difficulty": "Intermediário",
    "sets": 3,
    "reps": "12–15",
    "rest": 45
  },
  {
    "id": "russian_twist",
    "name": "Giro Russo",
    "category": "Core",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "20 total",
    "rest": 30
  },
  {
    "id": "dead_bug",
    "name": "Dead Bug",
    "category": "Core",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "10 cada",
    "rest": 30
  },
  {
    "id": "jumping_jack",
    "name": "Polichinelo",
    "category": "Cardio",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "40",
    "rest": 30
  },
  {
    "id": "high_knees",
    "name": "Corrida Estacionária",
    "category": "Cardio",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "30s",
    "rest": 30,
    "isTime": true
  },
  {
    "id": "step_touch",
    "name": "Step Touch",
    "category": "Cardio",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "45s",
    "rest": 30,
    "isTime": true
  },
  {
    "id": "burpee",
    "name": "Burpee",
    "category": "Cardio",
    "equipment": "bodyweight",
    "difficulty": "Intermediário",
    "sets": 3,
    "reps": "10",
    "rest": 60
  },
  {
    "id": "march_place",
    "name": "Marcha Estacionária",
    "category": "Cardio",
    "equipment": "bodyweight",
    "difficulty": "Iniciante",
    "sets": 3,
    "reps": "60s",
    "rest": 20,
    "isTime": true
  },
  {
    "id": "treadmill",
    "name": "Esteira",
    "category": "Cardio",
    "equipment": "cardio_machine",
    "difficulty": "Iniciante",
    "sets": 1,
    "reps": "10 min",
    "rest": 0,
    "isTime": true
  },
  {
    "id": "bike_cardio",
    "name": "Bike Ergométrica",
    "category": "Cardio",
    "equipment": "cardio_machine",
    "difficulty": "Iniciante",
    "sets": 1,
    "reps": "10 min",
    "rest": 0,
    "isTime": true
  }
];

export const COMBO_EQUIPMENT: Record<string, string[]> = {
  "uno": [
    "bodyweight",
    "dumbbells",
    "barbell",
    "bench",
    "cable",
    "cardio_machine"
  ],
  "duo": [
    "bodyweight",
    "dumbbells",
    "barbell",
    "bench",
    "cable",
    "cardio_machine",
    "smith",
    "leg_machine"
  ],
  "triple": [
    "bodyweight",
    "dumbbells",
    "barbell",
    "bench",
    "cable",
    "cardio_machine",
    "smith",
    "leg_machine",
    "leg_press",
    "chest_back_machine"
  ],
  "prime": [
    "bodyweight",
    "dumbbells",
    "barbell",
    "bench",
    "cable",
    "cardio_machine",
    "smith",
    "leg_machine",
    "leg_press",
    "chest_back_machine",
    "glute_machine"
  ],
  "elite": [
    "bodyweight",
    "dumbbells",
    "barbell",
    "bench",
    "cable",
    "cardio_machine",
    "smith",
    "leg_machine",
    "leg_press",
    "chest_back_machine",
    "glute_machine",
    "shoulder_machine",
    "lat_pulldown",
    "hip_machine"
  ]
};

export const LIMITATION_BLOCKED: Record<string, string[]> = {
  "knee": [
    "squat",
    "lunge",
    "goblet_squat",
    "jumping_jack",
    "burpee",
    "high_knees",
    "wall_sit",
    "sumo_squat",
    "leg_press_ex",
    "smith_squat",
    "leg_extension"
  ],
  "shoulder": [
    "shoulder_press",
    "pike_pushup",
    "db_press",
    "front_raise",
    "lateral_raise",
    "pushup",
    "shoulder_machine_press",
    "cable_lateral_raise",
    "smith_bench_press"
  ],
  "back": [
    "rdl",
    "superman",
    "row_db",
    "pullover",
    "deadlift",
    "seated_cable_row",
    "lat_pulldown_ex"
  ]
};
