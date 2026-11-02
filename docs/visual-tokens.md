# Tokens visuais

Definidos em `src/utils/theme.js` (único arquivo de tema). Esta etapa **só define** tokens: nenhuma tela ou componente foi migrado, e a **única mudança de aparência** é a cor `textMuted`. O contexto está em `docs/visual-auditoria.md`.

**Regra: novos estilos só usam tokens.** Não escreva hex, `fontSize`, `fontWeight`, `borderRadius` nem espaçamento numérico direto em tela ou componente novo; use `COLORS`, `TYPE` (ou `FONTS`), `SPACING` e `RADIUS`. O teste `backend/test/tokens.test.ts` falha se uma referência `COLORS.x`, `SPACING.x`, `RADIUS.x`, `FONTS.x`, `SHADOWS.x`, `HEALTH_UI.x` ou `TYPE.x` apontar para um token que não existe.

## Escala adotada

| grupo | tokens |
|---|---|
| cores | `primary` #fed205, `black`, `white`, `bg` #0A0A0A, `bgCard` #141414, `bgCardAlt` #1C1C1C, `border` #2A2A2A, `textPrimary` #FFFFFF, `textSecondary` #888888, **`textMuted` #8E8E93 (era #555555)**, `success`, `error`, `warning` |
| tamanhos (`FONTS.sizes`) | xs 11, sm 13, md 15, lg 18, xl 22, xxl 28, xxxl 36 |
| pesos (`FONTS.weights`) | regular 400, medium 500, semibold 600, bold 700 (nenhum peso novo) |
| escala tipográfica (`TYPE`) | `caption` 11 regular; `bodySmall` 13 regular; `body` 15 regular; `bodyLarge` 18 semibold; `title` 22 bold; `titleLarge` 28 bold; `display` 36 bold. A fonte continua a do sistema |
| espaçamento (`SPACING`) | xs 4, sm 8, **smd 12 (novo)**, md 16, lg 24, xl 32, xxl 48 (todos múltiplos de 4) |
| raios (`RADIUS`) | **xs 0 (novo)**, **tight 4 (novo)**, sm 8, md 12, lg 16, xl 24, full 999 |

Observações:

- **`RADIUS.xs` vale 0 de propósito.** `AIPersonalTrainerScreen.js:684` já usava `RADIUS.xs`, que não existia: o `borderRadius` era `undefined`, tratado pelo React Native como sem arredondamento. Com `xs: 0` o visual fica idêntico. (A confirmação é pela semântica do React Native; a tela não foi aberta em aparelho.)
- **Os literais 2, 3, 6, 7 e 10** de espaçamento e vários raios soltos (3, 5, 6, 7, 10, 11, 13, 14, 20, 22, 36, 40, 44) não são múltiplos de 4 e **não ganharam token**; a etapa de migração decide para onde cada um vai.
- **Tamanhos 32, 40, 44, 52 e 56** (números grandes de IMC e Duo Score) estão fora da escala `TYPE`; também ficam para a migração.
- `TYPE` ainda **não é usado por nenhuma tela** (o teste confere).

## Contraste do `textMuted` (#8E8E93)

| superfície | razão | limite |
|---|---|---|
| `bg` (#0A0A0A) | **6,07:1** | 4,5:1 (texto normal) |
| `bgCard` (#141414) | **5,65:1** | 4,5:1 |
| `bgCardAlt` (#1C1C1C) | **5,23:1** | 4,5:1 |

Passa nas três superfícies sem ajuste de tom. Fora das três exigidas: sobre `border` (#2A2A2A) 4,40:1 e sobre o literal `#3a2a00` 4,26:1 (abaixo de 4,5:1; nenhum uso de `textMuted` sobre esses fundos foi achado na auditoria); sobre `black` 6,44:1 e sobre os literais `#1a1700`, `#141200` e `#0d1117` 5,52, 5,77 e 5,80:1.

**Atenção para a decisão de design:** o novo `textMuted` ficou **um pouco mais claro que `textSecondary` (#888888)**: razão entre eles ≈ 1,1:1 (luminância 0,272 contra 0,246). Para um `textMuted` mais apagado que o secundário e ainda com 4,5:1 sobre `bgCardAlt`, o tom mínimo seria perto de #838383; não foi feito porque a escolha pedida foi #8E8E93.

## Usos de `textMuted` com baixo contraste intencional (para decidir depois)

Não foi criado token novo para eles: continuam `COLORS.textMuted` (agora com 5,2 a 6,1:1). Hoje o contraste baixo era proposital em:

**Placeholder de campo (`placeholderTextColor`), 8 usos:** `screens/AIPersonalTrainerScreen.js:639`; `screens/CreateWorkoutScreen.js:57`; `screens/EditBodyDataScreen.js:86` e `:102`; `screens/ExercisesScreen.js:43`; `screens/onboarding/BodyDataScreen.js:89` e `:105`; `screens/onboarding/ProfileSetupScreen.js:65`.

**Estado desabilitado, 1 uso:** `screens/AIPersonalTrainerScreen.js:650` (ícone de enviar quando o campo está vazio, carregando ou o plano já saiu).

**Estado inativo ou pendente (não desabilitado, mas apagado de propósito), 3 usos:** `components/guided/GuidedParts.js:76` (ícone da opção não selecionada), `components/guided/GuidedParts.js:148` (passo ainda pendente do checklist), `screens/ExercisesScreen.js:25` (cor de reserva para dificuldade desconhecida).

**Decorativos (separadores e ícones sem informação própria), 13 usos:** pontos separadores `screens/WorkoutDetailScreen.js:87` e `screens/WorkoutsScreen.js:251`; setas de avançar e recolher `components/RemindersCard.js:17`, `screens/ExercisesScreen.js:106`, `screens/HomeScreen.js:120` e `:269`, `screens/SmartPlanScreen.js:177`, `screens/WorkoutsScreen.js:81`, `:100` e `:210`; ícones grandes de estado vazio `screens/ExercisesScreen.js:79`, `screens/ProfileScreen.js:133`, `screens/WorkoutsScreen.js:119`.

Os demais usos (rótulos, legendas e metadados em `FONTS.sizes.xs` e `sm`) são texto informativo e passam a cumprir 4,5:1.
