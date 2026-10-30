// Cruza os exercícios do app (EXERCISE_DB em src/utils/workoutGenerator.js) com o banco free-exercise-db (Unlicense, yuhonas/free-exercise-db,
// em inglês) SÓ para obter músculo principal, músculos secundários e equipamento. Não copia instruções nem imagens do banco: só os campos de
// músculo e equipamento (e o nome do exercício do banco, para saber qual foi o par). Gera docs/musculos-exercicios.md.
//
// Como acha o par (nunca inventa; na dúvida, "sem correspondência"):
//  1. NOME: o banco está em inglês e o app em português, então o nome não bate sozinho. A tabela ALIASES abaixo diz, para cada id do app, o nome
//     EXATO do banco que corresponde (conferido à mão). O script normaliza (sem acento, sem caixa) e só aceita se o nome existir no banco.
//     Cada alias é "eq" (é o mesmo exercício) ou "var" (é uma variação: outra pegada, outro implemento).
//  2. EQUIPAMENTO + MÚSCULO quando não há alias: palavras-chave em inglês (KEYWORDS) no nome do banco, com o equipamento e o músculo principal
//     compatíveis com os do app. Só vale se der EXATAMENTE UM candidato; vários ou nenhum = sem correspondência.
//  Confiança: ALTA = alias "eq" e equipamento e músculo principal compatíveis; MÉDIA = alias "var", ou equipamento/músculo diferente, ou par
//  achado só por palavra-chave; SEM CORRESPONDÊNCIA = o resto. Média e sem correspondência ficam marcadas "revisar" para o educador físico.
//
// Uso: node scripts/cruzar-exercicios.mjs [--db docs/referencia/free-exercise-db.json] [--out docs/musculos-exercicios.md] [--app src/utils/workoutGenerator.js]
// O JSON do banco NÃO é versionado (tem instruções e caminhos de imagens): baixe de
// https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const root = path.resolve(here, '..');
const dbPath = path.resolve(arg('--db', path.join(root, 'docs/referencia/free-exercise-db.json')));
const outPath = path.resolve(arg('--out', path.join(root, 'docs/musculos-exercicios.md')));
const appPath = path.resolve(arg('--app', path.join(root, 'src/utils/workoutGenerator.js')));

// ---------- normalização e traduções ----------
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// músculos do banco (inglês) -> português (uso consistente em todo o documento)
export const MUSCLE_PT = {
  abdominals: 'abdômen', abductors: 'abdutores', adductors: 'adutores', biceps: 'bíceps', calves: 'panturrilhas', chest: 'peitoral',
  forearms: 'antebraços', glutes: 'glúteos', hamstrings: 'isquiotibiais', lats: 'dorsais', 'lower back': 'lombar', 'middle back': 'costas (parte média)',
  neck: 'pescoço', quadriceps: 'quadríceps', shoulders: 'ombros', traps: 'trapézio', triceps: 'tríceps',
};
// músculos do app (português) -> banco (inglês). Lista vazia = não há equivalente (não se compara).
export const APP_MUSCLE_EN = {
  'Peitoral': ['chest'], 'Peitoral superior': ['chest'], 'Tríceps': ['triceps'], 'Deltóide': ['shoulders'], 'Deltóide anterior': ['shoulders'], 'Deltóide lateral': ['shoulders'],
  'Ombros': ['shoulders'], 'Grande dorsal': ['lats'], 'Bíceps': ['biceps'], 'Braquial': ['biceps'], 'Rombóide': ['middle back'], 'Trapézio médio': ['traps', 'middle back'],
  'Serrátil': [], 'Lombar': ['lower back'], 'Glúteos': ['glutes'], 'Glúteo médio': ['glutes', 'abductors'], 'Quadríceps': ['quadriceps'], 'Isquiotibiais': ['hamstrings'],
  'Adutores': ['adductors'], 'Panturrilha': ['calves'], 'Reto abdominal': ['abdominals'], 'Abdômen inferior': ['abdominals'], 'Abdômen': ['abdominals'], 'Core': ['abdominals'],
  'Core profundo': ['abdominals'], 'Oblíquos': ['abdominals'], 'Estabilizadores': [], 'Cardiovascular': [], 'Corpo todo': [],
};
const EQUIP_PT = {
  bodyweight: 'peso do corpo', dumbbells: 'halteres', cable: 'cabo (polia)', bench: 'banco', barbell: 'barra W', smith: 'Smith', chest_back_machine: 'máquina peitoral/dorsal',
  lat_pulldown: 'puxada alta', leg_press: 'leg press', leg_machine: 'máquina de pernas', hip_machine: 'máquina de quadril', glute_machine: 'máquina de glúteo',
  shoulder_machine: 'máquina de ombros', cardio_machine: 'aparelho cardio',
};
// equipamento do app -> equipamentos do banco que são compatíveis (null = o banco não informa)
const EQUIP_DB = {
  bodyweight: ['body only', null], dumbbells: ['dumbbell'], cable: ['cable'], bench: ['body only', 'other'], barbell: ['e-z curl bar', 'barbell'],
  smith: ['machine'], chest_back_machine: ['machine'], lat_pulldown: ['machine', 'cable'], leg_press: ['machine'], leg_machine: ['machine'], hip_machine: ['machine'],
  glute_machine: ['machine'], shoulder_machine: ['machine'], cardio_machine: ['machine', 'other'],
};
const LEVEL_PT = { beginner: 'iniciante', intermediate: 'intermediário', expert: 'avançado' };

// ---------- pares conferidos à mão: id do app -> [nome exato no banco, "eq" | "var"] ----------
export const ALIASES = {
  chest_press_machine: ['Machine Bench Press', 'eq'], smith_bench_press: ['Smith Machine Bench Press', 'eq'], cable_crossover: ['Cable Crossover', 'eq'],
  db_press: ['Dumbbell Bench Press', 'eq'], db_fly: ['Dumbbell Flyes', 'eq'], pushup: ['Pushups', 'eq'], incline_pushup: ['Incline Push-Up', 'eq'],
  lat_pulldown_ex: ['Wide-Grip Lat Pulldown', 'eq'], rear_delt_machine: ['Reverse Machine Flyes', 'eq'], seated_cable_row: ['Seated Cable Rows', 'eq'],
  row_db: ['One-Arm Dumbbell Row', 'eq'], pullover: ['Bent-Arm Dumbbell Pullover', 'var'], reverse_fly: ['Reverse Flyes', 'eq'], superman: ['Superman', 'eq'],
  leg_press_ex: ['Leg Press', 'eq'], smith_squat: ['Smith Machine Squat', 'eq'], leg_extension: ['Leg Extensions', 'eq'], leg_curl: ['Seated Leg Curl', 'eq'],
  adductor_machine: ['Thigh Adductor', 'eq'], abductor_machine: ['Thigh Abductor', 'eq'], goblet_squat: ['Goblet Squat', 'eq'], rdl: ['Romanian Deadlift', 'eq'],
  squat: ['Bodyweight Squat', 'eq'], lunge: ['Bodyweight Walking Lunge', 'var'], hip_thrust_machine: ['Barbell Hip Thrust', 'var'], cable_kickback: ['One-Legged Cable Kickback', 'eq'],
  glute_bridge: ['Butt Lift (Bridge)', 'eq'], donkey_kick: ['Glute Kickback', 'var'], shoulder_machine_press: ['Machine Shoulder (Military) Press', 'eq'],
  cable_lateral_raise: ['Cable Seated Lateral Raise', 'var'], shoulder_press: ['Dumbbell Shoulder Press', 'eq'], lateral_raise: ['Side Lateral Raise', 'eq'],
  front_raise: ['Front Dumbbell Raise', 'eq'], cable_pushdown: ['Triceps Pushdown - Rope Attachment', 'eq'], cable_curl: ['Standing Biceps Cable Curl', 'eq'],
  barbell_curl: ['EZ-Bar Curl', 'eq'], bicep_curl: ['Dumbbell Bicep Curl', 'eq'], hammer_curl: ['Hammer Curls', 'eq'], tricep_ext: ['Standing Dumbbell Triceps Extension', 'eq'],
  tricep_dip: ['Bench Dips', 'eq'], cable_crunch: ['Cable Crunch', 'eq'], plank: ['Plank', 'eq'], crunch: ['Crunches', 'eq'], leg_raise: ['Flat Bench Lying Leg Raise', 'var'],
  russian_twist: ['Russian Twist', 'eq'], dead_bug: ['Dead Bug', 'eq'], bike_cardio: ['Bicycling, Stationary', 'eq'],
  // de propósito SEM par (o banco não tem o equivalente, ou há mais de um e o app não diz qual): glute_machine_ex, calf_raise (em pé, sem carga), wall_sit,
  // fire_hydrant, sumo_squat (agachamento, não terra sumô), pike_pushup, jumping_jack ("Star Jump" é outro), high_knees, step_touch, burpee, march_place,
  // treadmill (o banco tem caminhada, trote e corrida na esteira: três pares possíveis).
};
// por que NÃO há par (mostrado na tabela, para o educador físico saber que foi procurado)
export const NOTAS_SEM = {
  glute_machine_ex: 'o banco não tem máquina de glúteo', calf_raise: 'o banco não tem elevação de panturrilha em pé só com o peso do corpo',
  wall_sit: 'o banco não tem a cadeira na parede', fire_hydrant: 'o banco não tem a abdução em quatro apoios', sumo_squat: 'o banco só tem terra sumô, que é outro exercício',
  pike_pushup: 'o banco não tem a flexão pike', jumping_jack: '"Star Jump" do banco é um salto, outro movimento', high_knees: 'o banco não tem a corrida estacionária',
  step_touch: 'o banco não tem o step touch', burpee: 'o banco não tem o burpee', march_place: 'o banco não tem a marcha estacionária',
  treadmill: 'o banco tem 3 pares (caminhada, trote e corrida na esteira) e o app não diz qual: ambíguo',
};
// palavras-chave (inglês) para a busca por equipamento + músculo quando não há alias
export const KEYWORDS = {
  glute_machine_ex: ['glute', 'machine'], calf_raise: ['calf', 'raise'], wall_sit: ['wall', 'sit'], fire_hydrant: ['hydrant'], sumo_squat: ['sumo', 'squat'],
  pike_pushup: ['pike', 'push'], jumping_jack: ['jumping', 'jack'], high_knees: ['high', 'knees'], step_touch: ['step', 'touch'], burpee: ['burpee'],
  march_place: ['march'], treadmill: ['treadmill'],
};

// ---------- leitura do app (sem importar o módulo: ele importa outro sem extensão) ----------
export function readAppExercises(file) {
  const src = readFileSync(file, 'utf8');
  const start = src.indexOf('export const EXERCISE_DB');
  const body = src.slice(start, src.indexOf('\n};', start));
  const out = [];
  const re = /\{ id: '([^']+)', name: '([^']+)', muscleGroup: \[([^\]]*)\], difficulty: '([^']+)', equipment: '([^']+)'[^\n]*?category: '([^']+)'/g;
  let m;
  while ((m = re.exec(body))) out.push({ id: m[1], name: m[2], groups: [...m[3].matchAll(/'([^']+)'/g)].map((x) => x[1]), level: m[4], equipment: m[5], category: m[6] });
  return out;
}

// ---------- cruzamento ----------
export function match(app, db) {
  const byName = new Map(db.map((e) => [norm(e.name), e]));
  const expectMuscles = (APP_MUSCLE_EN[app.groups[0]] ?? []);
  const equipOk = (e) => (EQUIP_DB[app.equipment] ?? []).includes(e.equipment ?? null);
  const muscleOk = (e) => expectMuscles.length > 0 && expectMuscles.includes(e.primaryMuscles?.[0]);

  const alias = ALIASES[app.id];
  if (alias) {
    const hit = byName.get(norm(alias[0]));
    if (!hit) return { entry: null, confidence: 'sem', reason: `alias "${alias[0]}" não existe neste banco (versão diferente?)` };
    const notes = [];
    if (alias[1] === 'var') notes.push('variação do exercício');
    if (!equipOk(hit)) notes.push(`equipamento do banco: ${hit.equipment ?? 'não informado'}`);
    if (!muscleOk(hit)) notes.push(expectMuscles.length ? `músculo principal do banco (${MUSCLE_PT[hit.primaryMuscles?.[0]] ?? '?'}) difere do app` : 'músculo do app não comparável');
    return { entry: hit, confidence: notes.length ? 'media' : 'alta', reason: notes.join('; ') };
  }
  const kw = KEYWORDS[app.id];
  if (kw) {
    const cands = db.filter((e) => kw.every((k) => norm(e.name).split(' ').some((w) => w.startsWith(k))) && equipOk(e) && muscleOk(e));
    if (cands.length === 1) return { entry: cands[0], confidence: 'media', reason: 'achado só por palavra-chave, equipamento e músculo' };
    const why = cands.length > 1 ? `${cands.length} candidatos possíveis (ambíguo)` : (NOTAS_SEM[app.id] ?? 'nenhum candidato com o mesmo equipamento e músculo');
    return { entry: null, confidence: 'sem', reason: why };
  }
  return { entry: null, confidence: 'sem', reason: 'sem par conhecido' };
}

const ptMuscle = (m) => MUSCLE_PT[m] ?? m;
export function rowFor(app, db) {
  const r = match(app, db);
  const e = r.entry;
  let primaryEn; let primaryPt; let secondary; let source;
  if (e && e.primaryMuscles?.length) {
    primaryEn = e.primaryMuscles.join(', ');
    primaryPt = e.primaryMuscles.map(ptMuscle).join(', ');
    secondary = (e.secondaryMuscles ?? []).map(ptMuscle).join(', ') || '—';
    source = 'banco';
  } else {
    const en = [...new Set((APP_MUSCLE_EN[app.groups[0]] ?? []))];
    primaryEn = en.length ? en[0] : '(sem equivalente)';
    primaryPt = en.length ? ptMuscle(en[0]) : app.groups[0].toLowerCase();
    secondary = app.groups.slice(1).map((g) => g.toLowerCase()).join(', ') || '—';
    source = 'app';
  }
  return { app, ...r, primaryEn, primaryPt, secondary, source, review: r.confidence !== 'alta' };
}

export function build(apps, db) {
  const rows = apps.map((a) => rowFor(a, db));
  const count = (c) => rows.filter((r) => r.confidence === c).length;
  const L = [];
  L.push('# Músculos dos exercícios (referência cruzada com o free-exercise-db)\n');
  L.push(`Gerado por \`scripts/cruzar-exercicios.mjs\` a partir de \`EXERCISE_DB\` (\`src/utils/workoutGenerator.js\`, ${apps.length} exercícios) e do banco **free-exercise-db** (${db.length} exercícios, em inglês). Serve para escolher o **músculo principal em inglês** nos prompts de vídeo (\`docs/videos-prompts.md\`) e para o educador físico conferir os músculos de cada exercício.\n`);
  L.push('## Fonte e licença\n');
  L.push('- Banco: **free-exercise-db**, de yuhonas (https://github.com/yuhonas/free-exercise-db), licença **Unlicense** (domínio público). Uso permitido sem restrição, inclusive comercial; mesmo assim ficam registrados o autor e o endereço.');
  L.push('- **Só os campos de músculo e equipamento** (e o nome do exercício do banco, para identificar o par) foram usados. **Nenhuma instrução e nenhuma imagem do banco foi copiada para este repositório**, e o JSON do banco não é versionado.');
  L.push('- **Ressalva: as fotos do banco não foram usadas.** Elas têm origem e direitos próprios e não entram no app nem nos vídeos.');
  L.push('- Os músculos do banco são uma **classificação genérica de uma base aberta**, não uma avaliação de educador físico: por isso as linhas de confiança média e sem correspondência ficam marcadas para revisão.\n');
  L.push('## Como foi feito o cruzamento\n');
  L.push('1. **Nome:** o banco é em inglês e o app em português, então o nome não bate sozinho. Para cada id do app há um par conferido à mão (tabela `ALIASES` no script) e o script confirma que o nome existe no banco (sem acento nem caixa).');
  L.push('2. **Equipamento + músculo:** para quem não tem par por nome, busca por palavras-chave com equipamento e músculo principal compatíveis. Só vale com **exatamente um** candidato.');
  L.push('3. **Confiança:** **alta** = é o mesmo exercício, com equipamento e músculo principal compatíveis; **média** = variação, equipamento ou músculo diferente, ou achado só por palavra-chave; **sem correspondência** = na dúvida, não se inventa par.\n');
  L.push('Como regenerar: baixe o JSON (https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json) e rode `node scripts/cruzar-exercicios.mjs --db <caminho do JSON>`.\n');
  L.push('## Resumo\n');
  L.push(`- **Alta:** ${count('alta')} · **Média:** ${count('media')} · **Sem correspondência:** ${count('sem')} · **A revisar:** ${rows.filter((r) => r.review).length} de ${rows.length}.`);
  L.push('- Nas linhas **sem correspondência**, o músculo vem do próprio app (marcado com †) e **não foi confirmado** pelo banco.\n');
  L.push('## Tabela\n');
  L.push('Músculos em português (e, na coluna seguinte, em inglês, para usar no prompt do vídeo). † = deduzido do app, sem confirmação do banco.\n');
  L.push('| id do app | Nome | Equipamento | Músculo principal | Principal (EN) | Secundários | Nível | Correspondência no banco | Confiança | Revisar |');
  L.push('|---|---|---|---|---|---|---|---|---|---|');
  const CONF = { alta: 'alta', media: 'média', sem: 'sem correspondência' };
  for (const r of rows) {
    const a = r.app;
    const dag = r.source === 'app' ? ' †' : '';
    const bank = r.entry ? `${r.entry.name}${r.reason ? ` (${r.reason})` : ''}` : `— (${r.reason})`;
    L.push(`| \`${a.id}\` | ${a.name} | ${EQUIP_PT[a.equipment] ?? a.equipment} | ${r.primaryPt}${dag} | ${r.primaryEn} | ${r.secondary}${dag && r.secondary !== '—' ? ' †' : ''} | ${a.level.toLowerCase()} | ${bank} | ${CONF[r.confidence]} | ${r.review ? '⚠ revisar' : ''} |`);
  }
  L.push('');
  L.push('## Para o educador físico\n');
  L.push('Confira, nas linhas marcadas "revisar": (1) se o músculo principal e os secundários estão certos para o exercício **como o app o ensina** (as instruções do app mandam); (2) se o par do banco é de fato o mesmo movimento; (3) o músculo principal em inglês que irá para o prompt do vídeo.\n');
  return { text: L.join('\n') + '\n', rows };
}

function main() {
  if (!existsSync(dbPath)) {
    console.error(`ERRO: não achei o banco em ${dbPath}.\nBaixe https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json e use --db <caminho>.`);
    process.exit(1);
  }
  const db = JSON.parse(readFileSync(dbPath, 'utf8'));
  const apps = readAppExercises(appPath);
  if (apps.length === 0) { console.error('ERRO: nenhum exercício lido do app.'); process.exit(1); }
  const { text, rows } = build(apps, db);
  writeFileSync(outPath, text, 'utf8');
  const c = (k) => rows.filter((r) => r.confidence === k).length;
  console.log(`${apps.length} exercícios do app x ${db.length} do banco: alta ${c('alta')}, média ${c('media')}, sem correspondência ${c('sem')}. Gravado em ${path.relative(root, outPath)}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
