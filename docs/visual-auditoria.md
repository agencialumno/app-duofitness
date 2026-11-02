# Auditoria visual do app (somente leitura)

Auditoria **estática**: lê o código de `src/` e `App.js`, mede o que dá para medir por leitura e calcula contraste (WCAG 2.1) com as cores do tema. **Nada foi alterado no app** e **nada foi executado em aparelho**: tudo o que depende de olhar a tela está marcado como **não verificável**. Não há opinião de estética nem proposta de redesenho: só o que existe e as medidas.

**Base medida:** 150 arquivos `.js` em `src/` mais o `App.js`; 54 arquivos de interface analisados (30 em `src/screens`, sendo 29 telas e o `SocialButtons`; 23 em `src/components`; e o `App.js`), com 1135 entradas de `StyleSheet`. As contagens usam expressões regulares e um leitor simples de `StyleSheet.create`; estilos inline e cores calculadas em tempo de execução aparecem como "dinâmicos" quando não dá para resolver.

## 1. Mapa de telas

O `RootNavigator` escolhe **uma** árvore pelo estado da conta (`AppContext.gate`): `loading` (devolve `null`, sem tela própria), `auth`, `age`, `onboarding` ou `main`. Todos os navegadores são pilhas (`@react-navigation/stack`) e o principal tem abas (`@react-navigation/bottom-tabs`); o `App.js` devolve `null` enquanto as fontes dos ícones carregam. Nenhum navegador mostra cabeçalho nativo (`headerShown: false` em `STACK_SCREEN_OPTIONS` e nas abas): cada tela desenha o próprio cabeçalho.

| árvore / aba | navegador | rota | arquivo (em `src/`) | como se chega |
|---|---|---|---|---|
| auth | RootNavigator.js (AuthStack) | Welcome | screens/onboarding/WelcomeScreen.js | inicial da árvore `auth` |
| auth | RootNavigator.js (AuthStack) | SignUp | screens/auth/SignUpScreen.js | Welcome:50 `navigate`; SignIn:53 `replace` |
| auth | RootNavigator.js (AuthStack) | SignIn | screens/auth/SignInScreen.js | Welcome:53 `navigate`; SignUp:76 `replace` |
| auth | RootNavigator.js (AuthStack) | ForgotPassword | screens/auth/ForgotPasswordScreen.js | SignIn:50 `navigate` |
| age | RootNavigator.js (AgeStack) | AgeGate | screens/auth/AgeGateScreen.js | única tela da árvore `age` (conta sem idade informada) |
| onboarding | OnboardingNavigator.js | ProfileSetup | screens/onboarding/ProfileSetupScreen.js | inicial da árvore `onboarding` |
| onboarding | OnboardingNavigator.js | BodyData | screens/onboarding/BodyDataScreen.js | ProfileSetup:107 `navigate` |
| onboarding | OnboardingNavigator.js | LevelSelect | screens/onboarding/LevelSelectScreen.js | BodyData:137 `navigate` |
| main / aba Início | MainNavigator.js (HomeStack) | HomeMain | screens/HomeScreen.js | aba "Início" (aba inicial) |
| main / aba Início | MainNavigator.js (HomeStack) | Loja | screens/StoreScreen.js | Home:221 (marketplace) |
| main / aba Início | MainNavigator.js (HomeStack) | LojaDetalhe | screens/StoreDetailScreen.js | Home:205; Store:100 |
| main / aba Início | MainNavigator.js (HomeStack) | AnunciarMarketplace | screens/AdvertiseScreen.js | Store:67 e 133; banners (`navigate(destino.rota)` em Store:65) |
| main / aba Início | MainNavigator.js (HomeStack) | AcademiaAgora | screens/GymNowScreen.js | Home:179 |
| main / aba Início (e Perfil) | MainNavigator.js (HomeStack e ProfileStack) | Saude | screens/HealthScreen.js | Home:233; Profile:197 (mesma tela registrada nas duas pilhas) |
| main / aba Início (e Perfil) | MainNavigator.js (HomeStack e ProfileStack) | SaudeDetalhe | screens/HealthCategoryScreen.js | Health:45 e 91 |
| main / aba Início (e Perfil) | MainNavigator.js (HomeStack e ProfileStack) | SaudeConectar | screens/HealthConnectScreen.js | Health:93 |
| main / aba Treinos | MainNavigator.js (WorkoutStack) | WorkoutsList | screens/WorkoutsScreen.js | aba "Treinos" |
| main / aba Treinos | MainNavigator.js (WorkoutStack) | WorkoutDetail | screens/WorkoutDetailScreen.js | Workouts:182; Home:258 (`openInTab`) |
| main / aba Treinos | MainNavigator.js (WorkoutStack) | CreateWorkout | screens/CreateWorkoutScreen.js | Workouts:111 e 144; Home:169 (`openInTab`) |
| main / aba Treinos | MainNavigator.js (WorkoutStack) | ActiveWorkout | screens/ActiveWorkoutScreen.js | WorkoutDetail:48 |
| main / aba Treinos | MainNavigator.js (WorkoutStack) | SmartPlan | screens/SmartPlanScreen.js | Workouts:136; Home:162 (`openInTab`) |
| main / aba Treinos | MainNavigator.js (WorkoutStack) | AIPersonalTrainer | screens/GuidedPlanScreen.js | Workouts:128 e 158; Home:142 (`openInTab`) |
| main / aba Treinos | MainNavigator.js (WorkoutStack) | AIPersonalTrainerChat | screens/AIPersonalTrainerScreen.js | GuidedPlan:103 |
| main / aba Treinos | MainNavigator.js (WorkoutStack) | EvolucaoSeries | screens/SeriesTimelineScreen.js | Workouts:60 e 172 |
| main / aba Exercícios | MainNavigator.js (ExerciseStack) | ExercisesList | screens/ExercisesScreen.js | aba "Exercícios" |
| main / aba Exercícios | MainNavigator.js (ExerciseStack) | ExerciseDetail | screens/ExerciseDetailScreen.js | Exercises:88; WorkoutDetail:59 (`openInTab`) |
| main / aba Perfil | MainNavigator.js (ProfileStack) | ProfileMain | screens/ProfileScreen.js | aba "Perfil"; Home:116 |
| main / aba Perfil | MainNavigator.js (ProfileStack) | EditBodyData | screens/EditBodyDataScreen.js | Profile:90 e 131 |
| main / aba Perfil | MainNavigator.js (ProfileStack) | Lembretes | screens/RemindersScreen.js | Profile:199 (cartão só com a flag de notificações) |

Total: **29 registros de rota**, **29 arquivos de tela** (Saúde, SaúdeDetalhe e SaúdeConectar são registradas em duas pilhas).

**Abas** (`MainNavigator.js:123-126`): Início (`Home`), Treinos (`Workouts`), Exercícios (`Exercises`), Perfil (`Profile`); barra com `height: 60 + insets.bottom`.

**Modais e sobreposições (não são rotas):**

| elemento | arquivo | como aparece |
|---|---|---|
| Folha de ajuda "i" (`InfoSheet`, `Modal` do React Native) | components/InfoSheet.js | via `InfoButton` (importado em 12 arquivos: Saúde, Início, Exercício, Série guiada, Academia agora, Editar medidas e outros) |
| `ConfirmModal` (`Modal`, animação `fade`) | components/auth/AuthParts.js:258 | AccountCard (sair e excluir conta) e HealthConnectScreen (desconectar) |
| Telas de recuperação do `ErrorBoundary` | components/ErrorBoundary.js | substitui o app inteiro quando há erro; não usa navegação nem contexto |
| Alertas nativos (`Alert.alert`) | 9 arquivos | 11 chamadas (components/ErrorBoundary.js, context/AppContext.js, screens/ActiveWorkoutScreen.js, screens/CreateWorkoutScreen.js ×2, screens/EditBodyDataScreen.js, screens/StoreDetailScreen.js ×2, screens/WorkoutDetailScreen.js, utils/remindersService.js, utils/seriesView.js) |
| Tela em branco do portão | navigation/RootNavigator.js | `gate === "loading"` devolve `null`; `App.js` devolve `null` enquanto as fontes dos ícones carregam (a tela vista é a splash nativa; **não verificável** o intervalo) |


**Estados internos de uma mesma rota** (telas dentro da tela): `GuidedPlanScreen` (intro, perguntas, montagem, revisão e salva), `SmartPlanScreen` (perguntas passo a passo, depois o plano), `AIPersonalTrainerScreen` (conversa), `BodyDataScreen`/`EditBodyDataScreen` (medidas e IMC) e `HealthScreen` (seções e relatório recolhido).

## 2. Tokens que existem hoje

**Onde ficam:** `src/utils/theme.js` (`COLORS`, `FONTS`, `SPACING`, `RADIUS`, `SHADOWS` e `HEALTH_UI`) e `src/navigation/navTheme.js` (`NAV_COLORS`, que reaproveita `COLORS`). Existe **um tema central**, mas há também valores soltos nos estilos (seção 2.3).

**Modo claro e modo escuro:** só existe o **escuro**. O `app.json` declara `"userInterfaceStyle": "dark"`; não há `useColorScheme`, `Appearance` nem um segundo conjunto de cores em `src/`; `keyboardAppearance="dark"` aparece em 3 campos de texto. Portanto **não há tema claro a medir**; os contrastes da seção 5 valem para o único tema.

**Família de fonte:** nenhuma ocorrência de `fontFamily` em `src/` nem no `App.js`; as únicas fontes carregadas são as dos ícones (`useFonts` com Ionicons e MaterialCommunityIcons). Os textos usam a fonte padrão do sistema. (O `CLAUDE.md` cita Roboto como identidade, mas o código não declara nem carrega essa fonte.)

### 2.1 Cores (`COLORS`)

| token | valor | usos no código de interface |
|---|---|---|
| primary | #fed205 | 255 |
| black | #000000 | 88 |
| white | #FFFFFF | 163 |
| bg | #0A0A0A | 38 |
| bgCard | #141414 | 90 |
| bgCardAlt | #1C1C1C | 27 |
| border | #2A2A2A | 131 |
| textPrimary | #FFFFFF | 6 |
| textSecondary | #888888 | 191 |
| textMuted | #555555 | 73 |
| success | #22c55e | 15 |
| error | #ef4444 | 19 |
| warning | #f97316 | 9 |


### 2.2 Tipografia, espaçamento, raios e sombras

| escala | valores definidos | usos de token |
|---|---|---|
| `FONTS.sizes` | xs=11, sm=13, md=15, lg=18, xl=22, xxl=28, xxxl=36 | lg: 26, md: 118, sm: 127, xl: 16, xs: 84, xxl: 25, xxxl: 1 |
| `FONTS.weights` | regular 400, medium 500, semibold 600, bold 700 | **0** (nenhum estilo usa `FONTS.weights`) |
| `SPACING` | xs=4, sm=8, md=16, lg=24, xl=32, xxl=48 | lg: 84, md: 174, sm: 266, xl: 32, xs: 91, xxl: 22 |
| `RADIUS` | sm=8, md=12, lg=16, xl=24, full=999 | full: 61, lg: 45, md: 38, sm: 13, xl: 5, xs: 1 |
| `SHADOWS` | `card` (sombra amarela, opacidade 0,15, raio 8, elevation 4) | **0** usos; também **0** `shadow*` e **0** `elevation` literais em `src/` |
| `HEALTH_UI` | escala própria da Saúde: espaços (16/12/24/8/4), 5 estilos de texto (fontes 18/32/15/13/12 com `lineHeight` 24/40/20/20/16), cartão (raio 16, borda 1), `minTouch` 44 | 7 usos em 2 arquivos (CategoryCard, HealthCategoryScreen) |
| linha de texto (`lineHeight`) | não há token fora da `HEALTH_UI` | 68 literais |
| borda (`borderWidth`) | não há token | 123 literais (valores: 1, 1.5, 2, 3) |


**Token inexistente:** `RADIUS.xs` é usado em `screens/AIPersonalTrainerScreen.js:684` (`planSerieBadge`), mas `RADIUS` não tem `xs` (só sm, md, lg, xl e full): o valor resolve para `undefined` (1 uso na contagem de `RADIUS` acima). Nenhum outro token usado deixa de existir em `COLORS`, `FONTS` e `SPACING`.

### 2.3 Valores escritos direto nos estilos (fora do tema)

| categoria | usos literais | valores distintos | usos de token | literais fora da escala do tema |
|---|---|---|---|---|
| cores (hex + rgba) | 67 | 24 hex + 3 rgba | 1105 | 18 hex distintos que não são nenhum token |
| tamanho de fonte (`fontSize`) | 17 | 9 (10, 11, 12, 32, 36, 40, 44, 52, 56) | 397 | 13 de 17 |
| peso da fonte (`fontWeight`) | 248 | 4 (700×167, 600×66, 500×13, 400×2) | 0 | não aplicável: o tema tem 4 pesos e nenhum é usado |
| espaçamento (padding, margin, gap) | 118 | 11 (0, 1, 2, 3, 4, 6, 7, 8, 10, 12, 56) | 669 | 74 de 118 (os demais são 4 ou 8, iguais a `xs` e `sm`, escritos como número) |
| raio de borda (`borderRadius`) | 63 | 20 (2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 20, 22, 24, 36, 40, 44, 999) | 163 | 55 de 63 |
| sombra (`shadow*`, `elevation`) | 0 | 0 | 0 | nenhuma sombra no app |


Observações: a contagem de espaçamento **não** inclui expressões que somam token e número (ex.: `SPACING.md + 4`) nem `insets`; tamanhos de ícone (`size={...}`), larguras e alturas numéricas não entram nestas linhas.

**Cores literais (hex) e onde aparecem:**

| valor | usos | arquivos |
|---|---|---|
| #1a1700 | 26 | components/guided/GuidedParts.js, components/health/CategoryCard.js, components/InfoSheet.js, screens/ActiveWorkoutScreen.js |
| #141200 | 8 | screens/ActiveWorkoutScreen.js, screens/CreateWorkoutScreen.js, screens/EditBodyDataScreen.js, screens/ExerciseDetailScreen.js |
| #3a2a00 | 3 | screens/AIPersonalTrainerScreen.js, screens/HomeScreen.js, screens/ProfileScreen.js |
| #000000 | 2 | components/auth/AuthParts.js, App.js |
| #2a2400 | 2 | screens/ActiveWorkoutScreen.js, screens/ExerciseDetailScreen.js |
| #ffffff | 2 | components/auth/AuthParts.js |
| #0d1117 | 1 | screens/SmartPlanScreen.js |
| #0d1a0d | 1 | screens/ExercisesScreen.js |
| #131314 | 1 | components/auth/AuthParts.js |
| #1a0a0a | 1 | screens/ExercisesScreen.js |
| #1a0f00 | 1 | screens/HomeScreen.js |
| #1a1200 | 1 | screens/ExercisesScreen.js |
| #1a2332 | 1 | screens/SmartPlanScreen.js |
| #22c55e | 1 | screens/EditBodyDataScreen.js |
| #555555 | 1 | components/auth/AuthParts.js |
| #60a5fa | 1 | screens/EditBodyDataScreen.js |
| #8e918f | 1 | components/auth/AuthParts.js |
| #c8a800 | 1 | screens/ExerciseDetailScreen.js |
| #dc2626 | 1 | screens/EditBodyDataScreen.js |
| #e3e3e3 | 1 | components/auth/AuthParts.js |
| #ef4444 | 1 | screens/EditBodyDataScreen.js |
| #f4f4f4 | 1 | components/ExerciseStills.js |
| #f97316 | 1 | screens/EditBodyDataScreen.js |
| #ff6b6b | 1 | screens/WorkoutsScreen.js |

**Cores com rgba:** `rgba(0,0,0,0.6)` ×3; `rgba(0,0,0,0.15)` ×2; `rgba(0,0,0,0.7)` ×1.

**Literais que repetem o valor de um token** (8): components/auth/AuthParts.js:136 `#ffffff` = `COLORS.textPrimary`; components/auth/AuthParts.js:136 `#000000` = `COLORS.black`; components/auth/AuthParts.js:136 `#ffffff` = `COLORS.textPrimary`; components/auth/AuthParts.js:229 `#555555` = `COLORS.textMuted`; screens/EditBodyDataScreen.js:164 `#22c55e` = `COLORS.success`; screens/EditBodyDataScreen.js:165 `#f97316` = `COLORS.warning`; screens/EditBodyDataScreen.js:166 `#ef4444` = `COLORS.error`; App.js:45 `#000000` = `COLORS.black`. Há ainda `COLORS.error || '#FF6B6B'` em `screens/WorkoutsScreen.js:65` (reserva escrita no código).

**Arquivos com mais valores soltos** (cor + fonte + espaço + raio):

| arquivo | cor | fonte | espaço | raio | total |
|---|---|---|---|---|---|
| screens/HomeScreen.js | 6 | 1 | 10 | 2 | 19 |
| screens/SmartPlanScreen.js | 5 | 0 | 5 | 7 | 17 |
| components/auth/AuthParts.js | 8 | 0 | 5 | 2 | 15 |
| screens/ExerciseDetailScreen.js | 6 | 0 | 8 | 1 | 15 |
| screens/ExercisesScreen.js | 5 | 2 | 8 | 0 | 15 |
| screens/EditBodyDataScreen.js | 6 | 2 | 4 | 1 | 13 |
| screens/ProfileScreen.js | 2 | 0 | 8 | 3 | 13 |
| screens/WorkoutsScreen.js | 4 | 1 | 7 | 1 | 13 |
| components/guided/GuidedParts.js | 2 | 0 | 6 | 3 | 11 |
| components/InfoSheet.js | 3 | 0 | 2 | 5 | 10 |
| components/OccupancyCard.js | 0 | 0 | 6 | 4 | 10 |
| screens/ActiveWorkoutScreen.js | 3 | 2 | 1 | 3 | 9 |

13 dos 54 arquivos de interface não têm nenhum desses valores soltos.

## 3. Componentes

### 3.1 Componentes compartilhados que existem

| arquivo (em `src/`) | exporta | importado em (arquivos) | o que é |
|---|---|---|---|
| components/AboutCard.js | AboutCard | 1 | cartão "Sobre" do Perfil (versão e detalhes da build) |
| components/auth/AccountCard.js | AccountCard, AccountActions | 1 | cartão "Conta" e ações Sair da conta / Excluir minha conta |
| components/auth/AuthParts.js | AuthScreen, AuthField, PrimaryButton, SecondaryButton, SOCIAL_STYLES, SocialButton, LinkButton, Notice, CheckRow, PasswordChecklist, StrengthBar, Divider, ConfirmModal, isIOS | 7 | casca e peças das telas de conta (campo, botões, aviso, checklist de senha, modal de confirmação) |
| components/EditNameRow.js | EditNameRow | 1 | nome do perfil editável no lugar |
| components/ErrorBoundary.js | ErrorBoundary | 1 | rede de segurança: tela de recuperação do app inteiro |
| components/ExerciseIcon.js | ExerciseIcon | 5 | ícone do exercício (decorativo para leitor de tela) |
| components/ExerciseMedia.js | ExerciseMedia | 1 | área "Como fazer" (vídeo, fotos ou "Vídeo em breve") |
| components/ExerciseStills.js | HOLD_MS, FADE_MS, ExerciseStills | 1 | duas fotos do exercício alternadas com fade |
| components/ExerciseVideoPlayer.js | ExerciseVideoPlayer | 1 | player quadrado do vídeo de demonstração |
| components/guided/GuidedParts.js | animateLayout, GuidedHeader, TrainerLabel, OptionCard, Chip, FooterButton, BuildingChecklist | 3 | peças da série guiada (cabeçalho com voltar e progresso, opção, chip, rodapé, checklist) |
| components/guided/SeriesCard.js | SeriesCard | 1 | cartão expansível de uma série A, B ou C |
| components/health/CategoryCard.js | CategoryCard | 1 | cartão de categoria da tela Saúde |
| components/health/HealthParts.js | ScoreHero, QuickActions, CategoryChips, SuggestionsCard, NoDataGroup, WeeklyReport | 1 | blocos da tela Saúde (Duo Score, ações rápidas, chips, sugestões, relatório) |
| components/health/ProfileHealthCard.js | ProfileHealthCard | 1 | cartão "Saúde" do Perfil |
| components/health/TrendBars.js | TrendBars | 2 | gráfico de barras feito de Views |
| components/health/WeightChart.js | WeightChart | 0 | gráfico de linha de peso feito de Views (0 importações encontradas) |
| components/InfoButton.js | InfoButton | 12 | botão "i" de 44x44 que abre a folha de ajuda |
| components/InfoSheet.js | InfoSheet | 1 | folha de ajuda (Modal do React Native) |
| components/LegalLinks.js | LegalLinks | 4 | links de Termos de Uso e Política de Privacidade |
| components/MarketplaceBanners.js | MarketplaceBanners | 1 | carrossel de banners do marketplace |
| components/MarketplaceImage.js | MarketplaceImage | 3 | imagem do item da vitrine (ou ícone de reserva) |
| components/OccupancyCard.js | ExampleBadge, OccupancyCard | 2 | cartão de lotação da academia e selo "Dados de exemplo" |
| components/RemindersCard.js | RemindersCard | 1 | entrada para os lembretes no Perfil (só com a flag) |
| screens/auth/SocialButtons.js | SocialButtons | n/d | botões de entrar com Google e Apple (fica na pasta de telas) |

Por tipo: **botões** `PrimaryButton`, `SecondaryButton`, `LinkButton`, `SocialButton` (`components/auth/AuthParts.js`) e `FooterButton` (`components/guided/GuidedParts.js`); **cartões** `AboutCard`, `RemindersCard`, `OccupancyCard`, `CategoryCard`, `ProfileHealthCard`, `SeriesCard`, `AccountCard`; **cabeçalhos** `GuidedHeader` (só na série guiada) e `AuthScreen` (casca das 4 telas de conta); **campos** `AuthField`, `EditNameRow`; **listas** `SeriesCard`, `OptionCard`, `Chip`; **avisos** `Notice`; **modais** `InfoSheet`, `ConfirmModal`. **Não existe** um componente de cabeçalho de tela, de botão voltar, de cartão genérico, de estado vazio, de carregando ou de erro compartilhado pelas telas principais.

Uso real dos botões compartilhados: `PrimaryButton` é importado por **4 telas** (as de conta: AgeGate, ForgotPassword, SignIn, SignUp); `FooterButton` por **1** (GuidedPlanScreen); `SecondaryButton` por 1 (AccountCard).

### 3.2 Padrões repetidos, copiados em várias telas

Estilos com o mesmo nome definidos em 4 ou mais arquivos (cada arquivo tem a própria cópia); "variantes" = quantos corpos diferentes existem entre as cópias:

| nome do estilo | arquivos | variantes |
|---|---|---|
| title | 25 | 11 |
| header | 23 | 13 |
| container | 22 | 2 |
| content | 21 | 13 |
| backBtn | 18 | 5 |
| card | 17 | 10 |
| sectionTitle | 9 | 8 |
| subtitle | 8 | 4 |
| label | 8 | 6 |
| input | 8 | 6 |
| btn | 8 | 6 |
| btnDisabled | 7 | 3 |
| btnText | 7 | 3 |
| noticeText | 7 | 5 |
| dot | 7 | 4 |
| row | 6 | 6 |
| field | 6 | 4 |
| headerText | 6 | 1 |
| section | 5 | 4 |
| linkText | 5 | 4 |


**Botão voltar (`backBtn`): 18 cópias, 5 variantes**, além do botão "Fechar" de CreateWorkout e do "X" de ActiveWorkout:

| corpo do estilo | onde |
|---|---|
| alignItems: 'center', justifyContent: 'center', marginLeft: -SPACING.sm, minHeight: 44, minWidth: 44 | components/guided/GuidedParts.js:162; screens/AdvertiseScreen.js:298; screens/GymNowScreen.js:84; screens/HealthCategoryScreen.js:255; screens/HealthConnectScreen.js:305; screens/HealthScreen.js:164; screens/StoreScreen.js:144 |
| padding: SPACING.xs | screens/AIPersonalTrainerScreen.js:661; screens/EditBodyDataScreen.js:189; screens/ExerciseDetailScreen.js:110; screens/onboarding/BodyDataScreen.js:158; screens/onboarding/LevelSelectScreen.js:93; screens/onboarding/ProfileSetupScreen.js:122; screens/SmartPlanScreen.js:295; screens/WorkoutDetailScreen.js:81 |
| alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.full, justifyContent: 'center', minHeight: 44, minWidth: 44 | screens/RemindersScreen.js:143 |
| alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.full, height: 44, justifyContent: 'center', width: 44 | screens/SeriesTimelineScreen.js:53 |
| alignItems: 'flex-start', justifyContent: 'center', minHeight: 44, minWidth: 44 | screens/StoreDetailScreen.js:114 |


**Botão primário (fundo `COLORS.primary`, raio e preenchimento): 24 implementações locais** em 21 arquivos, contra 2 componentes compartilhados (`PrimaryButton`, `FooterButton`). Altura mínima declarada: nenhuma (só paddingVertical): 10; 52: 8; 44: 2; 48: 2; height 38: 1; height 44: 1; `paddingVertical`: SPACING.md: 9; -: 8; SPACING.sm: 7.

| arquivo:linha | estilo | minHeight/height | paddingVertical | raio |
|---|---|---|---|---|
| components/auth/AuthParts.js:304 | btn | 52 | SPACING.sm | RADIUS.full |
| components/ErrorBoundary.js:110 | primaryBtn | 52 | SPACING.sm | RADIUS.full |
| components/guided/GuidedParts.js:179 | primaryBtn | 52 | SPACING.sm | RADIUS.full |
| components/health/ProfileHealthCard.js:70 | action | 44 | - | RADIUS.full |
| components/InfoSheet.js:169 | closeBtn | 52 | - | RADIUS.full |
| screens/ActiveWorkoutScreen.js:199 | nextBtn | - | SPACING.md | RADIUS.full |
| screens/ActiveWorkoutScreen.js:212 | doneBtn | - | SPACING.md | RADIUS.full |
| screens/AdvertiseScreen.js:318 | primaryBtn | 52 | SPACING.sm | RADIUS.full |
| screens/AIPersonalTrainerScreen.js:688 | saveBtn | - | SPACING.sm | RADIUS.full |
| screens/AIPersonalTrainerScreen.js:700 | sendBtn | height 44 | - | 22 |
| screens/GuidedPlanScreen.js:548 | okBtn | 48 | - | RADIUS.md |
| screens/HealthCategoryScreen.js:290 | okBtn | 48 | - | RADIUS.full |
| screens/HealthConnectScreen.js:326 | okBtn | 52 | - | RADIUS.full |
| screens/onboarding/BodyDataScreen.js:192 | btn | - | SPACING.md | RADIUS.full |
| screens/onboarding/LevelSelectScreen.js:116 | btn | - | SPACING.md | RADIUS.full |
| screens/onboarding/ProfileSetupScreen.js:144 | btn | - | SPACING.md | RADIUS.full |
| screens/onboarding/WelcomeScreen.js:85 | btn | - | SPACING.md | RADIUS.full |
| screens/RemindersScreen.js:150 | primaryBtn | 44 | - | RADIUS.full |
| screens/SmartPlanScreen.js:320 | btn | - | SPACING.md | RADIUS.full |
| screens/StoreDetailScreen.js:126 | cta | 52 | SPACING.sm | RADIUS.full |
| screens/StoreScreen.js:149 | advertiseBtn | 52 | SPACING.sm | RADIUS.full |
| screens/WorkoutDetailScreen.js:88 | startBtn | - | SPACING.md | RADIUS.full |
| screens/WorkoutsScreen.js:226 | addBtn | height 38 | - | RADIUS.full |
| screens/WorkoutsScreen.js:256 | aiBtn | - | SPACING.md | RADIUS.full |


**Título de tela (`title`): 25 cópias, 6 combinações** de tamanho, peso e cor: FONTS.sizes.xxl / '700' / COLORS.white (13); FONTS.sizes.xl / '700' / COLORS.white (5); FONTS.sizes.md / '700' / COLORS.white (3); FONTS.sizes.lg / '700' / COLORS.white (2); - / - / COLORS.white (1); FONTS.sizes.md / '600' / COLORS.white (1).

**Cabeçalho (`header`): 23 cópias, 13 variantes.** **Contêiner (`container`): 22 cópias, 2 variantes** (o corpo é `flex: 1` + fundo; a variação é só o fundo/preenchimento).

## 4. Inconsistências, tela a tela

Os indicadores abaixo são **presença no código** (expressões regulares sobre o arquivo da tela): "carregando" = `ActivityIndicator`/"Carregando"/`loading`; "vazio" = textos como "Nenhum", "Sem dados", "Ainda não"; "erro" = `erro`/`falha`/"Não foi possível". Se uma tela **precisa** de cada estado só se sabe executando: **não verificável**. As quatro telas de conta usam a casca `AuthScreen` (`components/auth/AuthParts.js`), por isso suas medidas de cabeçalho aparecem vazias aqui.

Valores mais comuns entre as telas medidas: título **28** px (28: 11, 22: 4, 18: 2, 15: 1); botão voltar **44x44** (44x44: 9, sem tamanho (conteúdo): 9); padding horizontal do cabeçalho **24** (24: 17, space.screen: 1); padding do conteúdo **24** (24: 21, HEALTH_UI.space.screen: 1, space.screen: 1).

| tela | literais (cor/fonte/espaço/raio) | topo seguro | voltar | título | carreg. | vazio | erro |
|---|---|---|---|---|---|---|---|
| ActiveWorkoutScreen.js | 3/2/1/3 | insets.top | - | - | não | não | não |
| AdvertiseScreen.js | 0/0/1/0 | insets.top | Voltar 44x44 | 22 | não | sim | sim |
| AIPersonalTrainerScreen.js | 3/0/1/4 | SafeAreaView (top) | Voltar sem tamanho (conteúdo) | 15 | sim | sim | sim |
| auth/AgeGateScreen.js | 0/0/0/0 | casca AuthScreen | - | - | sim | sim | sim |
| auth/ForgotPasswordScreen.js | 0/0/0/0 | casca AuthScreen | - | - | sim | não | sim |
| auth/SignInScreen.js | 0/0/0/0 | casca AuthScreen | - | - | sim | sim | sim |
| auth/SignUpScreen.js | 0/0/0/0 | casca AuthScreen | - | - | sim | sim | sim |
| CreateWorkoutScreen.js | 2/0/2/1 | insets.top | Fechar sem tamanho (conteúdo) | 18 | não | não | não |
| EditBodyDataScreen.js | 6/2/4/1 | SafeAreaView (top) | Voltar sem tamanho (conteúdo) | 18 | não | não | não |
| ExerciseDetailScreen.js | 6/0/8/1 | insets.top | Voltar sem tamanho (conteúdo) | - | não | não | não |
| ExercisesScreen.js | 5/2/8/0 | SafeAreaView (top) | - | 28 | não | sim | sim |
| GuidedPlanScreen.js | 1/0/1/0 | via GuidedHeader | - | 28 | não | não | sim |
| GymNowScreen.js | 0/0/0/0 | insets.top | Voltar 44x44 | 28 | não | sim | não |
| HealthCategoryScreen.js | 0/3/1/2 | insets.top | Voltar 44x44 | 28 | sim | sim | sim |
| HealthConnectScreen.js | 0/0/2/1 | insets.top | Voltar 44x44 | 28 | não | sim | sim |
| HealthScreen.js | 0/0/0/0 | insets.top | Voltar 44x44 | 28 | sim | sim | não |
| HomeScreen.js | 6/1/10/2 | insets.top | - | - | sim | sim | não |
| onboarding/BodyDataScreen.js | 1/2/4/1 | insets.top | Voltar sem tamanho (conteúdo) | 28 | não | não | não |
| onboarding/LevelSelectScreen.js | 1/0/4/3 | insets.top | Voltar sem tamanho (conteúdo) | 28 | não | não | não |
| onboarding/ProfileSetupScreen.js | 1/0/2/2 | insets.top | Voltar sem tamanho (conteúdo) | 28 | não | sim | não |
| onboarding/WelcomeScreen.js | 1/0/0/0 | nenhum no arquivo | - | - | não | não | não |
| ProfileScreen.js | 2/0/8/3 | insets.top | - | - | não | não | não |
| RemindersScreen.js | 0/0/1/0 | insets.top | Voltar 44x44 | 22 | não | sim | sim |
| SeriesTimelineScreen.js | 0/0/2/1 | insets.top | Voltar 44x44 | 22 | não | sim | não |
| SmartPlanScreen.js | 5/0/5/7 | insets.top | Voltar sem tamanho (conteúdo) | - | sim | sim | não |
| StoreDetailScreen.js | 1/0/4/0 | insets.top | Voltar 44x44 | 22 | não | sim | sim |
| StoreScreen.js | 1/0/5/0 | insets.top | Voltar 44x44 | 28 | não | sim | não |
| WorkoutDetailScreen.js | 2/0/2/1 | insets.top | Voltar sem tamanho (conteúdo) | - | não | não | sim |
| WorkoutsScreen.js | 4/1/7/1 | insets.top | - | 28 | não | sim | sim |


**O que foge do padrão (medido):**

**Topo seguro:** há 5 mecanismos diferentes: insets.top (20); casca AuthScreen (4); SafeAreaView (top) (3); nenhum no arquivo (1); via GuidedHeader (1). Nas telas com `SafeAreaView` o cabeçalho usa padding superior fixo (ex.: ExercisesScreen.js:120, `paddingTop: SPACING.md`); nas com `insets.top` ele é somado ao espaçamento do cabeçalho (`insets.top + SPACING.sm`).

- **AdvertiseScreen.js**: título de 22 px (padrão da maioria: 28).
- **AIPersonalTrainerScreen.js**: título de 15 px (padrão da maioria: 28).
- **AIPersonalTrainerScreen.js**: botão "Voltar" sem largura/altura declaradas (o tamanho vem do ícone e do preenchimento) (padrão: 44x44).
- **CreateWorkoutScreen.js**: título de 18 px (padrão da maioria: 28).
- **CreateWorkoutScreen.js**: botão "Fechar" sem largura/altura declaradas (o tamanho vem do ícone e do preenchimento) (padrão: 44x44).
- **EditBodyDataScreen.js**: título de 18 px (padrão da maioria: 28).
- **EditBodyDataScreen.js**: botão "Voltar" sem largura/altura declaradas (o tamanho vem do ícone e do preenchimento) (padrão: 44x44).
- **ExerciseDetailScreen.js**: botão "Voltar" sem largura/altura declaradas (o tamanho vem do ícone e do preenchimento) (padrão: 44x44).
- **HealthCategoryScreen.js**: padding do conteúdo `HEALTH_UI.space.screen` (padrão: 24).
- **HealthScreen.js**: cabeçalho com padding horizontal `space.screen` (padrão: 24).
- **HealthScreen.js**: padding do conteúdo `space.screen` (padrão: 24).
- **onboarding/BodyDataScreen.js**: botão "Voltar" sem largura/altura declaradas (o tamanho vem do ícone e do preenchimento) (padrão: 44x44).
- **onboarding/LevelSelectScreen.js**: botão "Voltar" sem largura/altura declaradas (o tamanho vem do ícone e do preenchimento) (padrão: 44x44).
- **onboarding/ProfileSetupScreen.js**: botão "Voltar" sem largura/altura declaradas (o tamanho vem do ícone e do preenchimento) (padrão: 44x44).
- **onboarding/WelcomeScreen.js**: nenhum tratamento do topo seguro (nem `insets.top`, nem `SafeAreaView`, nem componente de cabeçalho) no próprio arquivo; o efeito em aparelhos com entalhe é **não verificável**.
- **RemindersScreen.js**: título de 22 px (padrão da maioria: 28).
- **RemindersScreen.js**: botão voltar com fundo `COLORS.bgCard` e raio 999 (os outros não têm fundo).
- **SeriesTimelineScreen.js**: título de 22 px (padrão da maioria: 28).
- **SeriesTimelineScreen.js**: botão voltar com fundo `COLORS.bgCard` e raio 999 (os outros não têm fundo).
- **SmartPlanScreen.js**: botão "Voltar" sem largura/altura declaradas (o tamanho vem do ícone e do preenchimento) (padrão: 44x44).
- **StoreDetailScreen.js**: título de 22 px (padrão da maioria: 28).
- **WorkoutDetailScreen.js**: botão "Voltar" sem largura/altura declaradas (o tamanho vem do ícone e do preenchimento) (padrão: 44x44).

Sem botão voltar por serem raiz de aba ou de árvore: Home, Workouts, Exercises, Profile, Welcome. O ActiveWorkout usa um "X" (`Ionicons close`, rótulo "Sair do treino", sem tamanho declarado) e o CreateWorkout um "Fechar" sem tamanho declarado. **Cores e fontes literais** estão concentradas nas telas listadas na seção 2.3; as telas de Saúde usam a escala `HEALTH_UI` em vez de `SPACING`/`FONTS` em parte dos estilos (2 arquivos).

**Estados:** 9 de 29 telas citam carregando; 18 citam estado vazio; 14 citam erro; **1 tela usa `RefreshControl`** (puxar para atualizar). Não há componente de estado vazio, de carregando ou de erro compartilhado: cada tela escreve o seu (os vazios têm estilos `empty`/`emptyTitle`/`emptyText` próprios em 5+ arquivos, com 5 variantes só do contêiner).

## 5. Acessibilidade medida

### 5.1 Contraste (WCAG 2.1): fórmula e critérios

Razão = (L1 + 0,05) / (L2 + 0,05), com luminância relativa sRGB. Critérios: **4,5:1** para texto normal; **3:1** para texto grande (≥ 24 px, ou ≥ 18,66 px em negrito) e para ícones/componentes de interface. Há **um único tema (escuro)**. Componentes desabilitados são isentos pela WCAG.

**Matriz dos tokens** (texto/ícone em linha × fundo em coluna; **negrito** = abaixo de 4,5:1; _itálico_ = entre 3 e 4,5; `—` = mesmo token):

| texto / ícone | sobre bg (#0A0A0A) | sobre bgCard (#141414) | sobre bgCardAlt (#1C1C1C) | sobre black (#000000) | sobre primary (#fed205) |
|---|---|---|---|---|---|
| textPrimary (#FFFFFF) | 19,8 | 18,42 | 17,04 | 21 | **1,45** |
| textSecondary (#888888) | 5,58 | 5,2 | 4,81 | 5,92 | **2,44** |
| textMuted (#555555) | **2,66** | **2,47** | **2,29** | **2,82** | 5,12 |
| primary (#fed205) | 13,61 | 12,66 | 11,71 | 14,43 | — |
| white (#FFFFFF) | 19,8 | 18,42 | 17,04 | 21 | **1,45** |
| black (#000000) | **1,06** | **1,14** | **1,23** | — | 14,43 |
| success (#22c55e) | 8,69 | 8,08 | 7,48 | 9,22 | **1,57** |
| error (#ef4444) | 5,26 | 4,9 | 4,53 | 5,58 | **2,59** |
| warning (#f97316) | 7,06 | 6,57 | 6,08 | 7,49 | **1,93** |

Leitura: o único token de texto que **não alcança 3:1 sobre nenhuma superfície escura** do tema é `textMuted` (#555555): **2,29** sobre `bgCardAlt`, **2,47** sobre `bgCard` e **2,66** sobre `bg`. Os demais tokens passam 4,5:1 sobre as superfícies escuras (`textSecondary` fica entre 4,81 e 5,58). `white` sobre `error` é 3,76 e sobre `warning` 2,80; `white` sobre `primary` é 1,45.

### 5.2 Pares usados de verdade (texto e ícone dentro do contêiner que os envolve)

Para cada `<Text>` e ícone, o fundo é o do contêiner mais interno que declara `backgroundColor` (cores translúcidas são compostas sobre o fundo de baixo). Onde nenhum contêiner declara fundo, o fundo real é o da tela ou do cartão pai e a razão é calculada contra os três (`bg`, `bgCard`, `bgCardAlt`): mostrada a **pior**; o fundo exato é **não verificável sem ver a tela**.

| tipo | cor do texto/ícone | fundo | ocorrências | razão (pior) | resultado |
|---|---|---|---|---|---|
| texto | textSecondary | bgCard | 93 | 5,2 | passa 4,5:1 |
| texto | white | bgCard | 81 | 18,42 | passa 4,5:1 |
| texto | textSecondary | bg | 59 | 5,58 | passa 4,5:1 |
| texto | white | bg | 50 | 19,8 | passa 4,5:1 |
| texto | black | primary | 41 | 14,43 | passa 4,5:1 |
| texto | textSecondary | fundo da tela/cartão (pior dos 3) | 31 | 4,81 | passa 4,5:1 |
| ícone | primary | bgCard | 31 | 12,66 | passa 4,5:1 |
| ícone | black | primary | 28 | 14,43 | passa 4,5:1 |
| texto | textMuted | bgCard | 25 | 2,47 | abaixo de 3:1 |
| texto | textMuted | bg | 22 | 2,66 | abaixo de 3:1 |
| texto | primary | bgCard | 21 | 12,66 | passa 4,5:1 |
| texto | white | fundo da tela/cartão (pior dos 3) | 19 | 17,04 | passa 4,5:1 |
| texto | primary | literal #1a1700 | 17 | 12,37 | passa 4,5:1 |
| ícone | textSecondary | bg | 15 | 5,58 | passa 4,5:1 |
| ícone | textMuted | bgCard | 14 | 2,47 | abaixo de 3:1 |
| texto | primary | bg | 13 | 13,61 | passa 4,5:1 |
| ícone | textSecondary | bgCard | 9 | 5,2 | passa 4,5:1 |
| ícone | white | bg | 8 | 19,8 | passa 4,5:1 |


### 5.3 Achados abaixo do limite (arquivo e linha)

**A. `COLORS.textMuted` (#555555), razão 2,29 a 2,66:1, abaixo de 3:1 e de 4,5:1.** Texto: **54 elementos**; ícones: **14**; texto de dica (`placeholderTextColor`): **8** campos. Em todos os usos o fundo é escuro (as três superfícies do tema).

- Texto (54): components/ExerciseStills.js: 75; components/RemindersCard.js: 15; screens/ActiveWorkoutScreen.js: 92, 140, 149, 165; screens/AIPersonalTrainerScreen.js: 529; screens/CreateWorkoutScreen.js: 109; screens/EditBodyDataScreen.js: 76, 79, 95, 117, 134, 151; screens/ExerciseDetailScreen.js: 50; screens/ExercisesScreen.js: 33; screens/HomeScreen.js: 65, 79, 88, 134, 158, 255, 265, 277; screens/onboarding/BodyDataScreen.js: 58, 79, 82, 98, 120; screens/onboarding/LevelSelectScreen.js: 60; screens/onboarding/ProfileSetupScreen.js: 59, 78, 79, 94; screens/ProfileScreen.js: 72, 81, 87, 103, 109, 116, 135, 142, 153, 162, 176; screens/RemindersScreen.js: 130; screens/SmartPlanScreen.js: 175, 230, 262; screens/WorkoutDetailScreen.js: 43, 45, 67; screens/WorkoutsScreen.js: 98, 146.
- Ícones (14): components/RemindersCard.js: 17; screens/ExercisesScreen.js: 37, 47; screens/HomeScreen.js: 97, 101, 106, 120, 269; screens/ProfileScreen.js: 133; screens/SmartPlanScreen.js: 177; screens/WorkoutDetailScreen.js: 69; screens/WorkoutsScreen.js: 81, 100, 119.
- Placeholder (8): screens/AIPersonalTrainerScreen.js:639; screens/CreateWorkoutScreen.js:57; screens/EditBodyDataScreen.js:86; screens/EditBodyDataScreen.js:102; screens/ExercisesScreen.js:43; screens/onboarding/BodyDataScreen.js:89; screens/onboarding/BodyDataScreen.js:105; screens/onboarding/ProfileSetupScreen.js:65.

- Usos **condicionais** (a cor depende do estado, ex.: `selected ? COLORS.primary : COLORS.textMuted`) que incluem `textMuted`: components/guided/GuidedParts.js:73 (ícone); components/guided/GuidedParts.js:145 (ícone); screens/AIPersonalTrainerScreen.js:650 (ícone).

**B. Texto branco sobre `COLORS.error` (#ef4444): 3,76:1**, abaixo de 4,5:1: components/auth/AuthParts.js:275 (botão destrutivo do `ConfirmModal`, `btnText` de 18 px em negrito 700; 18 px negrito **não** é "texto grande" pela WCAG, que pede 18,66 px). O `ActivityIndicator` do mesmo botão também é branco.

**C. Não são falha (verificado):** `rgba(0,0,0,0.6)` do `aiBannerSub` (Home:335/151 e Workouts:236) sobre `primary` dá **5,09:1** (passa); texto preto sobre `primary` e sobre `success` passa (14,4 e 9,2); `error` e `warning` sobre as superfícies passam 4,5:1 (`error` 4,53 a 5,26).

**D. Estados desabilitados (isentos pela WCAG, só informados):** screens/AIPersonalTrainerScreen.js:627 (ícone preto sobre fundo escuro quando o botão está desabilitado); `btnDisabled` usa `opacity: 0.45` em AuthParts.js:305.

**E. Não verificável:** 12 cores definidas por expressão em tempo de execução (ex.: cor do IMC `imcInfo.color`, `v.fg`, parâmetro `color`) e o fundo real de todo texto sem contêiner com `backgroundColor` próprio. Lista: components/auth/AuthParts.js: 154, 155, 175; components/InfoButton.js: 28; screens/EditBodyDataScreen.js: 121, 125; screens/HomeScreen.js: 91, 92; screens/onboarding/BodyDataScreen.js: 124, 128; screens/ProfileScreen.js: 114, 123.

### 5.4 Alvos de toque

Foram encontrados **146 elementos tocáveis** (`TouchableOpacity`, `Pressable` etc.). Os testes do repositório (`integracao-acessibilidade.test.ts`) já exigem papel, nome acessível e alvo de 44 pt considerando o `hitSlop`; abaixo, o que **visualmente** fica menor que 44 pt.

| arquivo:linha | estilo | tamanho visual declarado | hitSlop (soma lados) | área tocável | resultado |
|---|---|---|---|---|---|
| components/MarketplaceBanners.js:85 | dotHit | 28x28 (mínimo) | 12 (larg.) / 28 (alt.) | 40x56 | abaixo de 44 em uma dimensão |
| screens/AIPersonalTrainerScreen.js:622 | chipConfirm, chipConfirmDisabled | 32x32 | 12 (larg.) / 12 (alt.) | 44x44 | chega a 44 só com o hitSlop |
| screens/WorkoutsScreen.js:111 | addBtn | 38x38 | 6 (larg.) / 6 (alt.) | 44x44 | chega a 44 só com o hitSlop |

Dos 3 controles com desenho declarado menor que 44 pt, 2 chegam a 44 pt só por causa do `hitSlop` e **1 continua abaixo de 44 pt em uma dimensão mesmo somando o `hitSlop`**: components/MarketplaceBanners.js:85 (40x56; o teste do repositório não pega porque usa `minWidth`/`minHeight`, que ele não mede). **64 tocáveis não declaram largura/altura** (o tamanho vem do conteúdo e do preenchimento): **não verificável** sem executar. Outros controles (`Switch` em RemindersScreen.js:98, `TextInput`) usam o tamanho nativo.

### 5.5 Tamanho de fonte do sistema (Dynamic Type / escala de fonte)

- `allowFontScaling={false}`: **0** ocorrências; `maxFontSizeMultiplier`: **0**; `adjustsFontSizeToFit`: **0**. Logo, todo texto escala com o sistema (padrão do React Native) e **nada limita o crescimento**.
- `numberOfLines`: 3 usos em 2 arquivos (screens/HomeScreen.js ×2, screens/StoreScreen.js ×1): os únicos textos que cortam de propósito.
- **Caixas de tamanho fixo que contêm texto** (podem cortar ou estourar com fonte maior; o efeito real é **não verificável** sem o aparelho):

| arquivo:linha | estilo | largura | altura | o que contém |
|---|---|---|---|---|
| components/ErrorBoundary.js:106 | badge | 72 | 72 | contêiner com texto dentro (letra, número ou cartão) |
| components/guided/SeriesCard.js:108 | letter | 40 | 40 | contêiner com texto dentro (letra, número ou cartão) |
| components/InfoSheet.js:149 | stepNum | 28 | 28 | contêiner com texto dentro (letra, número ou cartão) |
| screens/AIPersonalTrainerScreen.js:684 | planSerieBadge | 32 | 32 | contêiner com texto dentro (letra, número ou cartão) |
| screens/AIPersonalTrainerScreen.js:699 | input | - | 100 | campo de texto (altura máxima 100 em AIPersonalTrainerScreen) |
| screens/EditBodyDataScreen.js:225 | refRange | 100 | - | o próprio texto (13 px) com largura fixa |
| screens/ExerciseDetailScreen.js:131 | stepNum | 28 | 28 | contêiner com texto dentro (letra, número ou cartão) |
| screens/HealthCategoryScreen.js:295 | histDate | 48 | - | o próprio texto (13 px) com largura fixa |
| screens/HomeScreen.js:347 | forYouCard | 220 | - | contêiner com texto dentro (letra, número ou cartão) |
| screens/HomeScreen.js:363 | achCard | 90 | - | contêiner com texto dentro (letra, número ou cartão) |
| screens/SmartPlanScreen.js:333 | planSerieBadge | 44 | 44 | contêiner com texto dentro (letra, número ou cartão) |
| screens/WorkoutDetailScreen.js:93 | exNum | 26 | 26 | contêiner com texto dentro (letra, número ou cartão) |

- **Barra de abas** (`navigation/MainNavigator.js:102-112`): `height: 60 + insets.bottom`, `paddingTop: 8`, rótulo `fontSize: 11` fixo; com fonte maior o rótulo cresce e a altura da barra não.
- **Alturas de linha fixas apertadas** (lineHeight < 1,15 × fontSize): components/health/HealthParts.js:251 (scoreNumber: 64/56); screens/EditBodyDataScreen.js:207 (imcValue: 48/44); screens/HomeScreen.js:319 (imcValue: 36/32); screens/onboarding/BodyDataScreen.js:188 (imcValue: 44/40). Os 5 estilos de `HEALTH_UI.type` também usam `lineHeight` em pontos fixos (24, 40, 20, 20, 16). Se a linha escala junto com a fonte depende da plataforma: **não verificável**.

## 6. Telas pequenas e tablet

**O que o `app.json` declara:** `"orientation": "portrait"`; `"userInterfaceStyle": "dark"`; no iOS apenas `bundleIdentifier`, `buildNumber` e `infoPlist.ITSAppUsesNonExemptEncryption`; no Android `package`, `versionCode`, ícone adaptativo e `softwareKeyboardLayoutMode: "pan"`. **`ios.supportsTablet` não está declarado** (e não há configuração de iPad nem de tablet Android). Pela documentação do Expo o padrão é `false`, o que faria o app abrir no iPad como app de iPhone em modo de compatibilidade; isso **não foi verificado em aparelho** (**não verificável**).

**Layout adaptativo:** não há `useWindowDimensions`, pontos de quebra nem `Platform.isPad`. Há 1 uso de `Dimensions.get("window")` lido **uma vez, no carregamento do módulo**, em `screens/onboarding/WelcomeScreen.js:7` (não acompanha mudança de largura). `maxWidth` aparece em `components/ExerciseMedia.js:76` (selo "Vídeo em breve", 90 %) e `screens/AIPersonalTrainerScreen.js:673`. Larguras em porcentagem: 20 usos.

**Larguras fixas de 200 pt ou mais:** screens/HomeScreen.js:347 (forYouCard: 220). **Larguras fixas menores com texto** (podem cortar em telas estreitas ou com fonte grande): `refRange` 100 em EditBodyDataScreen.js:225, `histDate` 48 em HealthCategoryScreen.js:295, `achCard` 90 em HomeScreen.js:363.

**Não verificável sem o aparelho:** como cada tela se comporta em 320-360 pt de largura, em telas com entalhe/ilha, com teclado aberto (7 telas usam `KeyboardAvoidingView`: AdvertiseScreen, AIPersonalTrainerScreen, EditBodyDataScreen, GuidedPlanScreen, HealthCategoryScreen, BodyDataScreen, ProfileSetupScreen), com rotação (bloqueada em retrato), e em iPad ou tablet Android.

## 7. Resumo

### 7.1 As 10 maiores inconsistências, em ordem de impacto para o usuário

1. **Texto e ícones em `textMuted` (#555555) com contraste de 2,29 a 2,66:1** (limite 4,5:1 para texto e 3:1 para ícone): 54 textos, 14 ícones (mais 3 usos condicionais) e 8 placeholders, em 17 arquivos. Afeta a leitura de legendas, rótulos e dicas em todas as telas principais.
2. **Botão destrutivo com texto branco sobre vermelho: 3,76:1** (abaixo de 4,5:1) no `ConfirmModal`, que é a confirmação de sair/excluir conta e desconectar saúde (`AuthParts.js:275`).
3. **Sem limite nem teste para fonte do sistema grande:** 0 usos de `maxFontSizeMultiplier`, 12 caixas de tamanho fixo com texto, barra de abas de altura fixa com rótulo de 11 px e linhas de altura fixa; o corte real é não verificável.
4. **Três controles com desenho menor que 44 pt que dependem de `hitSlop`** (Workouts `addBtn` 38, AIPersonalTrainer `chipConfirm` 32, MarketplaceBanners `dotHit` 28) e **1 que continua abaixo de 44 pt em uma dimensão mesmo com o `hitSlop`** (components/MarketplaceBanners.js:85, 40x56); mais **64 tocáveis sem tamanho declarado**, cuja área real é incerta.
5. **Botão primário reimplementado 24 vezes** (alturas mínimas 52, 48, 44 ou nenhuma; preenchimento `sm` ou `md`) enquanto o `PrimaryButton` compartilhado só é usado em 4 telas de conta: o mesmo botão tem tamanhos diferentes conforme a tela.
6. **Botão voltar com 5 variantes em 18 cópias** (10 declaram 44 pt, sendo 2 delas com fundo e raio; 8 não declaram tamanho) e título de tela com 4 tamanhos (28, 22, 18, 15; 6 combinações de tamanho, peso e cor).
7. **Estados de carregando, vazio e erro escritos tela a tela:** só 9 de 29 telas citam carregando e 14 citam erro; não há componente compartilhado; apenas 1 tela tem "puxar para atualizar".
8. **Peso da fonte: 248 literais e 0 usos de `FONTS.weights`**; o tema define 4 pesos que ninguém usa.
9. **Cores fora do tema:** 24 hex distintos e 3 rgba soltos (61 + 6 usos); `#1a1700` aparece 26 vezes (fundo destacado) e há 8 literais iguais a tokens; fundos de status (`#0d1a0d`, `#1a0a0a`, `#1a1200`) escritos à mão.
10. **Espaços e raios soltos:** 118 literais de espaçamento (74 fora da escala `SPACING`) e 63 de raio (20 valores distintos, 55 fora de `RADIUS`); **duas escalas** para a Saúde (`HEALTH_UI`) e para o resto (`SPACING`/`FONTS`); e um token que não existe (`RADIUS.xs`, `AIPersonalTrainerScreen.js:684`). Também: `WelcomeScreen` não trata o topo seguro, e há 5 mecanismos diferentes de topo seguro nas demais telas.

### 7.2 Proposta de organização dos tokens (sem implementar)

Só descreve uma estrutura possível, sem escolher valores novos:

- **Cores por papel**, não por matiz: superfícies (`base`, `cartão`, `cartão elevado`, `destaque tingido`, hoje os literais `#1a1700`/`#141200`/`#2a2400`), texto (`principal`, `secundário`, `apagado`), `borda`, `marca` (hoje `primary`), `sobre-marca` (hoje `black` em botões) e estados (`sucesso`, `aviso`, `erro`, com seus fundos suaves e a cor de texto sobre cada um).
- **Tipografia por função** em vez de tamanho solto: título de tela, título de seção, corpo, apoio, legenda, botão e número de destaque, cada um com tamanho, peso e altura de linha juntos (o padrão que `HEALTH_UI.type` já usa), de modo que `fontWeight` deixe de ser literal.
- **Espaçamento e raio** em uma única escala, incluindo os passos intermediários que hoje aparecem como literais (2, 6, 10, 12), ou removendo-os.
- **Controles com medidas no tema:** alvo mínimo (44), altura de botão, tamanho do botão voltar e do ícone, para que `minHeight` e `hitSlop` deixem de ser decididos tela a tela.
- **Componentes de base** que consumam esses tokens: cabeçalho de tela com botão voltar, botão (primário, secundário, destrutivo), cartão, chip, estados vazio/carregando/erro.
- **Uma só definição** em `src/utils/theme.js` (ou uma pasta de tema), com `HEALTH_UI` incorporada, e a regra de que arquivos de tela não escrevam hex, `fontSize`, `fontWeight`, `borderRadius` ou espaçamentos numéricos.

### 7.3 O que não foi possível verificar (depende do aparelho)

- A aparência real de cada tela (cortes, quebras de linha, sobreposição), em telas de 320-360 pt, com fonte do sistema grande, com teclado e em iPad ou tablet Android.
- O fundo exato de todo texto sem contêiner com `backgroundColor` próprio e as cores definidas em tempo de execução (cor do IMC e estados condicionais).
- Se `lineHeight` em pontos escala com a fonte do sistema em cada plataforma.
- O tamanho real dos 64 tocáveis sem tamanho declarado.
- A duração e o conteúdo da tela em branco enquanto o portão e as fontes carregam.
- O comportamento de `ios.supportsTablet` ausente no iPad.

_Medição feita por leitura estática do código (regex + leitor de `StyleSheet`); números sujeitos às limitações descritas no início. Os scripts de medição foram temporários e não fazem parte do repositório._
