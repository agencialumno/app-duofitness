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

## Player (expo-video)

Com um vídeo no mapa gerado, `src/components/ExerciseMedia.js` usa `src/components/ExerciseVideoPlayer.js` (expo-video):

- quadrado 1:1, `contentFit="cover"`, **loop**, **sem áudio** (`muted`) e sem interromper a música do usuário
  (`audioMixingMode = "mixWithOthers"`); **sem controles nativos e sem Picture-in-Picture**; só reprodução em primeiro plano
  (o plugin do expo-video **não** entra no `app.json`: ele só serve para segundo plano e PiP);
- **autoplay** ao abrir a tela (quando o vídeo já está pronto); **pausa** ao perder o foco da tela e ao ir para o segundo plano;
  libera o player ao sair;
- botão **Pausar/Tocar** com rótulo para o leitor de tela ("Pausar vídeo de demonstração de ...");
- **Reduzir movimento** ligado: mostra a capa e só toca quando a pessoa tocar no botão;
- falha ao carregar: volta à capa (ou ao placeholder), sem mensagem de erro.

Sem vídeo no mapa, o comportamento é o de sempre: capa ou placeholder com o selo "Vídeo em breve". `renderVideo`
(prop do `ExerciseMedia`) troca o player por outro componente (usado nos testes).

Flag `EXPO_PUBLIC_EXERCISE_VIDEOS`: ligada por padrão; com `false` a área "Como fazer" inteira some.

## Testar UM vídeo no aparelho (sem commitar)

Não há vídeo no repositório. Para ver o player num iPhone ou Android:

1. Crie uma **branch descartável**: `git switch -c teste-video-plank`.
2. Grave ou converta **um** vídeo no padrão acima (480x480, H.264, sem áudio, 3 a 6 s, até 400 KB) e salve:
   - `assets/exercicios/plank.mp4`
   - `assets/exercicios/plank.jpg` (capa JPEG até 80 KB)

   (`plank` = Prancha Isométrica, o exercício mais usado nas séries A, B e C em todos os combos. Qualquer id da lista abaixo serve.)
3. `npm run gen:media` e `node scripts/check-videos.mjs` (deve passar, sem erros).
4. Gere o build de teste (`android.yml` ou `ios.yml` nessa branch). **Não** faça merge nem push dessa branch para a principal.
5. No app: Exercícios → Prancha Isométrica → "Como fazer".
6. Terminou: apague a branch (`git switch -` e `git branch -D teste-video-plank`). O mapa e os arquivos só existiram nela.

Se você só quiser conferir o resto da estrutura, o `scripts/check-videos.mjs` e o mapa gerado já estão cobertos por testes com arquivos sintéticos.

## Lista de gravação

Todos os exercícios de `EXERCISE_DB`, com equipamento e combos (UNO a ELITE) em que aparecem, do mais usado ao menos
usado nas séries A, B e C. Gerada por `npm run gen:media` (não edite à mão).

<!-- gen:lista:inicio -->

Total: **59** exercícios. Ordem: quantas séries A, B e C usam o exercício (somando todos os combos, focos e níveis do cenário de contagem), do mais usado para o menos usado. Marque ✅ quando o vídeo e a capa estiverem em `assets/exercicios/`.

| # | Gravado | Arquivo (id) | Exercício | Equipamento | Combos | A | B | C | Total |
|---|---|---|---|---|---|---|---|---|---|
| 1 | ⬜ | `plank` | Prancha Isométrica | bodyweight | todos (UNO a ELITE) | 20 | 20 | 25 | 65 |
| 2 | ⬜ | `crunch` | Abdominal Crunch | bodyweight | todos (UNO a ELITE) | 10 | 25 | 25 | 60 |
| 3 | ⬜ | `russian_twist` | Giro Russo | bodyweight | todos (UNO a ELITE) | 0 | 15 | 35 | 50 |
| 4 | ⬜ | `dead_bug` | Dead Bug | bodyweight | todos (UNO a ELITE) | 0 | 10 | 30 | 40 |
| 5 | ⬜ | `cable_crunch` | Abdominal no Cabo | cable | todos (UNO a ELITE) | 10 | 10 | 10 | 30 |
| 6 | ⬜ | `tricep_ext` | Extensão Tríceps com Haltere | dumbbells | todos (UNO a ELITE) | 30 | 0 | 0 | 30 |
| 7 | ⬜ | `seated_cable_row` | Remada no Pulley | cable | todos (UNO a ELITE) | 0 | 30 | 0 | 30 |
| 8 | ⬜ | `bicep_curl` | Rosca Bíceps | dumbbells | todos (UNO a ELITE) | 0 | 30 | 0 | 30 |
| 9 | ⬜ | `barbell_curl` | Rosca Direta na Barra W | barbell | todos (UNO a ELITE) | 0 | 30 | 0 | 30 |
| 10 | ⬜ | `cable_curl` | Rosca no Cabo | cable | todos (UNO a ELITE) | 0 | 30 | 0 | 30 |
| 11 | ⬜ | `cable_pushdown` | Tríceps no Pulley (Corda) | cable | todos (UNO a ELITE) | 30 | 0 | 0 | 30 |
| 12 | ⬜ | `cable_kickback` | Coice no Cabo | cable | todos (UNO a ELITE) | 10 | 6 | 13 | 29 |
| 13 | ⬜ | `leg_extension` | Cadeira Extensora | leg_machine | DUO a ELITE | 8 | 0 | 20 | 28 |
| 14 | ⬜ | `leg_curl` | Cadeira Flexora | leg_machine | DUO a ELITE | 8 | 0 | 20 | 28 |
| 15 | ⬜ | `glute_bridge` | Elevação de Quadril | bodyweight | todos (UNO a ELITE) | 9 | 1 | 18 | 28 |
| 16 | ⬜ | `row_db` | Remada Unilateral | dumbbells | todos (UNO a ELITE) | 0 | 27 | 0 | 27 |
| 17 | ⬜ | `adductor_machine` | Cadeira Adutora | leg_machine | DUO a ELITE | 8 | 0 | 14 | 22 |
| 18 | ⬜ | `donkey_kick` | Coice de Burro | bodyweight | todos (UNO a ELITE) | 6 | 4 | 12 | 22 |
| 19 | ⬜ | `bike_cardio` | Bike Ergométrica | cardio_machine | todos (UNO a ELITE) | 0 | 0 | 20 | 20 |
| 20 | ⬜ | `leg_raise` | Elevação de Pernas | bodyweight | todos (UNO a ELITE) | 0 | 10 | 10 | 20 |
| 21 | ⬜ | `treadmill` | Esteira | cardio_machine | todos (UNO a ELITE) | 0 | 0 | 20 | 20 |
| 22 | ⬜ | `lateral_raise` | Elevação Lateral | dumbbells | todos (UNO a ELITE) | 19 | 0 | 0 | 19 |
| 23 | ⬜ | `chest_press_machine` | Supino na Máquina (Peitoral Dorsal) | chest_back_machine | TRIPLE a ELITE | 18 | 0 | 0 | 18 |
| 24 | ⬜ | `rear_delt_machine` | Voador Invertido na Máquina | chest_back_machine | TRIPLE a ELITE | 0 | 18 | 0 | 18 |
| 25 | ⬜ | `goblet_squat` | Agachamento Goblet | dumbbells | todos (UNO a ELITE) | 6 | 6 | 5 | 17 |
| 26 | ⬜ | `squat` | Agachamento Livre | bodyweight | todos (UNO a ELITE) | 2 | 6 | 9 | 17 |
| 27 | ⬜ | `fire_hydrant` | Abdução Quadrupede | bodyweight | todos (UNO a ELITE) | 0 | 10 | 6 | 16 |
| 28 | ⬜ | `lunge` | Avanço | bodyweight | todos (UNO a ELITE) | 2 | 5 | 9 | 16 |
| 29 | ⬜ | `abductor_machine` | Cadeira Abdutora | leg_machine | DUO a ELITE | 5 | 3 | 8 | 16 |
| 30 | ⬜ | `cable_crossover` | Crucifixo no Cabo | cable | todos (UNO a ELITE) | 15 | 0 | 0 | 15 |
| 31 | ⬜ | `cable_lateral_raise` | Elevação Lateral no Cabo | cable | todos (UNO a ELITE) | 15 | 0 | 0 | 15 |
| 32 | ⬜ | `pushup` | Flexão de Braço | bodyweight | todos (UNO a ELITE) | 15 | 0 | 0 | 15 |
| 33 | ⬜ | `incline_pushup` | Flexão Inclinada | bodyweight | todos (UNO a ELITE) | 15 | 0 | 0 | 15 |
| 34 | ⬜ | `calf_raise` | Elevação de Panturrilha | bodyweight | todos (UNO a ELITE) | 2 | 4 | 8 | 14 |
| 35 | ⬜ | `smith_squat` | Agachamento no Smith | smith | DUO a ELITE | 4 | 0 | 9 | 13 |
| 36 | ⬜ | `shoulder_press` | Desenvolvimento com Halteres | dumbbells | todos (UNO a ELITE) | 13 | 0 | 0 | 13 |
| 37 | ⬜ | `front_raise` | Elevação Frontal | dumbbells | todos (UNO a ELITE) | 13 | 0 | 0 | 13 |
| 38 | ⬜ | `wall_sit` | Cadeira na Parede | bodyweight | todos (UNO a ELITE) | 1 | 1 | 10 | 12 |
| 39 | ⬜ | `glute_machine_ex` | Glúteo Máximo na Máquina | glute_machine | PRIME a ELITE | 4 | 0 | 8 | 12 |
| 40 | ⬜ | `smith_bench_press` | Supino no Smith | smith | DUO a ELITE | 12 | 0 | 0 | 12 |
| 41 | ⬜ | `sumo_squat` | Agachamento Sumo | bodyweight | todos (UNO a ELITE) | 0 | 9 | 1 | 10 |
| 42 | ⬜ | `jumping_jack` | Polichinelo | bodyweight | todos (UNO a ELITE) | 0 | 0 | 10 | 10 |
| 43 | ⬜ | `leg_press_ex` | Leg Press | leg_press | TRIPLE a ELITE | 3 | 0 | 6 | 9 |
| 44 | ⬜ | `rdl` | Levantamento Terra Romeno | dumbbells | todos (UNO a ELITE) | 1 | 5 | 2 | 8 |
| 45 | ⬜ | `shoulder_machine_press` | Desenvolvimento na Máquina | shoulder_machine | ELITE | 6 | 0 | 0 | 6 |
| 46 | ⬜ | `pullover` | Pullover com Haltere | dumbbells | todos (UNO a ELITE) | 0 | 6 | 0 | 6 |
| 47 | ⬜ | `db_press` | Supino com Halteres | dumbbells | todos (UNO a ELITE) | 6 | 0 | 0 | 6 |
| 48 | ⬜ | `reverse_fly` | Voador Invertido | dumbbells | todos (UNO a ELITE) | 0 | 6 | 0 | 6 |
| 49 | ⬜ | `pike_pushup` | Flexão Pike | bodyweight | todos (UNO a ELITE) | 4 | 0 | 0 | 4 |
| 50 | ⬜ | `db_fly` | Crucifixo com Halteres | dumbbells | todos (UNO a ELITE) | 3 | 0 | 0 | 3 |
| 51 | ⬜ | `hip_thrust_machine` | Elevação Pélvica na Máquina | hip_machine | ELITE | 1 | 0 | 2 | 3 |
| 52 | ⬜ | `lat_pulldown_ex` | Puxada Alta | lat_pulldown | ELITE | 0 | 3 | 0 | 3 |
| 53 | ⬜ | `burpee` | Burpee | bodyweight | todos (UNO a ELITE) | 0 | 0 | 0 | 0 |
| 54 | ⬜ | `high_knees` | Corrida Estacionária | bodyweight | todos (UNO a ELITE) | 0 | 0 | 0 | 0 |
| 55 | ⬜ | `march_place` | Marcha Estacionária | bodyweight | todos (UNO a ELITE) | 0 | 0 | 0 | 0 |
| 56 | ⬜ | `hammer_curl` | Rosca Martelo | dumbbells | todos (UNO a ELITE) | 0 | 0 | 0 | 0 |
| 57 | ⬜ | `step_touch` | Step Touch | bodyweight | todos (UNO a ELITE) | 0 | 0 | 0 | 0 |
| 58 | ⬜ | `superman` | Superman | bodyweight | todos (UNO a ELITE) | 0 | 0 | 0 | 0 |
| 59 | ⬜ | `tricep_dip` | Tríceps no Banco | bench | todos (UNO a ELITE) | 0 | 0 | 0 | 0 |

<!-- gen:lista:fim -->
