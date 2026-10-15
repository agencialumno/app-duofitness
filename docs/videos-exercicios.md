# Vídeos dos exercícios

Cada exercício do catálogo (`EXERCISE_DB`) pode ter um **vídeo curto de demonstração** e uma **capa**. Hoje não há
arquivos: a tela do exercício mostra um placeholder com o selo "Vídeo em breve". O player (`expo-video`) entra depois;
esta estrutura já deixa tudo pronto para ele (ver "Ponto de extensão").

## Padrão dos arquivos

Pasta: `assets/exercicios/`. O **nome do arquivo é o id do exercício** (ex.: `squat.mp4` e `squat.jpg`).

| | Vídeo (`<id>.mp4`) | Capa (`<id>.jpg`) |
|---|---|---|
| Formato | MP4, codec **H.264** | **JPEG** de verdade (não PNG renomeado) |
| Dimensão | **480x480** (1:1) | quadrada (use 480x480) |
| Quadros | 24 a 30 fps | n/a |
| Áudio | **sem áudio** (remova a trilha) | n/a |
| Duração | **3 a 6 s**, loop contínuo (o último quadro emenda no primeiro) | n/a |
| Tamanho | **150 a 400 KB** (máximo 400 KB) | até **80 KB** |

**A extensão precisa bater com o formato real.** Um JPEG salvo como `.png` já quebrou um build do Android; o mesmo
cuidado vale aqui (`.jpg` só para JPEG, `.mp4` só para MP4). O `scripts/check-videos.mjs` confere a assinatura do arquivo.

Exemplo de conversão com ffmpeg (a partir de uma gravação qualquer):

```
ffmpeg -i gravacao.mov -t 5 -vf "crop='min(iw,ih)':'min(iw,ih)',scale=480:480,fps=30" -an -c:v libx264 -profile:v main -crf 28 -movflags +faststart squat.mp4
ffmpeg -i squat.mp4 -frames:v 1 -q:v 5 squat.jpg
```

## Como adicionar vídeos

1. Grave seguindo a lista abaixo e salve `<id>.mp4` e `<id>.jpg` em `assets/exercicios/`.
2. Rode **`npm run gen:media`**: atualiza `src/data/exerciseVideos.js` (o mapa com `require` estático, só dos arquivos
   que existem) e a lista de gravação deste documento (marca ✅ quando há vídeo e capa).
3. Rode **`node scripts/check-videos.mjs`**: valida extensão, formato real, nome, tamanho e se o mapa está em dia.
   O CI roda o mesmo script antes dos builds e falha em segundos, apontando o arquivo.
4. Commite os arquivos, o mapa e este documento.

O mapa é **gerado** porque o Metro exige `require()` estático: nunca se aponta para um arquivo que não existe, então o
bundle não quebra. Se apagar um arquivo, rode `npm run gen:media` de novo.

## Ponto de extensão (player)

`src/components/ExerciseMedia.js` mostra a capa (ou o placeholder). Quando o `expo-video` for adotado (dependência nativa,
exige novo build), passe `renderVideo` para o componente (ou troque o miolo dele) usando `media.video`. O parâmetro
`autoplay` já vem falso quando o aparelho está com "Reduzir movimento".

Flag `EXPO_PUBLIC_EXERCISE_VIDEOS`: ligada por padrão; com `false` a área "Como fazer" inteira some.

## Lista de gravação

Todos os exercícios de `EXERCISE_DB`, com equipamento e combos (UNO a ELITE) em que aparecem, do mais usado ao menos
usado nas séries A, B e C. Gerada por `npm run gen:media` (não edite à mão).

<!-- gen:lista:inicio -->

Total: **59** exercícios. Ordem: quantas séries A, B e C usam o exercício (somando todos os combos, focos e níveis do cenário de contagem), do mais usado para o menos usado. Marque ✅ quando o vídeo e a capa estiverem em `assets/exercicios/`.

| # | Gravado | Arquivo (id) | Exercício | Equipamento | Combos | A | B | C | Total |
|---|---|---|---|---|---|---|---|---|---|
| 1 | ⬜ | `plank` | Prancha Isométrica | bodyweight | todos (UNO a ELITE) | 20 | 30 | 40 | 90 |
| 2 | ⬜ | `crunch` | Abdominal Crunch | bodyweight | todos (UNO a ELITE) | 10 | 35 | 40 | 85 |
| 3 | ⬜ | `cable_crunch` | Abdominal no Cabo | cable | todos (UNO a ELITE) | 10 | 10 | 20 | 40 |
| 4 | ⬜ | `russian_twist` | Giro Russo | bodyweight | todos (UNO a ELITE) | 0 | 15 | 25 | 40 |
| 5 | ⬜ | `donkey_kick` | Coice de Burro | bodyweight | todos (UNO a ELITE) | 6 | 10 | 20 | 36 |
| 6 | ⬜ | `leg_curl` | Cadeira Flexora | leg_machine | DUO a ELITE | 8 | 3 | 24 | 35 |
| 7 | ⬜ | `adductor_machine` | Cadeira Adutora | leg_machine | DUO a ELITE | 8 | 4 | 21 | 33 |
| 8 | ⬜ | `tricep_ext` | Extensão Tríceps com Haltere | dumbbells | todos (UNO a ELITE) | 30 | 0 | 0 | 30 |
| 9 | ⬜ | `seated_cable_row` | Remada no Pulley | cable | todos (UNO a ELITE) | 0 | 30 | 0 | 30 |
| 10 | ⬜ | `bicep_curl` | Rosca Bíceps | dumbbells | todos (UNO a ELITE) | 0 | 30 | 0 | 30 |
| 11 | ⬜ | `barbell_curl` | Rosca Direta na Barra W | barbell | todos (UNO a ELITE) | 0 | 30 | 0 | 30 |
| 12 | ⬜ | `cable_curl` | Rosca no Cabo | cable | todos (UNO a ELITE) | 0 | 30 | 0 | 30 |
| 13 | ⬜ | `cable_pushdown` | Tríceps no Pulley (Corda) | cable | todos (UNO a ELITE) | 30 | 0 | 0 | 30 |
| 14 | ⬜ | `fire_hydrant` | Abdução Quadrupede | bodyweight | todos (UNO a ELITE) | 0 | 9 | 18 | 27 |
| 15 | ⬜ | `abductor_machine` | Cadeira Abdutora | leg_machine | DUO a ELITE | 5 | 8 | 14 | 27 |
| 16 | ⬜ | `row_db` | Remada Unilateral | dumbbells | todos (UNO a ELITE) | 0 | 27 | 0 | 27 |
| 17 | ⬜ | `leg_extension` | Cadeira Extensora | leg_machine | DUO a ELITE | 8 | 0 | 16 | 24 |
| 18 | ⬜ | `goblet_squat` | Agachamento Goblet | dumbbells | todos (UNO a ELITE) | 6 | 5 | 10 | 21 |
| 19 | ⬜ | `glute_bridge` | Elevação de Quadril | bodyweight | todos (UNO a ELITE) | 9 | 4 | 8 | 21 |
| 20 | ⬜ | `high_knees` | Corrida Estacionária | bodyweight | todos (UNO a ELITE) | 0 | 0 | 20 | 20 |
| 21 | ⬜ | `step_touch` | Step Touch | bodyweight | todos (UNO a ELITE) | 0 | 0 | 20 | 20 |
| 22 | ⬜ | `lateral_raise` | Elevação Lateral | dumbbells | todos (UNO a ELITE) | 19 | 0 | 0 | 19 |
| 23 | ⬜ | `sumo_squat` | Agachamento Sumo | bodyweight | todos (UNO a ELITE) | 0 | 6 | 12 | 18 |
| 24 | ⬜ | `chest_press_machine` | Supino na Máquina (Peitoral Dorsal) | chest_back_machine | TRIPLE a ELITE | 18 | 0 | 0 | 18 |
| 25 | ⬜ | `rear_delt_machine` | Voador Invertido na Máquina | chest_back_machine | TRIPLE a ELITE | 0 | 18 | 0 | 18 |
| 26 | ⬜ | `cable_crossover` | Crucifixo no Cabo | cable | todos (UNO a ELITE) | 15 | 0 | 0 | 15 |
| 27 | ⬜ | `cable_lateral_raise` | Elevação Lateral no Cabo | cable | todos (UNO a ELITE) | 15 | 0 | 0 | 15 |
| 28 | ⬜ | `pushup` | Flexão de Braço | bodyweight | todos (UNO a ELITE) | 15 | 0 | 0 | 15 |
| 29 | ⬜ | `incline_pushup` | Flexão Inclinada | bodyweight | todos (UNO a ELITE) | 15 | 0 | 0 | 15 |
| 30 | ⬜ | `smith_squat` | Agachamento no Smith | smith | DUO a ELITE | 4 | 0 | 10 | 14 |
| 31 | ⬜ | `cable_kickback` | Coice no Cabo | cable | todos (UNO a ELITE) | 10 | 1 | 2 | 13 |
| 32 | ⬜ | `shoulder_press` | Desenvolvimento com Halteres | dumbbells | todos (UNO a ELITE) | 13 | 0 | 0 | 13 |
| 33 | ⬜ | `front_raise` | Elevação Frontal | dumbbells | todos (UNO a ELITE) | 13 | 0 | 0 | 13 |
| 34 | ⬜ | `squat` | Agachamento Livre | bodyweight | todos (UNO a ELITE) | 2 | 4 | 6 | 12 |
| 35 | ⬜ | `smith_bench_press` | Supino no Smith | smith | DUO a ELITE | 12 | 0 | 0 | 12 |
| 36 | ⬜ | `jumping_jack` | Polichinelo | bodyweight | todos (UNO a ELITE) | 0 | 0 | 10 | 10 |
| 37 | ⬜ | `lunge` | Avanço | bodyweight | todos (UNO a ELITE) | 2 | 1 | 6 | 9 |
| 38 | ⬜ | `calf_raise` | Elevação de Panturrilha | bodyweight | todos (UNO a ELITE) | 2 | 2 | 5 | 9 |
| 39 | ⬜ | `shoulder_machine_press` | Desenvolvimento na Máquina | shoulder_machine | ELITE | 6 | 0 | 0 | 6 |
| 40 | ⬜ | `leg_press_ex` | Leg Press | leg_press | TRIPLE a ELITE | 3 | 0 | 3 | 6 |
| 41 | ⬜ | `pullover` | Pullover com Haltere | dumbbells | todos (UNO a ELITE) | 0 | 6 | 0 | 6 |
| 42 | ⬜ | `db_press` | Supino com Halteres | dumbbells | todos (UNO a ELITE) | 6 | 0 | 0 | 6 |
| 43 | ⬜ | `reverse_fly` | Voador Invertido | dumbbells | todos (UNO a ELITE) | 0 | 6 | 0 | 6 |
| 44 | ⬜ | `wall_sit` | Cadeira na Parede | bodyweight | todos (UNO a ELITE) | 1 | 2 | 2 | 5 |
| 45 | ⬜ | `dead_bug` | Dead Bug | bodyweight | todos (UNO a ELITE) | 0 | 0 | 5 | 5 |
| 46 | ⬜ | `leg_raise` | Elevação de Pernas | bodyweight | todos (UNO a ELITE) | 0 | 0 | 5 | 5 |
| 47 | ⬜ | `pike_pushup` | Flexão Pike | bodyweight | todos (UNO a ELITE) | 4 | 0 | 0 | 4 |
| 48 | ⬜ | `glute_machine_ex` | Glúteo Máximo na Máquina | glute_machine | PRIME a ELITE | 4 | 0 | 0 | 4 |
| 49 | ⬜ | `rdl` | Levantamento Terra Romeno | dumbbells | todos (UNO a ELITE) | 1 | 0 | 3 | 4 |
| 50 | ⬜ | `db_fly` | Crucifixo com Halteres | dumbbells | todos (UNO a ELITE) | 3 | 0 | 0 | 3 |
| 51 | ⬜ | `lat_pulldown_ex` | Puxada Alta | lat_pulldown | ELITE | 0 | 3 | 0 | 3 |
| 52 | ⬜ | `hip_thrust_machine` | Elevação Pélvica na Máquina | hip_machine | ELITE | 1 | 0 | 0 | 1 |
| 53 | ⬜ | `bike_cardio` | Bike Ergométrica | cardio_machine | todos (UNO a ELITE) | 0 | 0 | 0 | 0 |
| 54 | ⬜ | `burpee` | Burpee | bodyweight | todos (UNO a ELITE) | 0 | 0 | 0 | 0 |
| 55 | ⬜ | `treadmill` | Esteira | cardio_machine | todos (UNO a ELITE) | 0 | 0 | 0 | 0 |
| 56 | ⬜ | `march_place` | Marcha Estacionária | bodyweight | todos (UNO a ELITE) | 0 | 0 | 0 | 0 |
| 57 | ⬜ | `hammer_curl` | Rosca Martelo | dumbbells | todos (UNO a ELITE) | 0 | 0 | 0 | 0 |
| 58 | ⬜ | `superman` | Superman | bodyweight | todos (UNO a ELITE) | 0 | 0 | 0 | 0 |
| 59 | ⬜ | `tricep_dip` | Tríceps no Banco | bench | todos (UNO a ELITE) | 0 | 0 | 0 | 0 |

<!-- gen:lista:fim -->
