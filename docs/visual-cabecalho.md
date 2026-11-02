# Proposta: cabeçalho de tela único (`ScreenHeader`)

**Status: só proposta.** Nenhum código de produção foi escrito ou alterado. Base: `docs/visual-auditoria.md` e a leitura do código em `candidato-2` (tokens de `docs/visual-tokens.md`). Os números de linha abaixo são desta data e servem para localizar; não são contrato.

## 0. Resumo

- Hoje cada tela monta o próprio cabeçalho (23 cópias do estilo `header`, 18 do botão voltar). Há 5 mecanismos de topo seguro, 4 tamanhos de título (28, 22, 18, 15) e 5 variantes de botão voltar.
- Proposta: **um** componente `ScreenHeader` com duas variantes (`root` e `inner`), alvo de toque de 44 pt no voltar e na ação à direita, e topo seguro tratado dentro dele.
- O componente **não toca na navegação**: `headerShown: false` continua, quem decide o que o voltar faz é a tela (`onBack`), e o gesto do iOS e o `useReturnToOrigin` seguem iguais.
- Recomendação de rolagem: **fixo e compacto nas telas internas; título grande que rola junto nas raízes de aba, com uma faixa opaca fixa sob o relógio** (item 3).
- Migração em 7 lotes pequenos, começando por Perfil, Saúde e Treinos (item 5).

## 1. Inventário

Fonte: leitura do código (cada arquivo) cruzada com a tabela da auditoria. "Rola por baixo" = o conteúdo passa por trás da área do relógio/entalhe ao rolar. Isso acontece quando o cabeçalho (ou o preenchimento do topo) está **dentro** do `ScrollView` e nada opaco cobre a área segura. Quando o cabeçalho é irmão fixo acima do `ScrollView`/`FlatList`, o conteúdo é cortado abaixo dele e não passa pelo relógio.

Legenda do mecanismo: **insets** = `useSafeAreaInsets` + `paddingTop: insets.top + SPACING.sm`; **SafeAreaView** = `SafeAreaView edges={['top']}` com `paddingTop` fixo; **casca** = `AuthScreen`; **nenhum**.

### 1.1 Telas de aba e raízes de pilha

| tela (arquivo) | topo seguro | título | voltar | ação à direita | subtítulo | rola por baixo |
|---|---|---|---|---|---|---|
| Início `HomeScreen.js` | insets (dentro do `ScrollView`) | saudação "Olá, nome" (sem título de tela) | não tem (raiz) | selo de sequência + `InfoButton` | sim ("Treino concluído hoje" / "Pronto para treinar?") | **sim** (cabeçalho é filho do `ScrollView`, linhas 41-44) |
| Treinos `WorkoutsScreen.js` | insets | 28 ("Meus Treinos") | não tem (raiz) | botão "+" amarelo (`addBtn`, `hitSlop` 3) | não | não (cabeçalho fixo; lista abaixo) |
| Exercícios `ExercisesScreen.js` | SafeAreaView (`paddingTop: SPACING.md`) | 28 ("Exercícios") | não tem (raiz) | contador "N de M" (texto) | não; busca e chips dentro do bloco do cabeçalho | não (cabeçalho fixo) |
| Perfil `ProfileScreen.js` | insets (como `paddingTop` do `contentContainerStyle`) | **sem título** (avatar + nome) | não tem (raiz) | não | não | **sim** (tudo dentro do `ScrollView`, sem faixa opaca) |

### 1.2 Telas internas (pilha)

| tela (arquivo) | topo seguro | título | voltar | ação à direita | subtítulo | rola por baixo |
|---|---|---|---|---|---|---|
| Saúde `HealthScreen.js` | insets | 28 ("Saúde") | 44x44, sem fundo | `InfoButton` | sim + até 2 linhas extras ("atualizado", dica do relógio) | não (fixo) |
| Detalhe de categoria `HealthCategoryScreen.js` | insets | 28 (nome da categoria) | 44x44 | `InfoButton` (opcional) | sim ("Detalhe e histórico") | não |
| Conectar dispositivos `HealthConnectScreen.js` | insets | 28 | 44x44 | não | sim | não |
| Academia agora `GymNowScreen.js` | insets | 28 | 44x44 | `InfoButton` | sim | não |
| Marketplace `StoreScreen.js` | insets | 28 | 44x44 | `InfoButton` | sim | não |
| Detalhe do item `StoreDetailScreen.js` | insets | **sem título no cabeçalho** (título está no conteúdo, 22) | 44x44 | não | não | não |
| Anunciar `AdvertiseScreen.js` | insets | 22 (muda por etapa: "Anunciar...", "Confira os dados", "Tudo pronto") | 44x44 (usa `BackHandler` próprio) | não | não | não |
| Lembretes `RemindersScreen.js` | insets | 22 | 44x44 **com fundo `bgCard` e raio 999** | não | não | não |
| Evolução das séries `SeriesTimelineScreen.js` | insets | 22 | 44x44 **com fundo `bgCard` e raio 999** | não | não | não |
| Detalhe do treino `WorkoutDetailScreen.js` | insets | **sem título no cabeçalho** (nome do treino no conteúdo) | sem tamanho declarado | lixeira ("Excluir treino", sem tamanho) | não | não |
| Detalhe do exercício `ExerciseDetailScreen.js` | insets | **sem título** (herói no conteúdo) | sem tamanho declarado | não | não | não |
| Novo treino `CreateWorkoutScreen.js` | insets | 18 ("Novo Treino") | "Fechar" (X), sem tamanho | texto "Salvar" | não | não |
| Dados físicos `EditBodyDataScreen.js` | SafeAreaView | 18 ("Dados Físicos") | sem tamanho declarado | texto "Salvar" (desabilitável) | não | não |
| Chat IA `AIPersonalTrainerScreen.js` (rota alternativa) | SafeAreaView | 15 ("Personal Trainer IA" + ponto online) | sem tamanho declarado | espaçador de 30 pt | não | não |
| Série inteligente `SmartPlanScreen.js` | insets | **sem título** (barra de progresso "N de M") | sem tamanho declarado; volta uma etapa antes de sair | não | não | não nas perguntas; **sim na tela final** (cabeçalho dentro do `ScrollView`, linha 155) |
| Série guiada `GuidedPlanScreen.js` via `GuidedHeader` (`components/guided/GuidedParts.js`) | insets, dentro do `GuidedHeader` | legenda "caption" (15-ish, texto de apoio), sem título | 24 px, `backBtn` próprio | rótulo `TrainerLabel` | não | não (fixo, irmão do `ScrollView`) |
| Treino ativo `ActiveWorkoutScreen.js` | insets | **sem título** (cronômetro 'mm:ss' e contador "1/6") | "X" (`close`), "Sair do treino", sem tamanho | contador | não | não |

### 1.3 Onboarding e conta (listados para completar o inventário; ver item 6)

| tela (arquivo) | topo seguro | título | voltar | ação à direita | subtítulo | rola por baixo |
|---|---|---|---|---|---|---|
| Boas-vindas `onboarding/WelcomeScreen.js` | **nenhum** no arquivo | logo + frase | não | não | não | n/a (não rola) |
| Perfil básico `onboarding/ProfileSetupScreen.js` | insets (dentro do `ScrollView`) | 28 | sem tamanho; só aparece se `canGoBack()` | pontinhos de etapa | sim | **sim** |
| Dados do corpo `onboarding/BodyDataScreen.js` | insets (dentro do `ScrollView`) | 28 | sem tamanho | pontinhos | sim | **sim** |
| Nível `onboarding/LevelSelectScreen.js` | insets (dentro do `ScrollView`) | 28 | sem tamanho | pontinhos | sim | **sim** |
| Entrar / Criar conta / Esqueci a senha / Idade (`screens/auth/*`) | casca `AuthScreen` (`components/auth/AuthParts.js`), `insets.top + SPACING.md` dentro do `ScrollView` | título e subtítulo da casca | "Voltar" 22 px quando há `onBack` | não | sim | **sim** (tudo rola) |
| Recuperação do `ErrorBoundary` | n/a (tela própria, sem navegação) | própria | não | não | sim | n/a |

Contagem do que o inventário mostra: dos 27 itens com cabeçalho próprio, 17 têm cabeçalho fixo irmão do `ScrollView`; 9 o têm **dentro** do `ScrollView` (Início, Perfil, SmartPlan final, 3 do onboarding e a casca de conta, que cobre 4 telas); 1 não trata o topo (Boas-vindas). A queixa de "conteúdo passa por baixo do relógio" (Perfil rolado, Atividade/Início) vem exatamente do grupo "dentro do `ScrollView`".

## 2. API proposta: `ScreenHeader`

Arquivo futuro: `src/components/ScreenHeader.js`. Usa só `COLORS`, `TYPE`, `SPACING`, `RADIUS`; nenhum literal de cor, fonte ou espaçamento.

```js
<ScreenHeader
  variant="inner" | "root"        // padrão "inner"
  title="Saúde"                   // string; obrigatório
  subtitle="Seus hábitos da semana" // string opcional, 1 linha (numberOfLines={1})
  onBack={() => navigation.goBack()} // só na "inner"; a tela decide o que fazer
  right={<InfoButton tema="saude" />} // nó opcional (botão de ícone, texto ou contador)
  testID="..."                    // repassa para a raiz (hoje há testIDs no cabeçalho de Saúde)
/>
```

### 2.1 Variantes

| | `root` (raiz de aba) | `inner` (interna) |
|---|---|---|
| título | `TYPE.titleLarge` (28 bold) | `TYPE.title` (22 bold), uma linha, `numberOfLines={1}` |
| voltar | não renderiza | sempre; ícone `arrow-back` 24, `COLORS.white`, sem fundo, alvo 44x44 |
| subtítulo | opcional, `TYPE.bodySmall` em `COLORS.textSecondary` | idem, uma linha |
| espaçamento vertical | `SPACING.sm` acima e abaixo do bloco | `SPACING.xs` entre título e subtítulo; `SPACING.sm` em volta |
| comportamento de rolagem | ver item 3 (título grande rola junto; faixa do topo fixa) | fixo |

### 2.2 Regras de acessibilidade e toque

- **Voltar:** `TouchableOpacity` com `accessibilityRole="button"` e `accessibilityLabel="Voltar"` (o mesmo rótulo de hoje, para não quebrar testes e leitores de tela), `minWidth` e `minHeight` de **44** (valor já existente em `HEALTH_UI.minTouch`; sugestão: promover a um token geral de controles num commit separado, como a auditoria já recomendava), `hitSlop` zero (o próprio alvo já tem 44), alinhado com `marginLeft: -SPACING.sm` para o ícone ficar na margem da tela.
- **Ação à direita:** o componente reserva uma coluna com `minWidth` e `minHeight` de 44 e centraliza o nó. A responsabilidade de rótulo é de quem passa o nó (`accessibilityRole="button"` e `accessibilityLabel` obrigatórios no nó; um teste confere nas telas migradas). Ponto de atenção: o `InfoButton` de hoje tem `size=20` e `hitSlop` zero, ou seja, **~20 pt**, abaixo de 44; ao migrar, a coluna de 44 pt do cabeçalho passa a ser o alvo, e o `InfoButton` precisa receber o `minWidth/minHeight` (mudança no `InfoButton`, em lote próprio, item 5).
- **Título:** `accessibilityRole="header"`; para `root` e `inner`.
- **Fonte do sistema:** `TYPE` não declara família, então o componente também não. `allowFontScaling` fica no padrão; o título tem `numberOfLines={1}` + `adjustsFontSizeToFit` **não** (evita título encolhendo sem controle); com fonte grande, o título corta com reticências e o `subtitle` some só se `numberOfLines` estourar. (Comportamento com Dynamic Type grande é item 7.)

### 2.3 Topo seguro (um só mecanismo)

- O componente chama `useSafeAreaInsets()` e renderiza **uma `View` raiz com `backgroundColor: COLORS.bg` opaco** e `paddingTop: insets.top + SPACING.sm`. É o mecanismo que 20 telas já usam, então o visual não muda no iPhone; só deixa de existir a segunda via (`SafeAreaView`) e a ausência (Boas-vindas).
- Fundo opaco + irmão fixo acima do `ScrollView`: o conteúdo é cortado na borda inferior do cabeçalho e nunca passa pelo relógio.
- Para telas **sem** cabeçalho fixo (raízes que rolam junto, item 3) existe o subcomponente irmão **`ScreenTopInset`**: uma `View` opaca (`COLORS.bg`), `height: insets.top`, posicionada **fora** do `ScrollView` e acima dele. É a correção do Perfil e da Início sem mudar o desenho delas.
- `SafeAreaView` deixa de ser usado para cabeçalho. O rodapé/`insets.bottom` das telas não é assunto desta proposta.

## 3. Decisão de rolagem

| opção | o que é | vantagem | custo |
|---|---|---|---|
| A. Fixo compacto | cabeçalho de uma linha (voltar + título 22 + ação) sempre visível | ponto de saída sempre à mão; é o que 17 telas já fazem | ocupa altura o tempo todo (Saúde hoje ≈ 15%) |
| B. Rola junto | título grande some ao rolar; só a faixa do relógio fica | devolve a altura ao conteúdo; visual de "raiz" | o voltar some ao rolar nas telas internas (ruim para listas longas) |
| C. Híbrido | **interna = A (fixo e menor); raiz = B (título grande rola) + faixa opaca fixa** | recupera altura onde é raiz e mantém o voltar onde há pilha | dois comportamentos para manter |

**Recomendação: C.**

- **Telas internas (fixo compacto, variante `inner`):** título 22 numa linha, subtítulo opcional numa linha, sem linhas extras. Na Saúde, as linhas "atualizado há X" e a dica do relógio saem do cabeçalho e vão para o topo do conteúdo (continuam com o mesmo `testID`). Estimativa (não medida em aparelho): hoje o cabeçalho da Saúde = `insets.top` (≈ 47-59) + 8 + bloco de texto (28 + 13 + até 2 linhas de 11 ≈ 64-80) + 8 ≈ **125-155 pt, ≈ 15% de uma tela de 852 pt**. Com `inner` de uma linha de título + uma de subtítulo: `insets.top` + 8 + 44 (alvo do voltar) + 8 ≈ **115-120 pt (≈ 13-14%)**; sem subtítulo ≈ 105-110 pt (≈ 12-13%). O ganho vem de tirar as linhas extras e passar o título de 28 para 22; **a faixa do relógio (≈ 47-59 pt) continua ocupando espaço e não se recupera**. Se o ganho for pouco, o próximo passo é B no conteúdo da Saúde (item 7).
- **Raízes de aba (variante `root`):** Início e Perfil, que já rolam o cabeçalho junto, **continuam assim**, com `ScreenTopInset` fixo. **Treinos e Exercícios continuam fixos** (têm "+", busca e filtros que precisam ficar à mão); só trocam o mecanismo de topo seguro e o tamanho do título (28 → `titleLarge`, igual).
- **Telas de fluxo com progresso (SmartPlan, GuidedPlan, onboarding):** mantêm o cabeçalho fixo e o progresso; só trocam o botão voltar e o mecanismo de topo seguro.

## 4. Compatibilidade com React Navigation 6

O app usa `@react-navigation/stack` e `bottom-tabs` v6 com `headerShown: false` em **todos** os navegadores (`STACK_SCREEN_OPTIONS` em `src/navigation/navTheme.js`; as abas também). O `ScreenHeader` é **um componente de tela comum**, não uma opção de navegação:

- **`headerShown: false` permanece.** Nenhuma tela passa a usar `navigation.setOptions({ header })` nem `headerLeft`; `screenOptions` não muda. Não há `navigationOptions`/`options` novos.
- **`useReturnToOrigin`** (`src/navigation/useReturnToOrigin.js`) escuta `beforeRemove` da própria tela e intercepta `GO_BACK`/`POP` quando há `route.params.from`. O `ScreenHeader` só chama o `onBack` que a tela passa; as telas que usam o hook (`WorkoutDetailScreen`, `ExerciseDetailScreen`, `CreateWorkoutScreen`, `SmartPlanScreen`, `GuidedPlanScreen`) continuam passando `() => navigation.goBack()` (ou o voltar interno de etapas, como hoje). O evento é o mesmo; o hook continua sem ser tocado.
- **O componente não importa `useNavigation`.** Assim o voltar custom continua dentro da tela: `SmartPlan` volta uma etapa antes de sair, `GuidedPlan` tem o `onBack` das etapas, `Advertise` usa `BackHandler` próprio, e `ProfileSetup` só mostra o voltar se `canGoBack()`. Isso também evita exigir `NavigationContainer` nos testes que renderizam as telas.
- **Gesto de voltar do iOS** (deslizar da borda): vem do `Stack` (`gestureEnabled` padrão no iOS), independe do cabeçalho. Ao deslizar, o React Navigation dispara a mesma ação de voltar, e o `beforeRemove` do `useReturnToOrigin` continua a interceptar. Como o cabeçalho não é nativo, **nada do gesto muda**. O `ScreenHeader` não pode cobrir a borda esquerda com `Pressable` de largura grande (o alvo de 44 pt fica dentro da margem de 24 pt + marginLeft negativo de 8 pt, como hoje) para não competir com o gesto.
- **Botão voltar do Android:** tratado pelo navegador (e pelo `BackHandler` de `Advertise`); o componente não registra `BackHandler`.
- **Rotas duplicadas** (`Saude`, `SaudeDetalhe`, `SaudeConectar` existem na pilha do Início e na do Perfil): o componente é o mesmo e nada na rota muda.
- **"Nenhum comportamento de navegação pode mudar"** vira regra de revisão em cada lote: o diff das telas migradas só pode trocar o JSX do cabeçalho e os estilos dele; nenhuma linha com `navigation.`, `route.`, `useReturnToOrigin` ou `openInTab` é alterada. Um teste novo confere isso por varredura (ver item 5).

## 5. Plano de migração

Princípio: cada lote é um commit pequeno, reversível, sem tocar na lógica das telas. Ordem por uso e por risco.

| lote | conteúdo | por quê |
|---|---|---|
| 0 | **Componente.** `ScreenHeader` (variantes `root` e `inner`) e `ScreenTopInset`, com testes de unidade; **nenhuma tela usa ainda** | fixa a API e o contraste antes de migrar; o app fica idêntico |
| 1 | **Perfil** (`ProfileScreen`): `ScreenTopInset` fixo acima do `ScrollView` (conserta o conteúdo passando sob o relógio). **Decisão do dono:** mostrar título "Perfil" (`root`) ou manter só o avatar | maior queixa visível; Perfil hoje não tem título |
| 2 | **Saúde** (`HealthScreen`, `HealthCategoryScreen`, `HealthConnectScreen`): variante `inner`; linhas "atualizado" e dica do relógio descem para o conteúdo (mesmos `testID`) | resolve os ≈ 15% de altura; três telas do mesmo molde |
| 3 | **Treinos**: `WorkoutsScreen` (`root` fixo, "+" com alvo de 44 pt), `WorkoutDetailScreen` (voltar + lixeira), `SeriesTimelineScreen` (voltar sem fundo) | segunda aba mais usada; passa pelo `useReturnToOrigin` |
| 4 | **Início**: `HomeScreen` (`ScreenTopInset`; cabeçalho de saudação continua no `ScrollView`), `StoreScreen`, `StoreDetailScreen`, `GymNowScreen` | seguem o mesmo molde da Saúde |
| 5 | **Exercícios**: `ExercisesScreen` (sai do `SafeAreaView`), `ExerciseDetailScreen` | abas menos usadas |
| 6 | **Lembretes e Anunciar**: `RemindersScreen`, `AdvertiseScreen` (título 22 por etapa, `BackHandler` intacto) | telas de uso eventual |
| 7 | **Fluxos**: `SmartPlanScreen` (progresso no lugar do título), `GuidedHeader`/`GuidedPlanScreen`, `EditBodyDataScreen`, `CreateWorkoutScreen`, onboarding (`ProfileSetup`, `BodyData`, `LevelSelect`) | maior risco de comportamento (etapas, teclado, Salvar); por último |

### 5.1 Verificação de cada lote

Automática (todo lote):
1. `$env:Path = "C:\Program Files\Git\bin;" + $env:Path` e `npm run test:all`.
2. `npx expo export --platform android` e `--platform ios`.
3. Testes novos do lote: (a) o cabeçalho tem voltar com `accessibilityLabel="Voltar"`, `minWidth/minHeight >= 44` e `accessibilityRole="header"` no título; (b) varredura: nenhuma tela migrada usa `SafeAreaView`/`styles.backBtn` próprio; (c) varredura: o diff do lote não altera linhas de navegação (`useReturnToOrigin`, `openInTab`, `navigation.navigate`); (d) `tokens.test.ts` continua passando (só tokens).
4. Os testes existentes que procuram `testID`/rótulos no cabeçalho (ex.: `health-updated`) devem passar sem mudar a asserção.

No aparelho (cada lote, iPhone com entalhe e Android com edge-to-edge): rolar a tela até o fim e conferir que nada passa sob o relógio; voltar pelo botão **e** pelo gesto da borda no iOS; voltar vindo de outra aba (tela aberta por `openInTab`) e conferir que volta à aba de origem; fonte grande; modo "Reduzir movimento" não afeta o cabeçalho.

## 6. Riscos e o que NÃO será tocado

**Riscos**
- **Tamanhos de título fora da escala `TYPE`:** `TYPE` tem 11, 13, 15, 18, 22, 28 e 36. Os 22 e 28 existem. Os títulos de **18** (CreateWorkout, EditBodyData) e **15** (chat IA) viram `TYPE.title` (22) ao migrar, ou ficam como estão se o dono preferir (opção: manter esses três fora dos lotes, ou aceitar `size="compact"` usando `TYPE.bodyLarge` 18; **decisão do dono**, a proposta recomenda 22 para uniformizar).
- **Quebra de teste por estilo:** testes que leem estilos ou a árvore do cabeçalho (ex.: o smoke de web com `?duoFakeAuth=1`, os testes de Saúde e de navegação em `backend/test-nav/`) podem depender de `testID`/ordem. Mitigação: manter `testID`s e rótulos, rodar `test:all` por lote.
- **Alvo de toque maior muda o layout:** o voltar que hoje não declara tamanho (7 telas) passa a ter 44 pt, aumentando levemente a altura do cabeçalho em telas que hoje usam ~30 pt. É intencional, mas muda o desenho (alguns pontos).
- **Cabeçalhos com conteúdo próprio:** `SmartPlan` (progresso), `ActiveWorkout` (cronômetro e contador), Início (saudação + selo), Exercícios (busca e chips) não cabem em `title/subtitle/right`. Proposta: ficam com `children` abaixo do cabeçalho, ou **fora do escopo** do componente (usam só `ScreenTopInset` e o botão voltar). Decidir no lote 7.
- **Dois comportamentos de rolagem (item 3, C)** exigem disciplina; o mesmo `ScreenHeader` cobre os dois, e a escolha fica na tela.
- **Duplicação de rotas** de Saúde nas pilhas do Início e do Perfil: o componente é igual, mas o voltar leva a destinos diferentes; conferir os dois caminhos no aparelho.

**Não será tocado**
- **Telas de login e conta** (`screens/auth/*`, casca `AuthScreen`): têm layout próprio (teclado, rolagem até o campo, fundo escuro em todas as camadas conferido por smoke). Ficam fora; Boas-vindas só ganha o topo seguro se o dono pedir, em lote à parte.
- **Telas modais:** o app não usa `presentation: 'modal'` em rota. Os modais são `Modal` do React Native (`InfoSheet`, escolhas de `AuthParts`) e não têm cabeçalho de tela; ficam intactos. `CreateWorkout` ("Fechar") é uma rota normal e entra no lote 7 com o "X".
- **Tela de recuperação do `ErrorBoundary`:** não usa navegação nem `AppContext`; não pode depender de `ScreenHeader`.
- **Barra de abas, `STACK_SCREEN_OPTIONS`, rotas, `useReturnToOrigin`, `crossTab.js`:** nada muda.
- **Conteúdo e textos das telas, cores, tema e tokens:** só o cabeçalho muda de componente. `TYPE`, `SPACING` e `RADIUS` não são alterados por este trabalho.
- **Tamanhos numéricos grandes (32 a 56):** continuam fora da escala (não são de cabeçalho).

## 7. Itens não verificáveis sem o aparelho

- Altura real do cabeçalho da Saúde antes e depois (as estimativas do item 3 usam insets típicos de iPhone com entalhe; não foi medido em aparelho).
- Comportamento do topo seguro em iPhones com Dynamic Island, em Android com recorte de câmera e em Android com edge-to-edge (o `StatusBar` só existe dentro do `AppRoot`, ver `docs/visual-tokens.md`).
- O gesto de voltar do iOS com o novo alvo de 44 pt (não deve competir com a borda, mas só o dedo confirma).
- Fonte grande (Dynamic Type / escala de fonte do Android): como o título de uma linha se comporta, se a coluna de ação à direita aperta o título e se o subtítulo some.
- Aparência da faixa opaca sob o relógio no Início e no Perfil durante a rolagem e no "puxar além do fim" (bounce) do iOS.
- Tamanho real do alvo do `InfoButton` (20 pt de ícone sem `hitSlop`) e do botão "+" de Treinos em uso com o polegar.
- Leitor de tela (VoiceOver e TalkBack): ordem de foco do cabeçalho (voltar, título, ação) e anúncio do título como cabeçalho.
- Transições da pilha (deslizar de uma tela para outra) com cabeçalho opaco: se o cabeçalho "pisca" durante a animação por ter fundo próprio (hoje o fundo é o da própria tela).
