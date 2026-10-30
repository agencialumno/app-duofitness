# Músculos dos exercícios (referência cruzada com o free-exercise-db)

Gerado por `scripts/cruzar-exercicios.mjs` a partir de `EXERCISE_DB` (`src/utils/workoutGenerator.js`, 59 exercícios) e do banco **free-exercise-db** (876 exercícios, em inglês). Serve para escolher o **músculo principal em inglês** nos prompts de vídeo (`docs/videos-prompts.md`) e para o educador físico conferir os músculos de cada exercício.

## Fonte e licença

- Banco: **free-exercise-db**, de yuhonas (https://github.com/yuhonas/free-exercise-db), licença **Unlicense** (domínio público). Uso permitido sem restrição, inclusive comercial; mesmo assim ficam registrados o autor e o endereço.
- **Só os campos de músculo e equipamento** (e o nome do exercício do banco, para identificar o par) foram usados. **Nenhuma instrução e nenhuma imagem do banco foi copiada para este repositório**, e o JSON do banco não é versionado.
- **Ressalva: as fotos do banco não foram usadas.** Elas têm origem e direitos próprios e não entram no app nem nos vídeos.
- Os músculos do banco são uma **classificação genérica de uma base aberta**, não uma avaliação de educador físico: por isso as linhas de confiança média e sem correspondência ficam marcadas para revisão.

## Como foi feito o cruzamento

1. **Nome:** o banco é em inglês e o app em português, então o nome não bate sozinho. Para cada id do app há um par conferido à mão (tabela `ALIASES` no script) e o script confirma que o nome existe no banco (sem acento nem caixa).
2. **Equipamento + músculo:** para quem não tem par por nome, busca por palavras-chave com equipamento e músculo principal compatíveis. Só vale com **exatamente um** candidato.
3. **Confiança:** **alta** = é o mesmo exercício, com equipamento e músculo principal compatíveis; **média** = variação, equipamento ou músculo diferente, ou achado só por palavra-chave; **sem correspondência** = na dúvida, não se inventa par.

Como regenerar: baixe o JSON (https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json) e rode `node scripts/cruzar-exercicios.mjs --db <caminho do JSON>`.

## Resumo

- **Alta:** 34 · **Média:** 13 · **Sem correspondência:** 12 · **A revisar:** 25 de 59.
- Nas linhas **sem correspondência**, o músculo vem do próprio app (marcado com †) e **não foi confirmado** pelo banco.

## Tabela

Músculos em português (e, na coluna seguinte, em inglês, para usar no prompt do vídeo). † = deduzido do app, sem confirmação do banco.

| id do app | Nome | Equipamento | Músculo principal | Principal (EN) | Secundários | Nível | Correspondência no banco | Confiança | Revisar |
|---|---|---|---|---|---|---|---|---|---|
| `chest_press_machine` | Supino na Máquina (Peitoral Dorsal) | máquina peitoral/dorsal | peitoral | chest | ombros, tríceps | iniciante | Machine Bench Press | alta |  |
| `smith_bench_press` | Supino no Smith | Smith | peitoral | chest | ombros, tríceps | intermediário | Smith Machine Bench Press | alta |  |
| `cable_crossover` | Crucifixo no Cabo | cabo (polia) | peitoral | chest | ombros | intermediário | Cable Crossover | alta |  |
| `db_press` | Supino com Halteres | halteres | peitoral | chest | ombros, tríceps | intermediário | Dumbbell Bench Press | alta |  |
| `db_fly` | Crucifixo com Halteres | halteres | peitoral | chest | — | intermediário | Dumbbell Flyes | alta |  |
| `pushup` | Flexão de Braço | peso do corpo | peitoral | chest | ombros, tríceps | iniciante | Pushups | alta |  |
| `incline_pushup` | Flexão Inclinada | peso do corpo | peitoral | chest | ombros, tríceps | iniciante | Incline Push-Up | alta |  |
| `lat_pulldown_ex` | Puxada Alta | puxada alta | dorsais | lats | bíceps, costas (parte média), ombros | intermediário | Wide-Grip Lat Pulldown | alta |  |
| `rear_delt_machine` | Voador Invertido na Máquina | máquina peitoral/dorsal | ombros | shoulders | — | iniciante | Reverse Machine Flyes (músculo principal do banco (ombros) difere do app) | média | ⚠ revisar |
| `seated_cable_row` | Remada no Pulley | cabo (polia) | costas (parte média) | middle back | bíceps, dorsais, ombros | iniciante | Seated Cable Rows (músculo principal do banco (costas (parte média)) difere do app) | média | ⚠ revisar |
| `row_db` | Remada Unilateral | halteres | costas (parte média) | middle back | bíceps, dorsais, ombros | iniciante | One-Arm Dumbbell Row (músculo principal do banco (costas (parte média)) difere do app) | média | ⚠ revisar |
| `pullover` | Pullover com Haltere | halteres | peitoral | chest | dorsais, ombros, tríceps | intermediário | Bent-Arm Dumbbell Pullover (variação do exercício; músculo principal do banco (peitoral) difere do app) | média | ⚠ revisar |
| `reverse_fly` | Voador Invertido | halteres | ombros | shoulders | — | iniciante | Reverse Flyes (músculo principal do banco (ombros) difere do app) | média | ⚠ revisar |
| `superman` | Superman | peso do corpo | lombar | lower back | glúteos, isquiotibiais | iniciante | Superman | alta |  |
| `leg_press_ex` | Leg Press | leg press | quadríceps | quadriceps | panturrilhas, glúteos, isquiotibiais | intermediário | Leg Press | alta |  |
| `smith_squat` | Agachamento no Smith | Smith | quadríceps | quadriceps | panturrilhas, glúteos, isquiotibiais, lombar | intermediário | Smith Machine Squat | alta |  |
| `leg_extension` | Cadeira Extensora | máquina de pernas | quadríceps | quadriceps | — | iniciante | Leg Extensions | alta |  |
| `leg_curl` | Cadeira Flexora | máquina de pernas | isquiotibiais | hamstrings | — | iniciante | Seated Leg Curl | alta |  |
| `adductor_machine` | Cadeira Adutora | máquina de pernas | adutores | adductors | glúteos, isquiotibiais | iniciante | Thigh Adductor | alta |  |
| `abductor_machine` | Cadeira Abdutora | máquina de pernas | abdutores | abductors | glúteos | iniciante | Thigh Abductor | alta |  |
| `goblet_squat` | Agachamento Goblet | halteres | quadríceps | quadriceps | panturrilhas, glúteos, isquiotibiais, ombros | iniciante | Goblet Squat (equipamento do banco: kettlebells) | média | ⚠ revisar |
| `rdl` | Levantamento Terra Romeno | halteres | isquiotibiais | hamstrings | panturrilhas, glúteos, lombar | intermediário | Romanian Deadlift (equipamento do banco: barbell) | média | ⚠ revisar |
| `squat` | Agachamento Livre | peso do corpo | quadríceps | quadriceps | glúteos, isquiotibiais | iniciante | Bodyweight Squat | alta |  |
| `lunge` | Avanço | peso do corpo | quadríceps | quadriceps | panturrilhas, glúteos, isquiotibiais | iniciante | Bodyweight Walking Lunge (variação do exercício) | média | ⚠ revisar |
| `calf_raise` | Elevação de Panturrilha | peso do corpo | panturrilhas † | calves | — | iniciante | — (o banco não tem elevação de panturrilha em pé só com o peso do corpo) | sem correspondência | ⚠ revisar |
| `wall_sit` | Cadeira na Parede | peso do corpo | quadríceps † | quadriceps | glúteos † | iniciante | — (o banco não tem a cadeira na parede) | sem correspondência | ⚠ revisar |
| `hip_thrust_machine` | Elevação Pélvica na Máquina | máquina de quadril | glúteos | glutes | panturrilhas, isquiotibiais | intermediário | Barbell Hip Thrust (variação do exercício; equipamento do banco: barbell) | média | ⚠ revisar |
| `glute_machine_ex` | Glúteo Máximo na Máquina | máquina de glúteo | glúteos † | glutes | — | iniciante | — (o banco não tem máquina de glúteo) | sem correspondência | ⚠ revisar |
| `cable_kickback` | Coice no Cabo | cabo (polia) | glúteos | glutes | isquiotibiais | iniciante | One-Legged Cable Kickback | alta |  |
| `glute_bridge` | Elevação de Quadril | peso do corpo | glúteos | glutes | isquiotibiais | iniciante | Butt Lift (Bridge) | alta |  |
| `donkey_kick` | Coice de Burro | peso do corpo | glúteos | glutes | isquiotibiais | iniciante | Glute Kickback (variação do exercício) | média | ⚠ revisar |
| `fire_hydrant` | Abdução Quadrupede | peso do corpo | glúteos † | glutes | — | iniciante | — (o banco não tem a abdução em quatro apoios) | sem correspondência | ⚠ revisar |
| `sumo_squat` | Agachamento Sumo | peso do corpo | glúteos † | glutes | adutores, quadríceps † | iniciante | — (o banco só tem terra sumô, que é outro exercício) | sem correspondência | ⚠ revisar |
| `shoulder_machine_press` | Desenvolvimento na Máquina | máquina de ombros | ombros | shoulders | tríceps | iniciante | Machine Shoulder (Military) Press | alta |  |
| `cable_lateral_raise` | Elevação Lateral no Cabo | cabo (polia) | ombros | shoulders | costas (parte média), trapézio | intermediário | Cable Seated Lateral Raise (variação do exercício) | média | ⚠ revisar |
| `shoulder_press` | Desenvolvimento com Halteres | halteres | ombros | shoulders | tríceps | intermediário | Dumbbell Shoulder Press | alta |  |
| `lateral_raise` | Elevação Lateral | halteres | ombros | shoulders | — | iniciante | Side Lateral Raise | alta |  |
| `front_raise` | Elevação Frontal | halteres | ombros | shoulders | — | iniciante | Front Dumbbell Raise | alta |  |
| `pike_pushup` | Flexão Pike | peso do corpo | ombros † | shoulders | tríceps † | iniciante | — (o banco não tem a flexão pike) | sem correspondência | ⚠ revisar |
| `cable_pushdown` | Tríceps no Pulley (Corda) | cabo (polia) | tríceps | triceps | — | iniciante | Triceps Pushdown - Rope Attachment | alta |  |
| `cable_curl` | Rosca no Cabo | cabo (polia) | bíceps | biceps | — | iniciante | Standing Biceps Cable Curl | alta |  |
| `barbell_curl` | Rosca Direta na Barra W | barra W | bíceps | biceps | — | iniciante | EZ-Bar Curl | alta |  |
| `bicep_curl` | Rosca Bíceps | halteres | bíceps | biceps | antebraços | iniciante | Dumbbell Bicep Curl | alta |  |
| `hammer_curl` | Rosca Martelo | halteres | bíceps | biceps | — | iniciante | Hammer Curls | alta |  |
| `tricep_ext` | Extensão Tríceps com Haltere | halteres | tríceps | triceps | — | iniciante | Standing Dumbbell Triceps Extension | alta |  |
| `tricep_dip` | Tríceps no Banco | banco | tríceps | triceps | peitoral, ombros | iniciante | Bench Dips | alta |  |
| `cable_crunch` | Abdominal no Cabo | cabo (polia) | abdômen | abdominals | — | intermediário | Cable Crunch | alta |  |
| `plank` | Prancha Isométrica | peso do corpo | abdômen | abdominals | — | iniciante | Plank | alta |  |
| `crunch` | Abdominal Crunch | peso do corpo | abdômen | abdominals | — | iniciante | Crunches | alta |  |
| `leg_raise` | Elevação de Pernas | peso do corpo | abdômen | abdominals | — | intermediário | Flat Bench Lying Leg Raise (variação do exercício) | média | ⚠ revisar |
| `russian_twist` | Giro Russo | peso do corpo | abdômen | abdominals | lombar | iniciante | Russian Twist | alta |  |
| `dead_bug` | Dead Bug | peso do corpo | abdômen | abdominals | — | iniciante | Dead Bug | alta |  |
| `jumping_jack` | Polichinelo | peso do corpo | cardiovascular † | (sem equivalente) | — | iniciante | — ("Star Jump" do banco é um salto, outro movimento) | sem correspondência | ⚠ revisar |
| `high_knees` | Corrida Estacionária | peso do corpo | cardiovascular † | (sem equivalente) | core † | iniciante | — (o banco não tem a corrida estacionária) | sem correspondência | ⚠ revisar |
| `step_touch` | Step Touch | peso do corpo | cardiovascular † | (sem equivalente) | — | iniciante | — (o banco não tem o step touch) | sem correspondência | ⚠ revisar |
| `burpee` | Burpee | peso do corpo | corpo todo † | (sem equivalente) | — | intermediário | — (o banco não tem o burpee) | sem correspondência | ⚠ revisar |
| `march_place` | Marcha Estacionária | peso do corpo | cardiovascular † | (sem equivalente) | — | iniciante | — (o banco não tem a marcha estacionária) | sem correspondência | ⚠ revisar |
| `treadmill` | Esteira | aparelho cardio | cardiovascular † | (sem equivalente) | — | iniciante | — (o banco tem 3 pares (caminhada, trote e corrida na esteira) e o app não diz qual: ambíguo) | sem correspondência | ⚠ revisar |
| `bike_cardio` | Bike Ergométrica | aparelho cardio | quadríceps | quadriceps | panturrilhas, glúteos, isquiotibiais | iniciante | Bicycling, Stationary (músculo do app não comparável) | média | ⚠ revisar |

## Para o educador físico

Confira, nas linhas marcadas "revisar": (1) se o músculo principal e os secundários estão certos para o exercício **como o app o ensina** (as instruções do app mandam); (2) se o par do banco é de fato o mesmo movimento; (3) o músculo principal em inglês que irá para o prompt do vídeo.

