# Prompts de vídeo dos exercícios (geração por IA)

Prompts para gerar, com uma ferramenta de vídeo por IA, o vídeo de demonstração de **cada exercício do app**. Complementa `docs/videos-exercicios.md` (padrão dos arquivos, player e a lista de gravação gerada por `npm run gen:media`, que **não** foi alterada).

## De onde vem a lista

- **Fonte:** `EXERCISE_DB` em `src/utils/workoutGenerator.js` (campos `id`, `name`, `muscleGroup`, `equipment`, `category`, `instructions`). São **59 exercícios** em 8 categorias (Peito, Costas, Pernas, Glúteos, Ombros, Braços, Core, Cardio). Os equipamentos por combo (UNO a ELITE) vêm de `src/data/combosEquipment.js`.
- O arquivo final de cada vídeo se chama **`<id>.mp4`** (mesmo id do app) e vai em `assets/exercicios/`, junto com o poster `<id>.jpg`.

## Conflito de formato a decidir (leia antes de gerar)

O app hoje espera **480x480 (1:1), 3 a 6 s, até 400 KB** (`scripts/check-videos.mjs` e o player quadrado com `contentFit="cover"`). O pedido deste documento e do `scripts/preparar-videos.sh` é **720p, 5 s, alvo de 600 KB**. Por isso o script tem dois modos: o padrão segue este pedido (720p, 5 s); com **`--app`** gera no padrão do app (quadrado 480x480, 5 s, CRF mais alto para caber em 400 KB). Para publicar no app, use `--app` (ou ajuste o `check-videos`, o que é decisão do Victor).

## A) Bloco de estilo fixo (colar no começo de TODO prompt)

```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video.
```

**Negative prompt padrão** (igual para todos):

```
extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding
```

## C) Aparelhos descritos de forma genérica

Todos os aparelhos são descritos **sem marca**, só pela função e pela forma (não cite fabricantes nem nomes de linha de produto). Em cada prompt a frase "Equipment:" traz a descrição genérica do aparelho usado.

## D) Revisão obrigatória

Exercícios com carga, barra, agachamento ou impacto estão marcados **REVISÃO OBRIGATÓRIA**: o prompt usa carga **leve** e **postura neutra**, e um educador físico precisa aprovar o vídeo antes de ele entrar no app. Os demais também passam por revisão, mas sem esse destaque.

## B) Um prompt por exercício

### 1. `chest_press_machine` — Supino na Máquina (Peitoral Dorsal)
- **Categoria / grupo:** Peito / Peitoral, Tríceps. **Equipamento do app:** `chest_back_machine` (máquina peitoral/dorsal). **Nível:** Inic.
- **Arquivo final:** `chest_press_machine.mp4` (e poster `chest_press_machine.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a generic selectorised chest-press / reverse-fly machine: padded backrest, adjustable seat, two handles on pivoting arms and a weight stack with a pin. Start pose: seated upright with back and head against the pad, handles at mid-chest height, elbows bent about 90 degrees. Movement: push the handles forward in a smooth arc until the arms are almost straight without locking the elbows, pause one beat, then return slowly. End pose: handles back at chest level, weight stack not touching down. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** ombros baixos e para trás, punhos alinhados aos antebraços, costas apoiadas.
  2. **Amplitude:** estender quase por completo sem travar os cotovelos; voltar até o peito sem bater a pilha de pesos.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 2. `smith_bench_press` — Supino no Smith  **REVISÃO OBRIGATÓRIA**
- **Categoria / grupo:** Peito / Peitoral, Tríceps. **Equipamento do app:** `smith` (Smith). **Nível:** Inte.
- **Arquivo final:** `smith_bench_press.mp4` (e poster `smith_bench_press.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: three-quarter view. Equipment: a generic Smith-style machine: a light barbell fixed on two vertical guide rails with safety hooks, small light plates. Start pose: lying on a flat bench under the fixed bar, feet flat on the floor, bar held above the chest with straight arms (very light plates). Movement: lower the bar slowly to lightly touch the lower chest over two seconds, then press back up without locking the elbows. End pose: bar above the chest, arms straight but relaxed. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak. LIGHT load only and a neutral, safe posture; this must look like a gentle technique demonstration, not a heavy lift.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** punhos sobre os cotovelos, barra alinhada ao meio do peito, quadril e ombros apoiados no banco.
  2. **Amplitude:** tocar de leve o peito e subir sem travar; sem arquear a lombar.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 3. `cable_crossover` — Crucifixo no Cabo
- **Categoria / grupo:** Peito / Peitoral. **Equipamento do app:** `cable` (cabo (polia)). **Nível:** Inte.
- **Arquivo final:** `cable_crossover.mp4` (e poster `cable_crossover.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: three-quarter front view. Equipment: two high pulleys with plain handles. Start pose: standing in a split stance, torso leaning slightly forward, arms open wide holding the handles at shoulder height, elbows slightly bent. Movement: bring both hands together in a smooth downward arc in front of the lower chest, squeeze for a beat, then open slowly back. End pose: arms open wide again, tension kept on the cables. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** tronco estável, cotovelos levemente flexionados e fixos, ombros baixos.
  2. **Amplitude:** abrir até alongar o peito sem esticar demais os ombros; fechar sem bater as mãos com força.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 4. `db_press` — Supino com Halteres
- **Categoria / grupo:** Peito / Peitoral, Tríceps. **Equipamento do app:** `dumbbells` (halteres). **Nível:** Inte.
- **Arquivo final:** `db_press.mp4` (e poster `db_press.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: three-quarter view. Equipment: a pair of light generic hex dumbbells (no markings). Start pose: lying on a flat bench, a light dumbbell in each hand held above the chest, palms facing forward. Movement: lower the dumbbells slowly to the sides of the chest, elbows about 45 degrees from the torso, then press up until the dumbbells almost touch. End pose: dumbbells above the chest, elbows soft. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** antebraços verticais, cotovelos a cerca de 45 graus do tronco, pés apoiados.
  2. **Amplitude:** descer até o nível do peito e subir sem travar os cotovelos.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 5. `db_fly` — Crucifixo com Halteres
- **Categoria / grupo:** Peito / Peitoral, Deltóide. **Equipamento do app:** `dumbbells` (halteres). **Nível:** Inte.
- **Arquivo final:** `db_fly.mp4` (e poster `db_fly.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: three-quarter view from the head side. Equipment: a pair of light generic hex dumbbells (no markings). Start pose: lying on a flat bench, light dumbbells held above the chest, palms facing each other, elbows slightly bent. Movement: open the arms slowly in a wide arc until the dumbbells are level with the chest, then bring them back up along the same arc. End pose: dumbbells above the chest again. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** cotovelos com flexão leve e constante, punhos neutros, ombros apoiados.
  2. **Amplitude:** abrir só até o alongamento confortável do peito; sem descer abaixo da linha do banco.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 6. `pushup` — Flexão de Braço
- **Categoria / grupo:** Peito / Peitoral, Tríceps, Deltóide anterior. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `pushup.mp4` (e poster `pushup.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: none (bodyweight). Start pose: high plank on the hands and toes, hands slightly wider than the shoulders, body in one straight line from head to heels. Movement: bend the elbows to lower the chest to just above the floor, then push back up until the arms are straight. End pose: high plank position. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** corpo em linha reta, quadril não cai nem sobe, cotovelos a cerca de 45 graus.
  2. **Amplitude:** descer até o peito quase tocar o chão e estender sem travar.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 7. `incline_pushup` — Flexão Inclinada
- **Categoria / grupo:** Peito / Peitoral superior, Ombros. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `incline_pushup.mp4` (e poster `incline_pushup.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a sturdy flat bench used as the raised surface. Start pose: hands on the edge of the bench, arms straight, body in a straight diagonal line, feet on the floor. Movement: bend the elbows to bring the chest toward the bench edge, then push back up to straight arms. End pose: straight-arm diagonal plank. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** corpo em diagonal reta, core ativo, mãos sob os ombros.
  2. **Amplitude:** peito perto da borda do banco; sem projetar a cabeça à frente.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 8. `lat_pulldown_ex` — Puxada Alta
- **Categoria / grupo:** Costas / Grande dorsal, Bíceps. **Equipamento do app:** `lat_pulldown` (puxada). **Nível:** Inte.
- **Arquivo final:** `lat_pulldown_ex.mp4` (e poster `lat_pulldown_ex.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: three-quarter view from the side. Equipment: a generic lat pulldown machine: seat with adjustable thigh pads, overhead pulley and a wide bar, weight stack. Start pose: seated with thighs under the pads, torso slightly leaning back, arms extended overhead gripping the bar wider than the shoulders. Movement: pull the bar down to the upper chest by driving the elbows down and back, pause one beat, then let the bar rise slowly until the arms are almost straight. End pose: arms extended overhead, shoulders not shrugged. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** peito aberto, ombros baixos, sem balançar o tronco.
  2. **Amplitude:** puxar até a altura do peito e voltar quase estendendo, sem deixar a pilha bater.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 9. `rear_delt_machine` — Voador Invertido na Máquina
- **Categoria / grupo:** Costas / Rombóide, Trapézio médio. **Equipamento do app:** `chest_back_machine` (máquina peitoral/dorsal). **Nível:** Inic.
- **Arquivo final:** `rear_delt_machine.mp4` (e poster `rear_delt_machine.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: three-quarter view from behind. Equipment: a generic selectorised chest-press / reverse-fly machine: padded backrest, adjustable seat, two handles on pivoting arms and a weight stack with a pin. Start pose: seated facing the pad with the chest supported, arms extended forward holding the handles at shoulder height. Movement: open the arms backward in a wide arc until the hands are in line with the shoulders, squeeze the upper back for a beat, then return slowly. End pose: arms extended forward. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** peito apoiado, ombros longe das orelhas, punhos neutros.
  2. **Amplitude:** abrir até a linha dos ombros sem jogar o tronco para trás.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 10. `seated_cable_row` — Remada no Pulley
- **Categoria / grupo:** Costas / Grande dorsal, Rombóide. **Equipamento do app:** `cable` (cabo (polia)). **Nível:** Inic.
- **Arquivo final:** `seated_cable_row.mp4` (e poster `seated_cable_row.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a low pulley with a V-handle and a footplate, seated on the floor-level bench. Start pose: seated upright with knees slightly bent, torso tall, arms extended holding the handle. Movement: pull the handle to the lower abdomen by driving the elbows straight back, squeeze the shoulder blades together, then extend the arms slowly. End pose: arms extended, torso still tall. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** coluna neutra, tronco quase parado, ombros baixos.
  2. **Amplitude:** puxar até o abdômen e estender sem arredondar as costas.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 11. `row_db` — Remada Unilateral
- **Categoria / grupo:** Costas / Grande dorsal, Rombóide, Bíceps. **Equipamento do app:** `dumbbells` (halteres). **Nível:** Inic.
- **Arquivo final:** `row_db.mp4` (e poster `row_db.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a flat bench used for support. Start pose: one hand and the same-side knee on the bench, back flat and parallel to the floor, the other hand holding a light dumbbell with the arm hanging straight. Movement: pull the dumbbell to the hip by driving the elbow back and up, pause one beat, then lower slowly. End pose: arm hanging straight below the shoulder. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** costas retas e paralelas ao chão, quadril quadrado, sem girar o tronco.
  2. **Amplitude:** subir até o cotovelo passar a linha das costas e descer alongando sem soltar o ombro.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 12. `pullover` — Pullover com Haltere
- **Categoria / grupo:** Costas / Grande dorsal, Serrátil. **Equipamento do app:** `dumbbells` (halteres). **Nível:** Inte.
- **Arquivo final:** `pullover.mp4` (e poster `pullover.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a flat bench. Start pose: lying across a flat bench with the upper back supported, hips low, one light dumbbell held with both hands above the chest, arms nearly straight. Movement: lower the dumbbell in an arc behind the head until the arms are level with the ears, then return the dumbbell above the chest along the same arc. End pose: dumbbell above the chest. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** cotovelos levemente flexionados e fixos, costelas recolhidas, quadril estável.
  2. **Amplitude:** descer só até o alongamento confortável, sem forçar o ombro.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 13. `reverse_fly` — Voador Invertido
- **Categoria / grupo:** Costas / Rombóide, Trapézio médio. **Equipamento do app:** `dumbbells` (halteres). **Nível:** Inic.
- **Arquivo final:** `reverse_fly.mp4` (e poster `reverse_fly.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: three-quarter view from behind. Equipment: a pair of light generic hex dumbbells (no markings). Start pose: standing with the hips pushed back and the torso bent forward with a flat back, light dumbbells hanging below the shoulders. Movement: raise both arms out to the sides in an arc until they are in line with the torso, squeeze the upper back, then lower slowly. End pose: arms hanging below the shoulders. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** coluna neutra, joelhos levemente flexionados, pescoço alinhado.
  2. **Amplitude:** subir até a linha do tronco sem balançar; sem encolher os ombros.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 14. `superman` — Superman
- **Categoria / grupo:** Costas / Lombar, Glúteos. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `superman.mp4` (e poster `superman.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: an exercise mat. Start pose: lying face down on the mat with the arms extended overhead and the legs straight. Movement: lift the arms, chest and legs a few centimeters off the mat together, hold for a beat, then lower slowly. End pose: lying flat again, relaxed. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** pescoço neutro (olhar para o chão), glúteos ativos, sem forçar a lombar.
  2. **Amplitude:** elevar poucos centímetros; amplitude pequena e controlada.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 15. `leg_press_ex` — Leg Press  **REVISÃO OBRIGATÓRIA**
- **Categoria / grupo:** Pernas / Quadríceps, Glúteos. **Equipamento do app:** `leg_press` (leg press). **Nível:** Inte.
- **Arquivo final:** `leg_press_ex.mp4` (e poster `leg_press_ex.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a generic 45-degree sled leg press: reclined padded seat, angled sliding platform with a footplate, light plates, safety stops. Start pose: reclined on the padded seat with the feet shoulder-width on the footplate, knees bent about 90 degrees, hips and lower back pressed into the seat, light plates. Movement: push the platform away until the legs are almost straight without locking the knees, then lower slowly back to about 90 degrees. End pose: knees bent about 90 degrees, lower back still on the seat. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak. LIGHT load only and a neutral, safe posture; this must look like a gentle technique demonstration, not a heavy lift.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** joelhos alinhados com os pés, lombar sempre apoiada, quadril não descola.
  2. **Amplitude:** descer a cerca de 90 graus sem tirar a lombar do banco; não travar os joelhos no topo.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 16. `smith_squat` — Agachamento no Smith  **REVISÃO OBRIGATÓRIA**
- **Categoria / grupo:** Pernas / Quadríceps, Glúteos. **Equipamento do app:** `smith` (Smith). **Nível:** Inte.
- **Arquivo final:** `smith_squat.mp4` (e poster `smith_squat.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a generic Smith-style machine: a light barbell fixed on two vertical guide rails with safety hooks, small light plates. Start pose: standing under the fixed bar resting on the upper back, feet slightly forward of the bar and shoulder-width apart, torso upright (very light plates). Movement: sit back and down until the thighs are about parallel to the floor, then stand up pushing through the whole foot. End pose: standing tall, knees soft. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak. LIGHT load only and a neutral, safe posture; this must look like a gentle technique demonstration, not a heavy lift.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** joelhos na direção dos pés, tronco firme, calcanhares no chão.
  2. **Amplitude:** descer só até as coxas ficarem paralelas ao chão, sem agachamento profundo.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 17. `leg_extension` — Cadeira Extensora
- **Categoria / grupo:** Pernas / Quadríceps. **Equipamento do app:** `leg_machine` (máquina de pernas). **Nível:** Inic.
- **Arquivo final:** `leg_extension.mp4` (e poster `leg_extension.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a generic selectorised seated leg machine with padded levers and a weight stack. Start pose: seated with the back against the pad, shins behind the padded lever, knees bent about 90 degrees. Movement: extend the knees until the legs are almost straight, pause one beat, then lower slowly. End pose: knees bent about 90 degrees. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** joelho alinhado ao eixo da máquina, costas apoiadas, quadril fixo.
  2. **Amplitude:** estender quase por completo sem travar o joelho; descer controlando.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 18. `leg_curl` — Cadeira Flexora
- **Categoria / grupo:** Pernas / Isquiotibiais. **Equipamento do app:** `leg_machine` (máquina de pernas). **Nível:** Inic.
- **Arquivo final:** `leg_curl.mp4` (e poster `leg_curl.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a generic selectorised seated leg machine with padded levers and a weight stack. Start pose: seated with the back against the pad, ankles on top of the padded lever, legs straight. Movement: bend the knees to pull the lever down and back under the seat, pause one beat, then return slowly. End pose: legs straight. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** quadril apoiado no assento, joelho alinhado ao eixo, pés relaxados.
  2. **Amplitude:** flexionar até cerca de 90 graus ou mais, sem levantar o quadril.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 19. `adductor_machine` — Cadeira Adutora
- **Categoria / grupo:** Pernas / Adutores. **Equipamento do app:** `leg_machine` (máquina de pernas). **Nível:** Inic.
- **Arquivo final:** `adductor_machine.mp4` (e poster `adductor_machine.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: front view. Equipment: a generic selectorised seated leg machine with padded levers and a weight stack. Start pose: seated with the back against the pad, inner thighs against the padded levers, legs apart in a comfortable range. Movement: squeeze the legs together slowly until the levers meet, pause one beat, then open slowly back. End pose: legs comfortably apart. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** costas apoiadas, joelhos e pés alinhados, sem inclinar o tronco.
  2. **Amplitude:** abrir só até uma amplitude confortável; fechar sem bater as alavancas.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 20. `abductor_machine` — Cadeira Abdutora
- **Categoria / grupo:** Pernas / Glúteo médio. **Equipamento do app:** `leg_machine` (máquina de pernas). **Nível:** Inic.
- **Arquivo final:** `abductor_machine.mp4` (e poster `abductor_machine.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: front view. Equipment: a generic selectorised seated leg machine with padded levers and a weight stack. Start pose: seated with the back against the pad, outer thighs against the padded levers, legs together. Movement: push the legs apart slowly to a comfortable width, pause one beat, then bring them back together under control. End pose: legs together. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** costas apoiadas, quadril fixo, joelhos na direção dos pés.
  2. **Amplitude:** abrir até uma largura confortável, sem balançar o tronco.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 21. `goblet_squat` — Agachamento Goblet  **REVISÃO OBRIGATÓRIA**
- **Categoria / grupo:** Pernas / Quadríceps, Glúteos, Core. **Equipamento do app:** `dumbbells` (halteres). **Nível:** Inic.
- **Arquivo final:** `goblet_squat.mp4` (e poster `goblet_squat.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: three-quarter view. Equipment: a pair of light generic hex dumbbells (no markings). Start pose: standing with the feet slightly wider than the shoulders, toes slightly out, one light dumbbell held vertically against the chest with both hands. Movement: sit down between the hips keeping the torso upright and the elbows inside the knees, lower to a comfortable depth with the heels flat, then stand up. End pose: standing tall, dumbbell at the chest. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak. LIGHT load only and a neutral, safe posture; this must look like a gentle technique demonstration, not a heavy lift.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** tronco ereto, joelhos na direção dos pés, calcanhares no chão.
  2. **Amplitude:** profundidade confortável sem arredondar a lombar; não forçar agachamento profundo.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 22. `rdl` — Levantamento Terra Romeno  **REVISÃO OBRIGATÓRIA**
- **Categoria / grupo:** Pernas / Isquiotibiais, Glúteos, Lombar. **Equipamento do app:** `dumbbells` (halteres). **Nível:** Inte.
- **Arquivo final:** `rdl.mp4` (e poster `rdl.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a pair of light generic hex dumbbells (no markings). Start pose: standing with the feet hip-width apart, light dumbbells in front of the thighs, knees soft, back flat. Movement: push the hips back and slide the dumbbells down along the thighs until they pass the knees, feeling the back of the legs stretch, then drive the hips forward to stand tall. End pose: standing tall, dumbbells at the thighs. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak. LIGHT load only and a neutral, safe posture; this must look like a gentle technique demonstration, not a heavy lift.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** coluna neutra do pescoço ao quadril, halteres rente às pernas, joelhos levemente flexionados.
  2. **Amplitude:** descer até abaixo dos joelhos só enquanto a coluna se mantém reta; sem arredondar.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 23. `squat` — Agachamento Livre  **REVISÃO OBRIGATÓRIA**
- **Categoria / grupo:** Pernas / Quadríceps, Glúteos, Isquiotibiais. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `squat.mp4` (e poster `squat.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: none (bodyweight). Start pose: standing with the feet shoulder-width apart, toes slightly out, arms extended forward for balance, no weight. Movement: sit back and down until the thighs are about parallel to the floor, then stand up pushing through the heels. End pose: standing tall. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak. LIGHT load only and a neutral, safe posture; this must look like a gentle technique demonstration, not a heavy lift.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** joelhos na direção dos pés, tronco firme, calcanhares no chão.
  2. **Amplitude:** descer até as coxas ficarem paralelas ao chão, sem agachamento profundo.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 24. `lunge` — Avanço
- **Categoria / grupo:** Pernas / Quadríceps, Glúteos. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `lunge.mp4` (e poster `lunge.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: none (bodyweight). Start pose: standing tall with the feet hip-width apart, hands on the hips. Movement: step one foot forward and lower the back knee toward the floor until both knees are about 90 degrees, then push back to the start. End pose: standing tall. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** tronco ereto, joelho da frente sobre o pé, passada estável.
  2. **Amplitude:** ambos os joelhos a cerca de 90 graus, sem o joelho de trás bater no chão.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 25. `calf_raise` — Elevação de Panturrilha
- **Categoria / grupo:** Pernas / Panturrilha. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `calf_raise.mp4` (e poster `calf_raise.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: none (bodyweight). Start pose: standing tall with the feet hip-width apart, hands on the hips, a wall or support lightly touched for balance. Movement: rise slowly onto the balls of the feet as high as possible, pause one beat, then lower the heels slowly. End pose: standing flat-footed. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** tornozelos retos (sem virar para dentro ou fora), joelhos estendidos, equilíbrio estável.
  2. **Amplitude:** subir o máximo possível e descer até o calcanhar quase tocar o chão.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 26. `wall_sit` — Cadeira na Parede
- **Categoria / grupo:** Pernas / Quadríceps, Glúteos. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `wall_sit.mp4` (e poster `wall_sit.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a plain wall. Start pose: standing with the back against the wall and the feet a step forward. Movement: slide down the wall until the knees are about 90 degrees with the thighs parallel to the floor, hold still for the clip, then slide back up. End pose: knees at 90 degrees, back flat on the wall. The clip lasts about 5 seconds: slide down once, hold still, then slide back up.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** costas e quadril encostados na parede, joelhos sobre os tornozelos.
  2. **Amplitude:** coxas paralelas ao chão, sem passar de 90 graus nos joelhos.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar (isometria: respirar de forma contínua).

### 27. `hip_thrust_machine` — Elevação Pélvica na Máquina  **REVISÃO OBRIGATÓRIA**
- **Categoria / grupo:** Glúteos / Glúteos, Isquiotibiais. **Equipamento do app:** `hip_machine` (máquina de quadril). **Nível:** Inte.
- **Arquivo final:** `hip_thrust_machine.mp4` (e poster `hip_thrust_machine.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a generic seated hip-thrust machine: padded lap bar, angled back pad, footplate, weight stack. Start pose: seated with the upper back against the angled pad, the padded bar across the hips, feet flat on the footplate, hips low. Movement: drive the hips up by pushing through the heels until the torso and thighs form a straight line, squeeze for a beat, then lower slowly. End pose: hips low, back on the pad. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak. LIGHT load only and a neutral, safe posture; this must look like a gentle technique demonstration, not a heavy lift.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** queixo recolhido, joelhos a 90 graus no topo, sem hiperextensão da lombar.
  2. **Amplitude:** subir até alinhar tronco e coxas; descer sem soltar a carga.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 28. `glute_machine_ex` — Glúteo Máximo na Máquina
- **Categoria / grupo:** Glúteos / Glúteos. **Equipamento do app:** `glute_machine` (máquina de glúteo). **Nível:** Inic.
- **Arquivo final:** `glute_machine_ex.mp4` (e poster `glute_machine_ex.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a generic standing glute machine: chest pad, a padded lever behind one leg, weight stack. Start pose: standing facing the machine with the chest on the pad, one foot on the footplate, the working leg against the padded lever, torso stable. Movement: push the lever back and slightly up by extending the hip, squeeze the glute for a beat, then return slowly. End pose: working leg forward, torso still. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** quadril quadrado, sem inclinar o tronco, joelho levemente flexionado.
  2. **Amplitude:** estender o quadril sem arquear a lombar; amplitude curta e controlada.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 29. `cable_kickback` — Coice no Cabo
- **Categoria / grupo:** Glúteos / Glúteos. **Equipamento do app:** `cable` (cabo (polia)). **Nível:** Inic.
- **Arquivo final:** `cable_kickback.mp4` (e poster `cable_kickback.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a low pulley with an ankle cuff. Start pose: standing facing the column, holding it lightly, the ankle cuff on one leg, torso slightly forward. Movement: extend that leg straight back without arching the lower back, squeeze the glute for a beat, then return slowly. End pose: working foot under the hip. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** quadril quadrado, lombar neutra, apoio firme.
  2. **Amplitude:** levar a perna para trás só até a lombar começar a ceder, sem balançar.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 30. `glute_bridge` — Elevação de Quadril
- **Categoria / grupo:** Glúteos / Glúteos, Isquiotibiais, Lombar. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `glute_bridge.mp4` (e poster `glute_bridge.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: an exercise mat. Start pose: lying on the back on the mat, knees bent, feet flat hip-width apart, arms along the body. Movement: lift the hips by pushing through the heels until the shoulders, hips and knees are in one line, squeeze for a beat, then lower slowly. End pose: lying with hips on the mat. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** joelhos alinhados com os pés, abdômen firme, pescoço relaxado.
  2. **Amplitude:** subir até a linha ombro-quadril-joelho, sem hiperestender a lombar.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 31. `donkey_kick` — Coice de Burro
- **Categoria / grupo:** Glúteos / Glúteos. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `donkey_kick.mp4` (e poster `donkey_kick.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: an exercise mat. Start pose: on hands and knees on the mat, hands under the shoulders, knees under the hips, back neutral. Movement: lift one bent leg back and up until the thigh is in line with the torso, the sole of the foot toward the ceiling, squeeze, then lower slowly. End pose: back to the four-point position. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** quadril quadrado ao chão, lombar neutra, pescoço alinhado.
  2. **Amplitude:** subir até a coxa alinhar com o tronco, sem girar o quadril.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 32. `fire_hydrant` — Abdução Quadrupede
- **Categoria / grupo:** Glúteos / Glúteo médio. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `fire_hydrant.mp4` (e poster `fire_hydrant.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: three-quarter view from behind. Equipment: an exercise mat. Start pose: on hands and knees on the mat, hands under the shoulders, knees under the hips. Movement: lift one bent knee out to the side to about hip height keeping the hips level, pause, then lower slowly. End pose: back to the four-point position. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** quadril nivelado, tronco estável, sem inclinar para o lado.
  2. **Amplitude:** subir até a altura do quadril sem girar a pelve.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 33. `sumo_squat` — Agachamento Sumo  **REVISÃO OBRIGATÓRIA**
- **Categoria / grupo:** Glúteos / Glúteos, Adutores, Quadríceps. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `sumo_squat.mp4` (e poster `sumo_squat.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: front view. Equipment: none (bodyweight). Start pose: standing with a wide stance and toes turned out about 45 degrees, hands together in front of the chest, no weight. Movement: lower the hips straight down with the knees tracking over the toes until the thighs are near parallel, then stand up squeezing the glutes. End pose: standing tall, wide stance. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak. LIGHT load only and a neutral, safe posture; this must look like a gentle technique demonstration, not a heavy lift.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** joelhos na direção dos pés (sem cair para dentro), tronco ereto, calcanhares no chão.
  2. **Amplitude:** descer até as coxas ficarem quase paralelas ao chão, sem agachamento profundo.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 34. `shoulder_machine_press` — Desenvolvimento na Máquina
- **Categoria / grupo:** Ombros / Deltóide, Tríceps. **Equipamento do app:** `shoulder_machine` (máquina de ombros). **Nível:** Inic.
- **Arquivo final:** `shoulder_machine_press.mp4` (e poster `shoulder_machine_press.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a generic selectorised shoulder-press machine: adjustable seat, two handles on pivoting arms, weight stack. Start pose: seated with the back against the pad, handles at shoulder height, elbows bent about 90 degrees. Movement: press the handles overhead until the arms are almost straight without locking the elbows, then lower slowly to shoulder height. End pose: handles at shoulder height. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** costas apoiadas, punhos sobre os cotovelos, sem arquear a lombar.
  2. **Amplitude:** subir quase estendendo sem travar; descer até a altura dos ombros.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 35. `cable_lateral_raise` — Elevação Lateral no Cabo
- **Categoria / grupo:** Ombros / Deltóide lateral. **Equipamento do app:** `cable` (cabo (polia)). **Nível:** Inte.
- **Arquivo final:** `cable_lateral_raise.mp4` (e poster `cable_lateral_raise.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: front view. Equipment: a low pulley with a plain handle. Start pose: standing sideways to the column, the handle held in the far hand crossing in front of the body, elbow slightly bent. Movement: raise the arm out to the side in an arc up to shoulder height, pause one beat, then lower slowly. End pose: hand in front of the body. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** tronco parado, ombro baixo, cotovelo levemente flexionado.
  2. **Amplitude:** subir só até a altura do ombro; sem balançar o corpo.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 36. `shoulder_press` — Desenvolvimento com Halteres
- **Categoria / grupo:** Ombros / Deltóide, Tríceps. **Equipamento do app:** `dumbbells` (halteres). **Nível:** Inte.
- **Arquivo final:** `shoulder_press.mp4` (e poster `shoulder_press.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: three-quarter view. Equipment: a pair of light generic hex dumbbells (no markings). Start pose: standing or seated upright with a light dumbbell in each hand at shoulder height, palms facing forward, elbows bent about 90 degrees. Movement: press both dumbbells overhead until the arms are almost straight, then lower slowly back to shoulder height. End pose: dumbbells at shoulder height. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** abdômen firme, sem arquear a lombar, punhos sobre os cotovelos.
  2. **Amplitude:** subir quase estendendo sem travar; descer até a altura dos ombros.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 37. `lateral_raise` — Elevação Lateral
- **Categoria / grupo:** Ombros / Deltóide lateral. **Equipamento do app:** `dumbbells` (halteres). **Nível:** Inic.
- **Arquivo final:** `lateral_raise.mp4` (e poster `lateral_raise.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: front view. Equipment: a pair of light generic hex dumbbells (no markings). Start pose: standing tall with a light dumbbell in each hand at the sides, elbows slightly bent. Movement: raise both arms out to the sides in an arc up to shoulder height, pause one beat, then lower slowly. End pose: arms at the sides. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** tronco ereto, sem balançar, ombros longe das orelhas.
  2. **Amplitude:** subir só até a altura dos ombros.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 38. `front_raise` — Elevação Frontal
- **Categoria / grupo:** Ombros / Deltóide anterior. **Equipamento do app:** `dumbbells` (halteres). **Nível:** Inic.
- **Arquivo final:** `front_raise.mp4` (e poster `front_raise.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a pair of light generic hex dumbbells (no markings). Start pose: standing tall with a light dumbbell in each hand in front of the thighs, palms facing the body. Movement: raise the arms forward alternately or together to shoulder height with straight but relaxed arms, pause, then lower slowly. End pose: arms in front of the thighs. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** sem inclinar o tronco para trás, abdômen firme.
  2. **Amplitude:** subir só até a altura dos ombros.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 39. `pike_pushup` — Flexão Pike
- **Categoria / grupo:** Ombros / Deltóide, Tríceps. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `pike_pushup.mp4` (e poster `pike_pushup.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: none (bodyweight). Start pose: in an inverted V position on hands and toes, hips high, arms straight, head between the arms. Movement: bend the elbows to lower the top of the head toward the floor between the hands, then push back up to straight arms. End pose: inverted V position. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** cotovelos para trás (não abertos), pescoço neutro, quadril alto.
  2. **Amplitude:** descer só até onde mantém o controle; sem pressão no pescoço.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 40. `cable_pushdown` — Tríceps no Pulley (Corda)
- **Categoria / grupo:** Braços / Tríceps. **Equipamento do app:** `cable` (cabo (polia)). **Nível:** Inic.
- **Arquivo final:** `cable_pushdown.mp4` (e poster `cable_pushdown.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a high pulley with a rope attachment. Start pose: standing facing the column, elbows tucked at the sides, forearms bent holding the rope at chest height. Movement: push the rope down until the arms are straight, spreading the rope ends slightly apart at the bottom, then return slowly to chest height. End pose: forearms at chest height. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** cotovelos fixos junto ao corpo, tronco ereto, punhos neutros.
  2. **Amplitude:** estender por completo sem travar com força; voltar até o antebraço ficar paralelo ao chão.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 41. `cable_curl` — Rosca no Cabo
- **Categoria / grupo:** Braços / Bíceps. **Equipamento do app:** `cable` (cabo (polia)). **Nível:** Inic.
- **Arquivo final:** `cable_curl.mp4` (e poster `cable_curl.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a low pulley with a short straight bar. Start pose: standing facing the column, arms extended holding the bar at the thighs, elbows at the sides. Movement: curl the bar up toward the shoulders keeping the elbows still, pause one beat, then lower slowly. End pose: arms extended at the thighs. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** cotovelos fixos ao lado do corpo, sem balançar o tronco.
  2. **Amplitude:** subir até o antebraço ficar vertical e descer quase estendendo.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 42. `barbell_curl` — Rosca Direta na Barra W  **REVISÃO OBRIGATÓRIA**
- **Categoria / grupo:** Braços / Bíceps. **Equipamento do app:** `barbell` (barra W). **Nível:** Inic.
- **Arquivo final:** `barbell_curl.mp4` (e poster `barbell_curl.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a light W-shaped curl bar with small plates (very light load). Start pose: standing tall with a very light W-shaped curl bar held at the thighs with an underhand shoulder-width grip, elbows at the sides. Movement: curl the bar up toward the shoulders keeping the elbows still and the torso upright, pause, then lower slowly. End pose: arms extended at the thighs. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak. LIGHT load only and a neutral, safe posture; this must look like a gentle technique demonstration, not a heavy lift.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** tronco ereto sem balançar, punhos neutros, cotovelos junto ao corpo.
  2. **Amplitude:** subir sem tirar os cotovelos do lugar e descer controlando; carga leve.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 43. `bicep_curl` — Rosca Bíceps
- **Categoria / grupo:** Braços / Bíceps. **Equipamento do app:** `dumbbells` (halteres). **Nível:** Inic.
- **Arquivo final:** `bicep_curl.mp4` (e poster `bicep_curl.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: three-quarter view. Equipment: a pair of light generic hex dumbbells (no markings). Start pose: standing tall with a light dumbbell in each hand at the sides, palms facing forward. Movement: curl both dumbbells up toward the shoulders keeping the elbows still, pause, then lower slowly. End pose: arms extended at the sides. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** cotovelos fixos, ombros baixos, tronco parado.
  2. **Amplitude:** subir até a altura dos ombros e descer quase estendendo.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 44. `hammer_curl` — Rosca Martelo
- **Categoria / grupo:** Braços / Bíceps, Braquial. **Equipamento do app:** `dumbbells` (halteres). **Nível:** Inic.
- **Arquivo final:** `hammer_curl.mp4` (e poster `hammer_curl.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: three-quarter view. Equipment: a pair of light generic hex dumbbells (no markings). Start pose: standing tall with a light dumbbell in each hand at the sides, palms facing the body. Movement: curl the dumbbells up with the palms kept facing each other, pause, then lower slowly. End pose: arms extended at the sides. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** punhos neutros, cotovelos fixos, sem balançar.
  2. **Amplitude:** subir até a altura dos ombros e descer controlando.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 45. `tricep_ext` — Extensão Tríceps com Haltere
- **Categoria / grupo:** Braços / Tríceps. **Equipamento do app:** `dumbbells` (halteres). **Nível:** Inic.
- **Arquivo final:** `tricep_ext.mp4` (e poster `tricep_ext.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a pair of light generic hex dumbbells (no markings). Start pose: standing or seated upright holding one light dumbbell with both hands overhead, arms straight. Movement: bend the elbows to lower the dumbbell behind the head keeping the upper arms vertical, then extend back up. End pose: arms straight overhead. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** cotovelos apontando para cima e próximos da cabeça, abdômen firme.
  2. **Amplitude:** descer até o antebraço formar cerca de 90 graus e estender sem travar.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 46. `tricep_dip` — Tríceps no Banco  **REVISÃO OBRIGATÓRIA**
- **Categoria / grupo:** Braços / Tríceps. **Equipamento do app:** `bench` (banco). **Nível:** Inic.
- **Arquivo final:** `tricep_dip.mp4` (e poster `tricep_dip.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a sturdy flat bench. Start pose: seated on the edge of the bench, hands gripping the edge beside the hips, feet flat on the floor, hips just off the bench with arms straight. Movement: bend the elbows to lower the hips toward the floor close to the bench until the elbows are about 90 degrees, then push back up. End pose: arms straight, hips off the bench. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak. LIGHT load only and a neutral, safe posture; this must look like a gentle technique demonstration, not a heavy lift.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** cotovelos para trás (não abertos), ombros baixos, quadril rente ao banco.
  2. **Amplitude:** descer só até cerca de 90 graus nos cotovelos; sem pressão excessiva nos ombros.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 47. `cable_crunch` — Abdominal no Cabo
- **Categoria / grupo:** Core / Reto abdominal. **Equipamento do app:** `cable` (cabo (polia)). **Nível:** Inte.
- **Arquivo final:** `cable_crunch.mp4` (e poster `cable_crunch.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a high pulley with a rope attachment, kneeling on a mat. Start pose: kneeling facing the column, holding the rope beside the head, hips still, torso upright (light load). Movement: curl the torso down by flexing the spine, bringing the elbows toward the knees, pause, then return slowly. End pose: kneeling upright. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** quadril parado, movimento vem do abdômen, sem puxar com os braços.
  2. **Amplitude:** flexionar a coluna até o abdômen contrair; sem sentar sobre os calcanhares.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 48. `plank` — Prancha Isométrica
- **Categoria / grupo:** Core / Core, Abdômen. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `plank.mp4` (e poster `plank.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: an exercise mat. Start pose: forearm plank on the mat, elbows under the shoulders, body in one straight line from head to heels. Movement: hold the position perfectly still, breathing steadily, with only a tiny natural breathing motion. End pose: same plank position. The clip lasts about 5 seconds: a perfectly still isometric hold, no repetitions.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** corpo em linha reta, quadril nem alto nem baixo, pescoço neutro.
  2. **Amplitude:** isometria: sem movimento; manter a posição estável por todo o clipe.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar (isometria: respirar de forma contínua).

### 49. `crunch` — Abdominal Crunch
- **Categoria / grupo:** Core / Reto abdominal. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `crunch.mp4` (e poster `crunch.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: an exercise mat. Start pose: lying on the back on the mat, knees bent, feet flat, hands lightly behind the head, elbows wide. Movement: curl the head and shoulder blades off the mat by contracting the abdomen, pause one beat, then lower slowly. End pose: lying with shoulders on the mat. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** pescoço relaxado (sem puxar a cabeça), lombar apoiada, queixo afastado do peito.
  2. **Amplitude:** subir só até as escápulas saírem do chão.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 50. `leg_raise` — Elevação de Pernas
- **Categoria / grupo:** Core / Abdômen inferior. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inte.
- **Arquivo final:** `leg_raise.mp4` (e poster `leg_raise.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: an exercise mat. Start pose: lying on the back on the mat, legs straight and together, hands under the hips or at the sides. Movement: raise the straight legs to vertical, then lower them slowly almost to the mat without touching, keeping the lower back pressed down. End pose: legs just above the mat. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** lombar colada ao chão, pernas juntas, pescoço relaxado.
  2. **Amplitude:** descer só até onde a lombar continua apoiada; sem balanço.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 51. `russian_twist` — Giro Russo
- **Categoria / grupo:** Core / Oblíquos. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `russian_twist.mp4` (e poster `russian_twist.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: three-quarter front view. Equipment: an exercise mat. Start pose: seated on the mat with the knees bent, torso leaning back about 45 degrees, hands clasped in front of the chest, feet lifted slightly. Movement: rotate the torso slowly to one side, then to the other, moving the hands across the body. End pose: torso centered. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** coluna alongada, peito aberto, rotação vem do tronco (não dos braços).
  2. **Amplitude:** girar até cerca de 45 graus para cada lado, sem balançar as pernas.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 52. `dead_bug` — Dead Bug
- **Categoria / grupo:** Core / Core profundo, Estabilizadores. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `dead_bug.mp4` (e poster `dead_bug.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: three-quarter view from above-side. Equipment: an exercise mat. Start pose: lying on the back on the mat, arms pointing to the ceiling, hips and knees bent at 90 degrees. Movement: slowly lower the opposite arm and leg toward the mat while the lower back stays pressed down, return, then switch sides. End pose: arms up and knees at 90 degrees. The clip lasts about 5 seconds: two slow repetitions, about 2 seconds to lower or open and 2 seconds to return, a one-beat pause at the peak.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** lombar colada ao chão durante todo o movimento, pescoço relaxado.
  2. **Amplitude:** estender só até onde a lombar não descola; ritmo lento.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 53. `jumping_jack` — Polichinelo
- **Categoria / grupo:** Cardio / Cardiovascular. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `jumping_jack.mp4` (e poster `jumping_jack.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: front view. Equipment: none (bodyweight). Start pose: standing tall with the feet together and the arms at the sides. Movement: jump the feet apart while swinging the arms overhead, then jump back to the start, in a light rhythmic motion. End pose: standing with feet together. The clip lasts about 5 seconds as a continuous, rhythmic, loop-friendly motion.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** joelhos levemente flexionados na aterrissagem, ombros relaxados.
  2. **Amplitude:** abrir as pernas na largura dos ombros ou um pouco mais; aterrissar suave.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 54. `high_knees` — Corrida Estacionária
- **Categoria / grupo:** Cardio / Cardiovascular, Core. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `high_knees.mp4` (e poster `high_knees.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: none (bodyweight). Start pose: standing tall, arms bent at the sides. Movement: jog in place lifting the knees to hip height alternately with a light rhythm and natural arm swing. End pose: standing tall. The clip lasts about 5 seconds as a continuous, rhythmic, loop-friendly motion.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** tronco ereto, apoio na ponta dos pés, braços opostos às pernas.
  2. **Amplitude:** joelhos até a altura do quadril, impacto leve.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 55. `step_touch` — Step Touch
- **Categoria / grupo:** Cardio / Cardiovascular. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `step_touch.mp4` (e poster `step_touch.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: front view. Equipment: none (bodyweight). Start pose: standing tall with the feet together, arms relaxed. Movement: step one foot out to the side and touch the other foot beside it, then step back the other way, rhythmically, with a gentle arm swing. End pose: feet together. The clip lasts about 5 seconds as a continuous, rhythmic, loop-friendly motion.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** peso bem distribuído, joelhos macios, tronco ereto.
  2. **Amplitude:** passos curtos e contínuos, sem impacto.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 56. `burpee` — Burpee  **REVISÃO OBRIGATÓRIA**
- **Categoria / grupo:** Cardio / Corpo todo. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inte.
- **Arquivo final:** `burpee.mp4` (e poster `burpee.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: none (bodyweight). Start pose: standing tall with the feet shoulder-width apart. Movement: squat down and place the hands on the floor, step or jump the feet back into a high plank, do one push-up (optional), return the feet to the hands, and stand up with a small jump and the arms overhead (light and controlled). End pose: standing tall. The clip lasts about 5 seconds as a continuous, rhythmic, loop-friendly motion. LIGHT load only and a neutral, safe posture; this must look like a gentle technique demonstration, not a heavy lift.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** prancha com corpo alinhado, joelhos protegidos na aterrissagem.
  2. **Amplitude:** ritmo controlado, sem pular com a lombar arqueada; opção sem salto.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 57. `march_place` — Marcha Estacionária
- **Categoria / grupo:** Cardio / Cardiovascular. **Equipamento do app:** `bodyweight` (peso do corpo). **Nível:** Inic.
- **Arquivo final:** `march_place.mp4` (e poster `march_place.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: front view. Equipment: none (bodyweight). Start pose: standing tall with the arms bent at the sides. Movement: march in place lifting the knees to a comfortable height alternately with a natural arm swing. End pose: standing tall. The clip lasts about 5 seconds as a continuous, rhythmic, loop-friendly motion.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** tronco ereto, ombros relaxados, apoio estável.
  2. **Amplitude:** joelhos a uma altura confortável, sem impacto.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 58. `treadmill` — Esteira
- **Categoria / grupo:** Cardio / Cardiovascular. **Equipamento do app:** `cardio_machine` (aparelho cardio). **Nível:** Inic.
- **Arquivo final:** `treadmill.mp4` (e poster `treadmill.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a generic treadmill: a flat belt, side handrails and a console with no readable text. Start pose: standing on the belt holding the side rails lightly, upright posture. Movement: walk at a steady comfortable pace with a natural arm swing and heel-to-toe steps, the belt moving smoothly. End pose: continuous steady walking, the loop is seamless. The clip lasts about 5 seconds as a continuous, rhythmic, loop-friendly motion.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** postura ereta, olhar à frente, passos naturais sem se apoiar nos corrimãos.
  2. **Amplitude:** passada natural, sem inclinar o tronco para a frente.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

### 59. `bike_cardio` — Bike Ergométrica
- **Categoria / grupo:** Cardio / Cardiovascular. **Equipamento do app:** `cardio_machine` (aparelho cardio). **Nível:** Inic.
- **Arquivo final:** `bike_cardio.mp4` (e poster `bike_cardio.jpg`).
- **Prompt (inglês):**
```
A generic 3D mannequin figure, neutral light-gray matte body, no face details, no hair, no clothing logos, smooth stylized proportions, athletic build. Clean minimal gym studio, soft even lighting, light neutral background, subtle floor shadow. Static locked-off camera, full body in frame, side or three-quarter angle chosen to show the movement clearly. Smooth slow controlled movement, exact range of motion, one or two repetitions only, seamless loop-friendly start and end pose. No text, no captions, no logos, no brand names, no music, no sound, no voice. Silent video. Camera: side view. Equipment: a generic stationary ergometer bike: padded saddle, handlebars, flywheel and pedals with straps, console with no readable text. Start pose: seated on the saddle with the hands on the handlebars, the feet on the pedals. Movement: pedal at a steady comfortable cadence with the knees tracking straight over the feet. End pose: continuous steady pedaling, the loop is seamless. The clip lasts about 5 seconds as a continuous, rhythmic, loop-friendly motion.
```
- **Negative prompt:** `extra limbs, distorted joints, fast motion, camera movement, zoom, text, logo, audio, people, face, clothing branding`
- **Pontos de revisão (educador físico):**
  1. **Alinhamento:** altura do banco correta (joelho levemente flexionado embaixo), coluna neutra, joelhos alinhados.
  2. **Amplitude:** pedalada circular contínua, sem balançar o quadril.
  3. **Respiração:** inspirar na fase de descida/preparação e expirar no esforço (subida/contração); sem prender o ar.

## Resumo

- 59 exercícios; **11 com revisão obrigatória**.
- Gere um exercício de cada vez, no mesmo estilo, e confira a consistência entre vídeos (o mesmo manequim, a mesma luz e o mesmo fundo).
- Acompanhamento da produção: `docs/videos-planilha.md`. Conversão e otimização: `scripts/preparar-videos.sh`.
