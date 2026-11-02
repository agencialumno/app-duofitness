# Proposta: botões e controles de ação (`Button`)

**Status: só proposta.** Nenhum código de produção foi escrito ou alterado. Base: leitura do código de `visual-cabecalho` (varredura de todos os `TouchableOpacity`, `Pressable` e componentes de botão em `src/`), `docs/visual-auditoria.md` e `docs/visual-tokens.md`. Números de linha são desta data e servem para localizar. Contrastes calculados pela fórmula WCAG 2.1 (mínimo 4,5:1 para texto; 3:1 para ícone e borda de controle).

## 0. Resumo

- Há **189 controles de ação** em `src/` (o inventário do item 1 lista cada um). **39 deles são botões primários amarelos**: 26 reescritos localmente em 20 arquivos, 2 definições compartilhadas (`PrimaryButton`, `FooterButton`) e 11 usos delas. As alturas mínimas variam entre 52, 48, 44 e "nenhuma" (11 botões só com `paddingVertical`, que dá cerca de 52 a 55 pt, e o menor, o "Salvar meu plano" do chat IA, cerca de 36 pt).
- O estado "pressionado" quase não é desenhado: **os botões sem `activeOpacity` usam o padrão do React Native (0,2)**, que apaga o botão até quase sumir; 24 controles declaram 0,8 a 0,9. O estado desabilitado usa `opacity` com três valores diferentes (0,45, 0,4 e 0,35) e **o texto cai abaixo de 4,5:1** no primário em todos eles (3,50, 2,99 e 2,53).
- O destrutivo do `ConfirmModal` (texto branco sobre `#ef4444`) tem **3,76:1**. Proposta: fundo `#DC2626`, que dá **4,83:1** com texto branco.
- Proposta: um componente `Button` com **4 variantes** (primário, secundário/contorno, terciário/texto, destrutivo) e **2 tamanhos** (normal 52 pt, compacto 44 pt). O amarelo fica só no primário (a ação principal da tela). Ícones, voltar, "i", chips, cartões de escolha e cartões tocáveis **não** viram `Button`.
- Migração em 7 lotes, começando pelo `ConfirmModal` e pelos componentes compartilhados (retrocompatíveis), depois Treinos, Saúde, Início/Perfil e os fluxos.

## 1. Inventário

### 1.1 Como foi medido

- Varredura de todo `<TouchableOpacity|Pressable|TouchableHighlight>` e dos componentes `PrimaryButton`, `SecondaryButton`, `LinkButton`, `SocialButton`, `FooterButton`, `Chip` e `InfoButton`, resolvendo os estilos de `StyleSheet.create` de cada arquivo. 191 ocorrências; 2 eram citações em comentário (`data/*.js`) e foram descartadas; restam **189**.
- **Altura** vem de `minHeight`/`height`; "(mín.)" = `minHeight`. Quando o botão só tem `padding`, a altura é **estimada** (`2 × paddingVertical + 1,25 × fonte`, com 20 pt para linhas com ícone) e marcada com "≈". **Alvo** = altura × largura declaradas, mais `hitSlop` (mostrado entre parênteses); "auto" = largura do conteúdo; "⚠" = abaixo de 44 pt em pelo menos uma dimensão **na estimativa**.
- "press 0,2*" = não declara `activeOpacity`: vale o padrão do React Native para `TouchableOpacity` (0,2). "press —" = o controle é um componente compartilhado cujo estilo está no componente. "desab. op X" = estado desabilitado feito por `opacity`.
- Os botões de componentes compartilhados repetem as medidas da definição. `PrimaryButton`, `SecondaryButton` e `LinkButton` são usados só nas telas de conta e em `AdvertiseScreen`, `AccountCard`; `FooterButton`, só em `GuidedPlanScreen`.

### 1.2 Contagem por variante (visual de hoje)

| variante | controles | detalhe |
|---|---|---|
| primário (amarelo preenchido) | **39** | 26 implementações locais em 20 arquivos; 2 definições compartilhadas (`PrimaryButton`, `FooterButton`); 7 usos de `PrimaryButton`; 4 usos de `FooterButton` |
| contorno / secundário | **19** | 11 locais; `SecondaryButton` (definição + 3 usos); `SocialButton` (definição + 2 usos); `FooterButton secondary` (1 uso) |
| texto / link | **25** | 18 locais; `LinkButton` (definição + 6 usos) |
| destrutivo | **4** | `ConfirmModal danger` (preenchido), `dangerBtn` da Conectar (contorno), "Excluir série" e "Parar todos os lembretes" (texto), mais o ícone de lixeira vermelha do detalhe do treino |
| ícone (ação) | **15** | "+", enviar, passos de horário e de copos, remover registro, limpar busca, mostrar senha, play do vídeo, editar nome, "X" do treino, confirmar chips |
| voltar / fechar | **18** | 18 cópias do botão voltar, em 5 variantes (o `ScreenHeader` já cobre Saúde, Detalhe de categoria, Conectar e Treinos) |
| botão "i" (`InfoButton`) | **19** | 1 definição e 18 usos (todos com alvo 44×44) |
| chip / segmento | **15** | filtros, períodos, dias da semana, opções da série guiada |
| cartão de escolha / linha de seleção | **9** | gênero, nível, objetivos, opções, consentimentos |
| cartão tocável (navegação) | **23** | Início, Saúde, Marketplace, Perfil, séries; inclui 2 faixas amarelas de "Personal Trainer IA" |
| outro | **3** | fundo que fecha a folha de ajuda, ponto do carrossel, botão verde "Ver meus treinos" do chat |

### 1.3 Alturas, raios e fontes do primário (as 26 reescritas locais)

| altura mínima | quantos | onde |
|---|---|---|
| 52 | 8 | ConfirmModal, ErrorBoundary, InfoSheet (Fechar), Advertise, Conectar (2), StoreDetail, Store |
| 48 | 4 | GuidedPlan (2), HealthCategory (2) |
| 44 | 3 | Lembretes (2), EditNameRow |
| nenhuma (só `paddingVertical`) | 11 | ActiveWorkout (2), AI "Salvar plano", onboarding (3), Welcome, SmartPlan (2), WorkoutDetail, Workouts |

Raio: `RADIUS.full` em 25 deles; `RADIUS.md` (12) só no `okBtn` da série guiada (`GuidedPlanScreen.js:295`, `:408`). Fonte do rótulo: 18/700 (12), 15/700 ou 600 (13), 13/700 (1). Cor do texto sempre `#000000` sobre `#fed205` (14,43:1).

### 1.4 Tabela completa (um controle por linha)

Colunas: arquivo:linha · rótulo · variante · altura (pt) · raio · fonte (tamanho/peso) · cor do texto · fundo · borda (espessura e cor) · estados · alvo medido · usa componente compartilhado.

| arquivo:linha | rótulo | variante | altura | raio | fonte | texto | fundo | borda | estados | alvo | compartilhado |
|---|---|---|---|---|---|---|---|---|---|---|---|
| components/AboutCard.js:38 | visible ? Ocultar detalhes da  | texto/link | 44 (mín.) | — | sm/700 sublinhado | primary | — | — | press 0,2* | 44×44 | não |
| components/auth/AccountCard.js:67 | wait > 0 ? Reenviar e-mail de  | contorno | 52 (mín.) | R.full | md/600 | white | — | 1 textSecondary | desab. op 0.45; press 0.8 | 52×auto | **sim** (SecondaryButton) |
| components/auth/AccountCard.js:69 | Já verifiquei | contorno | 52 (mín.) | R.full | md/600 | white | — | 1 textSecondary | desab. op 0.45; press 0.8 | 52×auto | **sim** (SecondaryButton) |
| components/auth/AccountCard.js:113 | Sair da conta | contorno | 52 (mín.) | R.full | md/600 | white | — | 1 textSecondary | desab. op 0.45; press 0.8 | 52×auto | **sim** (SecondaryButton) |
| components/auth/AccountCard.js:114 | Excluir minha conta | texto/link | 44 (mín.) | — | sm/400 sublinhado | textSecondary | — | — | press 0,2* | 44 (mín.)×auto | não |
| components/auth/AuthParts.js:33 | Voltar | voltar | 44 | — | — | ícone | — | — | press 0,2* | 44×44 | não |
| components/auth/AuthParts.js:73 | shown ? Ocultar senha : Mostra | ícone | 48 (mín.) | — | — | ícone | — | — | press 0,2* | 48×48 | não |
| components/auth/AuthParts.js:95 | label | primário | 52 (mín.) | R.full | lg/700 | black | primary | — | desab. op 0.45; carreg.; press 0.85 | 52×auto | definição |
| components/auth/AuthParts.js:113 | label | contorno | 52 (mín.) | R.full | md/600 | white | — | 1 textSecondary | desab. op 0.45; press 0.8 | 52×auto | definição |
| components/auth/AuthParts.js:143 | label | contorno | 52 (mín.) | R.full | md/600 | — | — | 1 border | desab. op 0.45; press 0.8 | 52×auto | definição |
| components/auth/AuthParts.js:162 | label | texto/link | 44 (mín.) | — | md/400 sublinhado | primary | — | — | press 0,2* | 44×auto | definição |
| components/auth/AuthParts.js:183 | label | cartão de escolha | 44 (mín.) | — | sm/400 | white | — | — | press 0.8 | 44×auto | não |
| components/auth/AuthParts.js:265 | confirmLabel | primário | 52 (mín.) | R.full | lg/700 | black | primary | — | desab. op 0.45; carreg.; press 0,2* | 52×auto | não |
| components/auth/AuthParts.js:277 | Cancelar | texto/link | 44 (mín.) | — | md/400 sublinhado | primary | — | — | press 0,2* | 44×auto | **sim** (LinkButton) |
| components/EditNameRow.js:25 | Editar nome | ícone | 44 (mín.) | — | — | ícone | — | — | press 0,2* | 44×44 | não |
| components/EditNameRow.js:53 | Cancelar | contorno | 44 (mín.) | R.full | md/600 | white | — | 1 border | press 0,2* | 44×96 | não |
| components/EditNameRow.js:56 | Salvar nome | primário | 44 (mín.) | R.full | md/600 | black | primary | 1 primary | press 0,2* | 44×96 | não |
| components/ErrorBoundary.js:86 | Tentar novamente | primário | 52 (mín.) | R.full | md/700 | black | primary | — | press 0,2* | 52×auto | não |
| components/ErrorBoundary.js:91 | Recomeçar do zero | contorno | 52 (mín.) | R.full | md/700 | primary | — | 1 primary | press 0,2* | 52×auto | não |
| components/ExerciseStills.js:65 | showEnd ? Ver posição inicial  | contorno | 44 (mín.) | R.full | md/700 | primary | — | 1 primary | press 0,2* | 44×44 | não |
| components/ExerciseVideoPlayer.js:92 | label | ícone | 44 | R.full | — | ícone | primary | — | press 0,2* | 44×44 | não |
| components/guided/GuidedParts.js:26 | Voltar | voltar | 44 (mín.) | — | — | ícone | — | — | press 0,2* | 44×44 | não |
| components/guided/GuidedParts.js:60 | hint ? …. … : label | cartão de escolha | 64 (mín.) | R.lg | sm/700 | textSecondary | #1A1700 | 1.5 primary | press 0.85 | 64×auto | não |
| components/guided/GuidedParts.js:85 | accessibilityLabel // label | chip | 44 (mín.) | R.full | sm/600 | black | primary | 1 primary | press 0,2* | 44×auto | não |
| components/guided/GuidedParts.js:102 | label | primário | 52 (mín.) | R.full | md/700 | primary | transparent | 1 primary | desab. op 0.4; press 0,2* | 52×auto | definição |
| components/guided/SeriesCard.js:34 | Série …, … exercícios, …. … | cartão tocável | 64 (mín.) | — | md/700 | white | — | — | press 0,2* | 64×auto | não |
| components/guided/SeriesCard.js:64 | Trocar … | texto/link | 44 (mín.) | — | sm/700 | primary | — | — | press 0,2* | 44×44 | não |
| components/guided/SeriesCard.js:82 | Usar … no lugar de … | chip | 44 (mín.) | R.md | xs/700 | textSecondary | bgCardAlt | 1 border | press 0,2* | 44×auto | não |
| components/health/CategoryCard.js:23 | cardA11y(view) | cartão tocável | ≈20 | card.radius | — | white | bgCard | card.borderWidth border | press 0.85 | ≈20×auto | não |
| components/health/HealthParts.js:21 | (ícone) | info "i" | 44 | círculo 24 | ícone 14 | primary | — | 1,5 primary | press 0,2* | 44×44 | **sim** (InfoButton) |
| components/health/HealthParts.js:70 | accessibilityLabel // label | contorno | 52 (mín.) | card.radius | — | textSecondary | bg | card.borderWidth border | press 0.85 | 52×auto | não |
| components/health/HealthParts.js:92 | Ir para …… | chip | 44 (mín.) | 999 | — | white | bgCard | 1 border | press 0,2* | 44×auto | não |
| components/health/HealthParts.js:124 | open[s.id] ? Esconder o motivo | texto/link | 44 (mín.) | — | — | primary | — | — | press 0,2* | 44×auto | não |
| components/health/HealthParts.js:147 | Sem dados ainda, … …. … | cartão tocável | 44 (mín.) | — | — | white | — | — | press 0,2* | 44×auto | não |
| components/health/HealthParts.js:159 | …: sem dados. …. Toque para ab | cartão tocável | 44 (mín.) | — | — | black | — | — | press 0,2* | 44×auto | não |
| components/health/HealthParts.js:187 | Relatório semanal. … | cartão tocável | 44 (mín.) | — | — | white | — | — | press 0,2* | 44×auto | não |
| components/health/HealthParts.js:216 | Por que este número? | texto/link | 44 (mín.) | — | — | primary | — | — | press 0,2* | 44×auto | não |
| components/health/ProfileHealthCard.js:28 | label | cartão tocável | ≈67 | R.lg | xxl/700 | white | bgCard | 1 border | press 0.85 | ≈67×auto | não |
| components/InfoButton.js:19 | Saiba mais sobre … | info "i" | 44 | — | — | ícone | — | — | press 0,2* | 44×44 (slop 0/0) | não |
| components/InfoSheet.js:38 | Fechar ajuda | outro | ≈19 | — | — | — | rgba(0,0,0,0.6) | — | press — | ≈19×auto | não |
| components/InfoSheet.js:51 | Fechar | primário | 52 (mín.) | R.full | md/700 | black | primary | — | press 0,2* | 52×auto | não |
| components/LegalLinks.js:23 | l.accessibilityLabel | texto/link | 44 (mín.) | — | md/400 sublinhado | primary | — | — | press 0,2* | 44×44 | não |
| components/MarketplaceBanners.js:52 | …. …Banner … de …. | cartão tocável | ≈19 | — | md/700 | white | — | — | press 0.9 | ≈19×auto | não |
| components/MarketplaceBanners.js:85 | Ir ao banner … de … | outro | 28 (mín.) | — | — | — | — | — | press 0,2* | 56×40 (slop 14/6) | não |
| components/RemindersCard.js:11 | Lembretes de treino | cartão tocável | 44 (mín.) | R.lg | xs/600 | textMuted | bgCard | 1 border | press 0,2* | 44×auto | não |
| components/ScreenHeader.js:19 | Voltar | voltar | 44 (mín.) | — | — | ícone | — | — | press 0,2* | 44×44 | não |
| screens/ActiveWorkoutScreen.js:96 | Concluir | primário | ≈55 | R.full | lg/700 | black | primary | — | press 0,2* | ≈55×auto | não |
| screens/ActiveWorkoutScreen.js:106 | Sair do treino | ícone | ≈20 | — | — | ícone | — | — | press 0,2* | ≈20×auto ⚠ | não |
| screens/ActiveWorkoutScreen.js:148 | Pular descanso | texto/link | ≈16 | — | sm/400 sublinhado | textMuted | — | — | press 0,2* | ≈16×auto ⚠ | não |
| screens/ActiveWorkoutScreen.js:155 | (ícone) | primário | ≈55 | R.full | lg/700 | black | primary | — | press 0,2* | ≈55×auto | não |
| screens/AdvertiseScreen.js:91 | Voltar | voltar | 44 (mín.) | — | — | ícone | — | — | press 0,2* | 44×44 | não |
| screens/AdvertiseScreen.js:125 | Concluir | primário | 52 (mín.) | R.full | lg/700 | black | primary | — | desab. op 0.45; carreg.; press 0.85 | 52×auto | **sim** (PrimaryButton) |
| screens/AdvertiseScreen.js:126 | Voltar aos dados | texto/link | 44 (mín.) | — | sm/600 sublinhado | textSecondary | — | — | press 0,2* | 44×auto | não |
| screens/AdvertiseScreen.js:163 | busy ? Abrindo… : Confirmar | primário | 52 (mín.) | R.full | lg/700 | black | primary | — | desab. op 0.45; carreg.; press 0.85 | 52×auto | **sim** (PrimaryButton) |
| screens/AdvertiseScreen.js:164 | Voltar e editar | texto/link | 44 (mín.) | — | sm/600 sublinhado | textSecondary | — | — | press 0,2* | 44×auto | não |
| screens/AdvertiseScreen.js:189 | n.label | chip | 44 (mín.) | R.full | sm/600 | white | bgCard (sel.: primary) | 1 border | press 0,2* | 44×auto | **sim** (Chip) |
| screens/AdvertiseScreen.js:243 | Revisar | primário | 52 (mín.) | R.full | lg/700 | black | primary | — | desab. op 0.45; carreg.; press 0.85 | 52×auto | **sim** (PrimaryButton) |
| screens/AdvertiseScreen.js:281 | label | primário | 52 (mín.) | R.full | md/700 | black | primary | — | desab. op 0.4; press 0,2* | 52×auto | não |
| screens/AIPersonalTrainerScreen.js:534 | Salvar meu plano de treino | primário | ≈36 | R.full | sm/700 | black | primary | — | desab.; carreg.; press 0,2* | ≈36×auto ⚠ | não |
| screens/AIPersonalTrainerScreen.js:549 | Ver meus treinos | outro | ≈36 | R.full | sm/700 | black | success | — | press 0,2* | ≈36×auto | não |
| screens/AIPersonalTrainerScreen.js:572 | Voltar | voltar | ≈28 | — | — | ícone | — | — | press 0,2* | ≈28×auto ⚠ | não |
| screens/AIPersonalTrainerScreen.js:612 | (ícone) | chip | ≈24 | R.full | sm/700 | black | primary | 1 primary | press 0,2* | ≈24×auto ⚠ | não |
| screens/AIPersonalTrainerScreen.js:622 | Confirmar seleção | ícone | 32 | 16 | — | ícone | bgCard | — | desab.; press 0,2* | 44×44 (slop 6/6) | não |
| screens/AIPersonalTrainerScreen.js:645 | Enviar mensagem | ícone | 44 | 22 | — | ícone | bgCard | — | desab.; press 0,2* | 44×44 | não |
| screens/auth/AgeGateScreen.js:78 | blocked ? Entendi : Continuar | primário | 52 (mín.) | R.full | lg/700 | black | primary | — | desab. op 0.45; carreg.; press 0.85 | 52×auto | **sim** (PrimaryButton) |
| screens/auth/AgeGateScreen.js:85 | Usar outra conta | texto/link | 44 (mín.) | — | md/400 sublinhado | primary | — | — | press 0,2* | 44×auto | **sim** (LinkButton) |
| screens/auth/ForgotPasswordScreen.js:40 | sent ? Enviar de novo : Enviar | primário | 52 (mín.) | R.full | lg/700 | black | primary | — | desab. op 0.45; carreg.; press 0.85 | 52×auto | **sim** (PrimaryButton) |
| screens/auth/ForgotPasswordScreen.js:41 | Voltar para entrar | texto/link | 44 (mín.) | — | md/400 sublinhado | primary | — | — | press 0,2* | 44×auto | **sim** (LinkButton) |
| screens/auth/SignInScreen.js:49 | Entrar | primário | 52 (mín.) | R.full | lg/700 | black | primary | — | desab. op 0.45; carreg.; press 0.85 | 52×auto | **sim** (PrimaryButton) |
| screens/auth/SignInScreen.js:50 | Esqueci a senha | texto/link | 44 (mín.) | — | md/400 sublinhado | primary | — | — | press 0,2* | 44×auto | **sim** (LinkButton) |
| screens/auth/SignInScreen.js:53 | Ainda não tenho conta: criar c | texto/link | 44 (mín.) | — | md/400 sublinhado | primary | — | — | press 0,2* | 44×auto | **sim** (LinkButton) |
| screens/auth/SignUpScreen.js:70 | Criar conta | primário | 52 (mín.) | R.full | lg/700 | black | primary | — | desab. op 0.45; carreg.; press 0.85 | 52×auto | **sim** (PrimaryButton) |
| screens/auth/SignUpScreen.js:76 | Já tenho conta: entrar | texto/link | 44 (mín.) | — | md/400 sublinhado | primary | — | — | press 0,2* | 44×auto | **sim** (LinkButton) |
| screens/auth/SocialButtons.js:38 | Continuar com Google | contorno | 52 (mín.) | R.full | md/600 | branco ou preto (marca) | marca | 1 | desab. op 0.45; press 0.8 | 52×auto | **sim** (SocialButton) |
| screens/auth/SocialButtons.js:39 | Continuar com a Apple | contorno | 52 (mín.) | R.full | md/600 | branco ou preto (marca) | marca | 1 | desab. op 0.45; press 0.8 | 52×auto | **sim** (SocialButton) |
| screens/CreateWorkoutScreen.js:42 | Fechar | voltar | ≈28 | — | — | ícone | — | — | press 0,2* | ≈28×auto ⚠ | não |
| screens/CreateWorkoutScreen.js:46 | Salvar | texto/link | ≈19 | — | md/700 | primary | — | — | press 0,2* | ≈19×auto ⚠ | não |
| screens/CreateWorkoutScreen.js:65 | (ícone) | chip | ≈24 | R.full | sm/500 | black | primary | 1 primary | press 0,2* | ≈24×auto ⚠ | não |
| screens/CreateWorkoutScreen.js:84 | (ícone) | chip | ≈22 | R.full | xs/400 | primary | #1A1700 | — | press 0,2* | ≈22×auto ⚠ | não |
| screens/CreateWorkoutScreen.js:99 | (ícone) | cartão de escolha | ≈52 | R.md | xs/600 | textMuted | #141200 | 1 primary | press 0,2* | ≈52×auto | não |
| screens/EditBodyDataScreen.js:63 | Voltar | voltar | ≈28 | — | — | ícone | — | — | press 0,2* | ≈28×auto ⚠ | não |
| screens/EditBodyDataScreen.js:67 | Salvar | texto/link | ≈19 | — | md/700 | primary | — | — | desab.; press 0,2* | ≈19×auto ⚠ | não |
| screens/EditBodyDataScreen.js:118 | (ícone) | info "i" | 44 | círculo 24 | ícone 14 | primary | — | 1,5 primary | press 0,2* | 44×44 | **sim** (InfoButton) |
| screens/EditBodyDataScreen.js:137 | (ícone) | cartão de escolha | ≈52 | R.md | md/600 | black | primary | 1 primary | press 0,2* | ≈52×auto | não |
| screens/ExerciseDetailScreen.js:20 | Voltar | voltar | ≈28 | — | — | ícone | — | — | press 0,2* | ≈28×auto ⚠ | não |
| screens/ExerciseDetailScreen.js:40 | (ícone) | info "i" | 44 | círculo 24 | ícone 14 | primary | — | 1,5 primary | press 0,2* | 44×44 | **sim** (InfoButton) |
| screens/ExercisesScreen.js:47 | Limpar busca | ícone | ≈20 | — | — | ícone | — | — | press 0,2* | ≈20×auto ⚠ | não |
| screens/ExercisesScreen.js:60 | (ícone) | chip | ≈28 | R.full | sm/700 | black | primary | 1 primary | press 0,2* | ≈28×auto ⚠ | não |
| screens/ExercisesScreen.js:87 | (ícone) | cartão tocável | ≈52 | R.lg | 11/500 | primary | bgCard | 1 border | press 0.8 | ≈52×auto | não |
| screens/GuidedPlanScreen.js:200 | (ícone) | info "i" | 44 | círculo 24 | ícone 14 | primary | — | 1,5 primary | press 0,2* | 44×44 | **sim** (InfoButton) |
| screens/GuidedPlanScreen.js:205 | Pular | contorno | 52 (mín.) | R.full | md/700 | black (secundário: primary) | primary (secundário: transparente) | (secundário: 1 primary) | desab. op 0.4; press 0,2* | 52×auto | **sim** (FooterButton) |
| screens/GuidedPlanScreen.js:265 | Quer ajustar algo? | cartão tocável | 48 (mín.) | — | md/700 | white | — | — | press 0,2* | 48×auto | não |
| screens/GuidedPlanScreen.js:281 | c | chip | 44 (mín.) | R.full | sm/600 | white | bgCard (sel.: primary) | 1 border | press 0,2* | 44×auto | **sim** (Chip) |
| screens/GuidedPlanScreen.js:295 | Ajustar a série | primário | 48 (mín.) | R.md | md/700 | black | primary | — | press 0,2* | 48×64 | não |
| screens/GuidedPlanScreen.js:305 | saving ? Salvando… : Salvar sé | primário | 52 (mín.) | R.full | md/700 | black (secundário: primary) | primary (secundário: transparente) | (secundário: 1 primary) | desab. op 0.4; press 0,2* | 52×auto | **sim** (FooterButton) |
| screens/GuidedPlanScreen.js:324 | Ver minhas séries | primário | 52 (mín.) | R.full | md/700 | black (secundário: primary) | primary (secundário: transparente) | (secundário: 1 primary) | desab. op 0.4; press 0,2* | 52×auto | **sim** (FooterButton) |
| screens/GuidedPlanScreen.js:325 | Voltar ao início | texto/link | 44 (mín.) | — | sm/400 sublinhado | textSecondary | bg | — | press 0,2* | 44×auto | não |
| screens/GuidedPlanScreen.js:379 | …: …. Toque para editar. | chip | 44 (mín.) | R.full | sm/700 | white | #1A1700 | 1 primary | press 0,2* | 44×auto | não |
| screens/GuidedPlanScreen.js:408 | Confirmar | primário | 48 (mín.) | R.md | md/700 | black | primary | — | press 0,2* | 48×64 | não |
| screens/GuidedPlanScreen.js:420 | (ícone) | info "i" | 44 | círculo 24 | ícone 14 | primary | — | 1,5 primary | press 0,2* | 44×44 | **sim** (InfoButton) |
| screens/GuidedPlanScreen.js:424 | g.label | chip | 44 (mín.) | R.full | sm/600 | white | bgCard (sel.: primary) | 1 border | press 0,2* | 44×auto | **sim** (Chip) |
| screens/GuidedPlanScreen.js:436 | l.label | chip | 44 (mín.) | R.full | sm/600 | white | bgCard (sel.: primary) | 1 border | press 0,2* | 44×auto | **sim** (Chip) |
| screens/GuidedPlanScreen.js:442 | Usar o chat antigo do Personal | texto/link | 44 (mín.) | — | sm/400 sublinhado | textSecondary | — | — | press 0,2* | 44×auto | não |
| screens/GuidedPlanScreen.js:448 | Começar | primário | 52 (mín.) | R.full | md/700 | black (secundário: primary) | primary (secundário: transparente) | (secundário: 1 primary) | desab. op 0.4; press 0,2* | 52×auto | **sim** (FooterButton) |
| screens/GuidedPlanScreen.js:503 | (ícone) | info "i" | 44 | círculo 24 | ícone 14 | primary | — | 1,5 primary | press 0,2* | 44×44 | **sim** (InfoButton) |
| screens/GuidedPlanScreen.js:504 | (ícone) | info "i" | 44 | círculo 24 | ícone 14 | primary | — | 1,5 primary | press 0,2* | 44×44 | **sim** (InfoButton) |
| screens/GuidedPlanScreen.js:509 | last ? Montar minha série : Co | primário | 52 (mín.) | R.full | md/700 | black (secundário: primary) | primary (secundário: transparente) | (secundário: 1 primary) | desab. op 0.4; press 0,2* | 52×auto | **sim** (FooterButton) |
| screens/GymNowScreen.js:20 | Voltar | voltar | 44 (mín.) | — | — | ícone | — | — | press 0,2* | 44×44 | não |
| screens/GymNowScreen.js:32 | (ícone) | info "i" | 44 | círculo 24 | ícone 14 | primary | — | 1,5 primary | press 0,2* | 44×44 | **sim** (InfoButton) |
| screens/GymNowScreen.js:59 | Atualizar lotação | contorno | 44 (mín.) | R.full | sm/700 | primary | — | 1 primary | press 0,2* | 44×auto | não |
| screens/HealthCategoryScreen.js:53 | info.label | info "i" | 44 | círculo 24 | ícone 14 | primary | — | 1,5 primary | press 0,2* | 44×44 | **sim** (InfoButton) |
| screens/HealthCategoryScreen.js:115 | Período de … | chip | 44 (mín.) | R.full | sm/700 | black | primary | 1 primary | press 0,2* | 44×auto | não |
| screens/HealthCategoryScreen.js:150 | Remover o registro de … | ícone | 44 | — | — | ícone | — | — | press 0,2* | 44×44 | não |
| screens/HealthCategoryScreen.js:163 | Registrar hoje | primário | 48 (mín.) | R.full | md/700 | black | primary | — | press 0,2* | 48×auto | não |
| screens/HealthCategoryScreen.js:170 | Tirar um copo | ícone | 48 | 24 | — | ícone | bgCardAlt | 1 border | press 0,2* | 48×48 | não |
| screens/HealthCategoryScreen.js:177 | Adicionar um copo | ícone | 48 | 24 | — | ícone | primary | 1 primary | press 0,2* | 48×48 | não |
| screens/HealthCategoryScreen.js:183 | Diminuir a meta de copos | ícone | 44 | 22 | — | ícone | bgCardAlt | 1 border | press 0,2* | 44×44 | não |
| screens/HealthCategoryScreen.js:186 | Aumentar a meta de copos | ícone | 44 | 22 | — | ícone | bgCardAlt | 1 border | press 0,2* | 44×44 | não |
| screens/HealthCategoryScreen.js:213 | Registrar | primário | 48 (mín.) | R.full | md/700 | black | primary | — | press 0,2* | 48×auto | não |
| screens/HealthConnectScreen.js:146 | A.updateButton | primário | 52 (mín.) | R.full | lg/700 | black | primary | — | press 0,2* | 52×auto | não |
| screens/HealthConnectScreen.js:193 | A.rationaleButton | texto/link | 44 (mín.) | — | md/700 sublinhado | primary | — | — | press 0,2* | 44×auto | não |
| screens/HealthConnectScreen.js:206 | Permitir a leitura de … | cartão de escolha | 44 (mín.) | — | md/400 | white | — | — | desab.; press 0,2* | 44×auto | não |
| screens/HealthConnectScreen.js:224 | …… | primário | 52 (mín.) | R.full | lg/700 | black | primary | — | desab.; press 0,2* | 52×auto | não |
| screens/HealthConnectScreen.js:267 | A.openSettingsButton | texto/link | 44 (mín.) | — | md/700 sublinhado | primary | — | — | press 0,2* | 44×auto | não |
| screens/HealthConnectScreen.js:271 | CONNECT_COPY.disconnectButton | destrutivo | 48 (mín.) | R.full | md/700 | error | — | 1 error | press 0,2* | 48×auto | não |
| screens/HealthScreen.js:63 | (ícone) | info "i" | 44 | círculo 24 | ícone 14 | primary | — | 1,5 primary | press 0,2* | 44×44 | **sim** (InfoButton) |
| screens/HomeScreen.js:56 | (ícone) | info "i" | 44 | círculo 24 | ícone 14 | primary | — | 1,5 primary | press 0,2* | 44×44 | **sim** (InfoButton) |
| screens/HomeScreen.js:66 | (ícone) | info "i" | 44 | círculo 24 | ícone 14 | primary | — | 1,5 primary | press 0,2* | 44×44 | **sim** (InfoButton) |
| screens/HomeScreen.js:89 | (ícone) | info "i" | 44 | círculo 24 | ícone 14 | primary | — | 1,5 primary | press 0,2* | 44×44 | **sim** (InfoButton) |
| screens/HomeScreen.js:114 | Adicionar peso e altura para c | cartão tocável | ≈52 | R.md | sm/400 | textSecondary | bgCard | 1 border | press 0,2* | ≈52×auto | não |
| screens/HomeScreen.js:140 | Personal Trainer IA | cartão tocável | ≈52 | R.lg | xs/700 | rgba(0,0,0,0.6) | primary | — | press 0.85 | ≈52×auto | não |
| screens/HomeScreen.js:160 | Gerador rápido | contorno | ≈52 | R.md | sm/600 | primary | bgCard | 1 border | press 0,2* | ≈52×auto | não |
| screens/HomeScreen.js:167 | Criar manualmente | contorno | ≈52 | R.md | sm/600 | primary | bgCard | 1 border | press 0,2* | ≈52×auto | não |
| screens/HomeScreen.js:177 | Academia agora. Abre a lotação | cartão tocável | ≈52 | R.lg | md/700 | white | bgCard | 1 border | press 0.85 | ≈52×auto | não |
| screens/HomeScreen.js:202 | …. … | cartão tocável | ≈14 | R.lg | xs/700 | textSecondary | bgCard | 1 border | press 0.85 | ≈14×220 | não |
| screens/HomeScreen.js:219 | Ver marketplace | contorno | 44 (mín.) | R.full | sm/700 | primary | — | 1 primary | press 0,2* | 44×auto | não |
| screens/HomeScreen.js:231 | Saúde. … de 100, ….} Abre a ár | cartão tocável | ≈67 | R.lg | xxl/700 | white | bgCard | 1 border | press 0.85 | ≈67×auto | não |
| screens/HomeScreen.js:256 | (ícone) | cartão tocável | ≈52 | R.md | xs/600 | textMuted | bgCard | 1 border | press 0,2* | ≈52×auto | não |
| screens/onboarding/BodyDataScreen.js:42 | Voltar | voltar | ≈28 | — | — | ícone | — | — | press 0,2* | ≈28×auto ⚠ | não |
| screens/onboarding/BodyDataScreen.js:61 | (ícone) | cartão de escolha | ≈52 | R.md | md/600 | black | primary | 1 primary | press 0,2* | ≈52×auto | não |
| screens/onboarding/BodyDataScreen.js:121 | (ícone) | info "i" | 44 | círculo 24 | ícone 14 | primary | — | 1,5 primary | press 0,2* | 44×44 | **sim** (InfoButton) |
| screens/onboarding/BodyDataScreen.js:135 | Continuar | primário | ≈55 | R.full | lg/700 | black | primary | — | press canContinue  | ≈55×auto | não |
| screens/onboarding/LevelSelectScreen.js:33 | Voltar | voltar | ≈28 | — | — | ícone | — | — | press 0,2* | ≈28×auto ⚠ | não |
| screens/onboarding/LevelSelectScreen.js:49 | (ícone) | cartão de escolha | ≈52 | R.lg | md/700 | white | #141200 | 1 primary | press 0,2* | ≈52×auto | não |
| screens/onboarding/LevelSelectScreen.js:77 | Criar meu perfil | primário | ≈55 | R.full | lg/700 | black | primary | — | press level ? 0.85 | ≈55×auto | não |
| screens/onboarding/ProfileSetupScreen.js:40 | Voltar | voltar | ≈28 | — | — | ícone | — | — | press 0,2* | ≈28×auto ⚠ | não |
| screens/onboarding/ProfileSetupScreen.js:84 | (ícone) | cartão de escolha | ≈52 | R.md | md/600 | white | #141200 | 1 primary | press 0,2* | ≈52×auto | não |
| screens/onboarding/ProfileSetupScreen.js:105 | Continuar | primário | ≈55 | R.full | lg/700 | black | primary | — | press canContinue  | ≈55×auto | não |
| screens/onboarding/WelcomeScreen.js:50 | Criar conta | primário | ≈55 | R.full | lg/700 | black | primary | — | press 0.85 | ≈55×auto | não |
| screens/onboarding/WelcomeScreen.js:53 | Entrar | contorno | ≈55 | R.full | lg/700 | primary | — | 1.5 primary | press 0.85 | ≈55×auto | não |
| screens/ProfileScreen.js:89 | (ícone) | texto/link | ≈20 | — | sm/600 | primary | — | — | press 0,2* | ≈20×auto ⚠ | não |
| screens/ProfileScreen.js:118 | (ícone) | info "i" | 44 | círculo 24 | ícone 14 | primary | — | 1,5 primary | press 0,2* | 44×44 | **sim** (InfoButton) |
| screens/ProfileScreen.js:130 | Adicionar peso e altura | cartão tocável | ≈84 | R.lg | xs/600 | textMuted | bgCard | 1 border | press 0,2* | ≈84×auto | não |
| screens/RemindersScreen.js:70 | Voltar | voltar | 44 (mín.) | R.full | — | ícone | bgCard | — | press 0,2* | 44×44 | não |
| screens/RemindersScreen.js:84 | Abrir os ajustes do celular | primário | 44 (mín.) | R.full | md/700 | black | primary | — | press 0,2* | 44×auto | não |
| screens/RemindersScreen.js:89 | Ativar lembretes | primário | 44 (mín.) | R.full | md/700 | black | primary | — | press 0,2* | 44×auto | não |
| screens/RemindersScreen.js:103 | Horário mais cedo | ícone | 44 (mín.) | R.full | — | ícone | bgCard | 1 border | press 0,2* | 44×44 | não |
| screens/RemindersScreen.js:107 | Horário mais tarde | ícone | 44 (mín.) | R.full | — | ícone | bgCard | 1 border | press 0,2* | 44×44 | não |
| screens/RemindersScreen.js:117 | d.full | chip | 44 (mín.) | R.md | sm/600 | black | primary | 1 primary | press 0,2* | 44×44 | não |
| screens/RemindersScreen.js:132 | Parar todos os lembretes | destrutivo | 44 (mín.) | — | md/700 sublinhado | error | — | — | press 0,2* | 44×auto | não |
| screens/SeriesTimelineScreen.js:20 | Voltar | voltar | 44 | R.full | — | ícone | bgCard | — | press 0,2* | 44×44 | não |
| screens/SmartPlanScreen.js:143 | (ícone) | info "i" | 44 | círculo 24 | ícone 14 | primary | — | 1,5 primary | press 0,2* | 44×44 | **sim** (InfoButton) |
| screens/SmartPlanScreen.js:205 | Ver meus treinos | primário | ≈55 | R.full | lg/700 | black | primary | — | press 0,2* | ≈55×auto | não |
| screens/SmartPlanScreen.js:220 | Voltar | voltar | ≈28 | — | — | ícone | — | — | press 0,2* | ≈28×auto ⚠ | não |
| screens/SmartPlanScreen.js:247 | (ícone) | info "i" | 44 | círculo 24 | ícone 14 | primary | — | 1,5 primary | press 0,2* | 44×44 | **sim** (InfoButton) |
| screens/SmartPlanScreen.js:253 | (ícone) | cartão de escolha | ≈52 | R.md | md/600 | white | #141200 | 1 primary | press 0,2* | ≈52×auto | não |
| screens/SmartPlanScreen.js:279 | (ícone) | primário | ≈55 | R.full | lg/700 | black | primary | — | press canNext ? 0. | ≈55×auto | não |
| screens/StoreDetailScreen.js:18 | Voltar | voltar | 44 (mín.) | — | — | ícone | — | — | press 0,2* | 44×44 | não |
| screens/StoreDetailScreen.js:90 | isWhatsApp ? Falar no WhatsApp | primário | 52 (mín.) | R.full | md/700 | black | primary | — | press 0.85 | 52×auto | não |
| screens/StoreScreen.js:22 | Anunciar em nosso marketplace | primário | 52 (mín.) | R.full | md/700 | black | primary | — | press 0.85 | 52×auto | não |
| screens/StoreScreen.js:49 | Voltar | voltar | 44 (mín.) | — | — | ícone | — | — | press 0,2* | 44×44 | não |
| screens/StoreScreen.js:61 | (ícone) | info "i" | 44 | círculo 24 | ícone 14 | primary | — | 1,5 primary | press 0,2* | 44×44 | **sim** (InfoButton) |
| screens/StoreScreen.js:73 | …, … … | chip | 44 (mín.) | R.full | sm/600 | black | primary | 1 primary | press 0,2* | 44×auto | não |
| screens/StoreScreen.js:97 | …. …… : } | cartão tocável | ≈20 | R.lg | xs/600 | textSecondary | bgCard | 1 border | press 0.85 | ≈20×auto | não |
| screens/WorkoutDetailScreen.js:28 | Voltar | voltar | ≈28 | — | — | ícone | — | — | press 0,2* | ≈28×auto ⚠ | não |
| screens/WorkoutDetailScreen.js:31 | Excluir treino | destrutivo | ≈20 | — | — | — | — | — | press 0,2* | ≈20×auto ⚠ | não |
| screens/WorkoutDetailScreen.js:48 | Iniciar treino | primário | ≈55 | R.full | lg/700 | black | primary | — | press 0,2* | ≈55×auto | não |
| screens/WorkoutDetailScreen.js:56 | (ícone) | cartão tocável | ≈52 | R.md | md/600 | white | bgCard | 1 border | press 0,2* | ≈52×auto | não |
| screens/WorkoutsScreen.js:59 | Ver evolução das séries | texto/link | 44 (mín.) | — | sm/700 sublinhado | primary | — | — | press 0,2* | 44×44 | não |
| screens/WorkoutsScreen.js:63 | Excluir a série de … | destrutivo | 44 (mín.) | — | sm/700 sublinhado | error // #FF6B6B | — | — | press 0,2* | 44×44 | não |
| screens/WorkoutsScreen.js:71 | Séries anteriores, …. … | cartão tocável | 44 (mín.) | R.md | md/600 | white | bgCard | 1 border | press 0,2* | 44×auto | não |
| screens/WorkoutsScreen.js:88 | Série de …, objetivo …, … trei | cartão tocável | 44 (mín.) | R.md | xs/600 | textMuted | bgCard | 1 border | press 0,2* | 44×auto | não |
| screens/WorkoutsScreen.js:112 | Criar treino | ícone | 38 | R.full | — | ícone | primary | — | press 0,2* | 44×44 (slop 3/3) | não |
| screens/WorkoutsScreen.js:128 | Personal Trainer IA | primário | ≈52 | R.full | md/700 | black | primary | — | press 0,2* | ≈52×auto | não |
| screens/WorkoutsScreen.js:136 | Gerador rápido | contorno | ≈36 | R.full | md/600 | primary | bgCard | 1 border | press 0,2* | ≈36×auto ⚠ | não |
| screens/WorkoutsScreen.js:144 | Criar manualmente | texto/link | ≈32 | — | sm/400 sublinhado | textMuted | — | — | press 0,2* | ≈32×auto ⚠ | não |
| screens/WorkoutsScreen.js:158 | Personal Trainer IA | cartão tocável | ≈52 | R.md | xs/700 | rgba(0,0,0,0.6) | primary | — | press 0,2* | ≈52×auto | não |
| screens/WorkoutsScreen.js:174 | Ver evolução das séries | contorno | 44 (mín.) | R.md | md/600 | primary | bgCard | 1 border | press 0,2* | 44×auto | não |
| screens/WorkoutsScreen.js:182 | IA | cartão tocável | ≈52 | R.lg | md/600 | white | bgCard | 1 border | press 0.8 | ≈52×auto | não |


### 1.5 O que o inventário mostra

1. **Primário reescrito:** 26 vezes localmente, contra 2 componentes compartilhados que juntos cobrem só as telas de conta, a série guiada e a Advertise. Mesma cor, três alturas mínimas (52, 48, 44), mais 11 sem altura declarada, dois raios e três tamanhos de fonte.
2. **Pressionado:** só 24 controles declaram `activeOpacity` (0,8 a 0,9). Os demais, inclusive vários primários, usam o padrão 0,2 do React Native, que escurece o botão a ponto de parecer desabilitado.
3. **Desabilitado:** `opacity` de 0,45 (`AuthParts`, Conectar), 0,4 (`FooterButton`, Advertise) e 0,35 (onboarding, SmartPlan), e o chat IA troca a cor do fundo. Contraste do texto preto sobre o amarelo já esmaecido: 3,50 (0,45), 2,99 (0,4), 2,53 (0,35); o texto branco do contorno com 0,45 dá 4,48. Estados desabilitados são isentos pela WCAG, mas hoje o botão desabilitado fica difícil de ler.
4. **Carregando:** só 3 botões trocam o texto por indicador (`PrimaryButton`, `ConfirmModal`, "Salvar meu plano" do chat). Os que fazem trabalho assíncrono na Advertise ("Abrindo…") e na série guiada ("Salvando…") só trocam o texto do rótulo.
5. **Alvos abaixo de 44 pt (estimados, marcados ⚠ na tabela):** voltar com `padding: SPACING.xs` (≈28, em 8 telas), o "X" do treino ativo (≈20), "Pular descanso" (≈16), "Salvar" de CreateWorkout e EditBodyData (≈19), editar do Perfil (≈20), lixeira do detalhe do treino (≈20), limpar busca (≈20), chips do chat IA, de CreateWorkout e de Exercícios (≈22 a ≈28), "Salvar meu plano" e "Ver meus treinos" do chat (≈36), "Gerador rápido" de Treinos (≈36) e "Criar manualmente" (≈32). O ponto do carrossel de banners tem 28 pt com `hitSlop` 14/6, o que dá 56 de altura mas só 40 de largura. Todas as estimativas precisam ser conferidas no aparelho.
6. **Amarelo:** é usado em 4 papéis ao mesmo tempo: ação principal (preenchido), contorno (borda e texto), link (texto sublinhado) e estado selecionado de chip. Em várias telas há mais de um destaque amarelo competindo (Início: faixa "Personal Trainer IA", "Ver marketplace" e "Gerador rápido"; Treinos: faixa, botão e link).
7. **Destrutivo:** quatro tratamentos diferentes (fundo vermelho com texto branco, contorno vermelho, texto vermelho sublinhado, ícone vermelho) e nenhum valor de cor próprio no tema (usa `COLORS.error`).

## 2. Taxonomia proposta

**4 variantes × 2 tamanhos.**

| variante | papel | aparência (resumo) |
|---|---|---|
| **primária** | a ação principal da tela (uma por tela) | fundo amarelo, texto preto, raio total |
| **secundária** | ação alternativa de peso igual a "Voltar" ou "Cancelar" | sem fundo, borda neutra, texto branco |
| **terciária** | ação leve: link, "Salvar" no cabeçalho, "Ver mais" | só texto, sublinhado, sem borda |
| **destrutiva** | apagar, sair, desconectar | fundo vermelho escuro com texto branco; na forma `quiet`, só texto vermelho |
| tamanho normal | ações de rodapé e de formulário | altura mínima 52 |
| tamanho compacto | ações dentro de cartões e de listas | altura mínima 44 |

### 2.1 Mapeamento dos botões atuais

| hoje | vira |
|---|---|
| os 26 primários locais + `PrimaryButton` + `FooterButton` + `ConfirmModal` sem `danger` | **primária** normal (os de altura 44 de Lembretes e EditNameRow: compacto; o "Salvar meu plano" do chat: compacto) |
| `SecondaryButton`, `ErrorBoundary` "Recomeçar", `Welcome` "Entrar", `FooterButton secondary`, `smartBtn` de Treinos, `evoBtn` de Treinos, `qAction` do Início (2), `storeBtn` do Início, `refreshBtn` da Academia agora, `EditNameRow` "Cancelar", `ExerciseStills` alternar | **secundária** (normal ou compacto) |
| `LinkButton`, os 18 links locais, "Salvar" de CreateWorkout e EditBodyData, `editBtn` do Perfil, `swapBtn` da série | **terciária** compacta |
| `ConfirmModal danger`, `dangerBtn` da Conectar | **destrutiva** (preenchida) |
| "Excluir série" de Treinos, "Parar todos os lembretes" | **destrutiva** com `quiet` |

### 2.2 O que não encaixa, e por quê

| controle | por que não vira `Button` |
|---|---|
| **Voltar** (18 cópias) e fechar/"X" | já têm o `ScreenHeader`; são ícones sem rótulo visível |
| **`InfoButton`** (19) | círculo de 24 pt com ícone, alvo 44×44; já é componente próprio |
| **Botões de ícone** ("+" de Treinos, enviar do chat, passos de horário e de copos, remover, limpar busca, mostrar senha, play do vídeo, lixeira do detalhe) | só ícone; proposta separada (`IconButton`, fora desta rodada) |
| **Chips, segmentos e dias da semana** (15) | controle de seleção, não de ação; estado selecionado em amarelo; precisam de um `Chip` próprio |
| **Cartões de escolha** (9) e **linhas de consentimento** | seleção com ícone e subtexto |
| **Cartões tocáveis** (23) | navegação em cartão (Início, Saúde, Marketplace, Perfil, séries) |
| **Faixas "Personal Trainer IA"** (Início e Treinos, amarelas, com ícone e seta) | hoje são cartão-CTA; ver decisão de produto no item 7 |
| **`SocialButton`** (Google, Apple) | cores de marca definidas pela Apple e pelo Google; mantém o componente próprio |
| **Botões de ação rápida da Saúde** (`QuickButton`) | cartão com ícone, rótulo e subtexto de estado |
| **Botão verde "Ver meus treinos"** (chat IA, rota alternativa) | usa `COLORS.success`, fora das 4 variantes |
| **Pílula amarela "Conectar Apple Saúde" / "Registrar"** dentro das linhas "sem dados" da Saúde | não é um controle separado (a linha inteira é o toque); parece primário compacto |
| **Barra de ação do treino ativo** ("Concluir", próximo exercício) | layout próprio com largura total e ícone dinâmico (item 6) |

## 3. API do componente `Button`

Arquivo futuro: `src/components/Button.js`. Só tokens (`COLORS`, `TYPE`, `SPACING`, `RADIUS`) e um novo grupo `BUTTON` em `theme.js` para as medidas (item 4). Sem `useNavigation`, sem contexto, para poder ser usado também no `ErrorBoundary` e nos modais.

```js
<Button
  label="Continuar"                  // obrigatório: texto visível e rótulo de acessibilidade padrão
  onPress={fn}
  variant="primary" | "secondary" | "tertiary" | "destructive"   // padrão "primary"
  size="normal" | "compact"          // padrão "normal" (52) ; "compact" = 44
  quiet                              // só para "destructive": texto vermelho, sem fundo
  iconLeft="arrow-back" iconRight="arrow-forward"   // nomes de Ionicons, 20 pt, cor do texto
  loading={false}                    // troca o rótulo por indicador, mantém a largura e desativa o toque
  disabled={false}
  fullWidth                          // padrão: true em normal, false em compact e tertiary
  accessibilityLabel="..."           // opcional; padrão = label
  accessibilityHint="..."            // opcional
  testID="..."
/>
```

- **Estados:** `accessibilityRole="button"`; `accessibilityState={{ disabled: disabled || loading, busy: loading }}` (como o `PrimaryButton` já faz). Enquanto `loading`, o `onPress` não dispara, o rótulo fica invisível mas ocupa o espaço (a largura não pula) e o indicador usa a cor do texto da variante.
- **Alvo de toque:** `minHeight` do tamanho (52 ou 44) e `minWidth` de 44; botões só com texto terciário ficam com `minHeight` 44 e `hitSlop` zero (o próprio alvo já cumpre). Nunca menos de 44×44.
- **Pressionado:** `Pressable` com função de estilo, **mudança de cor** e não de opacidade (item 4); o padrão de 0,2 deixa de valer.
- **Desabilitado:** cores próprias (item 4), sem `opacity`.
- **Ícones:** à esquerda ou à direita, `gap` de `SPACING.sm`; botão só de ícone **não** é `Button` (fica para `IconButton`).
- **Texto:** `TYPE.bodyLarge` (18/600) no normal e `TYPE.body` (15/…) no compacto; uma linha com `numberOfLines={2}` e centralizado, para rótulos longos como "Reenviar e-mail de verificação" não estourarem.

### 3.1 Retrocompatibilidade (ponto de partida: `PrimaryButton` existente)

1. `Button` nasce **ao lado** dos componentes antigos, sem substituí-los (lote 0).
2. `PrimaryButton`, `SecondaryButton` e `LinkButton` (em `AuthParts.js`) viram **invólucros finos**: `PrimaryButton = (p) => <Button variant="primary" {...p} />`, com as mesmas props de hoje (`label`, `onPress`, `disabled`, `loading`, `testID`; `SecondaryButton` também `icon`). Nenhuma tela de conta muda. `FooterButton` (`GuidedParts`) vira `Button` dentro da barra com borda no topo, mantendo `label`, `onPress`, `disabled`, `icon` e `secondary`.
3. As telas migram do componente local para `Button` em lotes (item 5); só no fim, quando ninguém mais usar os invólucros, eles podem ser removidos (ou ficam como apelidos).
4. Testes que leem o código-fonte de `AuthParts`/`GuidedParts` precisam do ajuste mínimo (listado no lote).

## 4. Cores, contraste e estados

### 4.1 Regra do amarelo

**O amarelo (`#fed205`) aparece como fundo só na variante primária: a ação principal da tela.** Secundária e terciária ficam neutras (branco e `textSecondary`), a destrutiva é vermelha. Amarelo **sem ser botão** continua válido para estado selecionado (chip, opção marcada), ícones e contornos de cartão, que não são ações. Consequência a decidir pelo produto: os contornos amarelos de hoje (`ErrorBoundary`, Início, Treinos, Academia agora, alternar fotos) passam a contorno neutro, e os links amarelos sublinhados ("Ver evolução…", "Esconder o motivo") passam a texto neutro.

### 4.2 Pares texto/fundo (calculados)

| variante e estado | texto | fundo | razão | observação |
|---|---|---|---|---|
| primária, normal | preto `#000000` | amarelo `#fed205` | **14,43:1** | igual a hoje |
| primária, pressionada | preto | amarelo escuro `#D9B204` (novo) | **10,32:1** | cor muda, não a opacidade |
| primária, desabilitada | `textMuted` `#8E8E93` | `bgCardAlt` `#1C1C1C` | **5,23:1** | hoje: 3,50 a 2,53:1 |
| secundária, normal | branco `#FFFFFF` | `bg` `#0A0A0A` | **19,80:1** | sobre `bgCard`: 18,42:1 |
| secundária, borda | `textSecondary` `#B0B0B5` | `bg` | **9,17:1** | borda de controle exige 3:1 |
| secundária, pressionada | branco | `bgCardAlt` | **17,04:1** | fundo escurece/clareia |
| secundária, desabilitada | `textMuted` | `bg` | **6,07:1** | borda `border`, sem exigência |
| terciária, normal | `textSecondary` | `bg` / `bgCard` / `bgCardAlt` | **9,17 / 8,53 / 7,89:1** | sublinhado mantém a pista de toque |
| terciária, pressionada | branco | `bg` | **19,80:1** | |
| terciária, desabilitada | `textMuted` | `bg` | **6,07:1** | |
| destrutiva, normal | branco | vermelho escuro `#DC2626` (novo) | **4,83:1** | hoje: `#ef4444` com 3,76:1 |
| destrutiva, pressionada | branco | `#B91C1C` (novo) | **6,47:1** | |
| destrutiva, desabilitada | `textMuted` | `bgCardAlt` | **5,23:1** | igual ao primário desabilitado |
| destrutiva `quiet` (texto) | `#ef4444` (já no tema) | `bg` / `bgCard` / `bgCardAlt` | **5,26 / 4,90 / 4,53:1** | passa nas três superfícies; sem cor nova |

Para referência, outros tons de vermelho testados com texto branco: `#D32F2F` 4,98:1; `#C62828` 5,62:1; `#E03131` 4,51:1 (no limite). Foi escolhido `#DC2626` por ser o menor desvio visual em relação ao `#ef4444` atual com folga (4,83). Contra o fundo do app, `#DC2626` tem 4,10:1 (a borda do botão se vê), mas só 3,53:1 contra `bgCardAlt`; botões destrutivos preenchidos devem ficar sobre `bg` ou `bgCard` (3,81:1).

### 4.3 Tokens novos necessários (só definição, no lote 0)

`COLORS.primaryPressed` `#D9B204`; `COLORS.danger` `#DC2626` e `COLORS.dangerPressed` `#B91C1C`; e um grupo `BUTTON` com as alturas (`normal: 52`, `compact: 44`, derivado de `HEALTH_UI.minTouch`) e o raio (`RADIUS.full`). `COLORS.error` (`#ef4444`) continua como cor de texto e de aviso. Um teste de contraste (como o `tokens.test.ts`) trava os pares da tabela acima em ≥ 4,5:1.

### 4.4 Estados

- **Pressionado:** cor própria (tabela); `activeOpacity` deixa de ser usado. O padrão 0,2 do React Native não se aplica ao `Pressable`.
- **Desabilitado:** fundo `bgCardAlt` e texto `textMuted` (primário e destrutivo) ou texto `textMuted` com borda `border` (secundário), sem `opacity`; sempre com `accessibilityState.disabled`. Leitura continua ≥ 4,5:1, melhor que os 2,5 a 3,5:1 de hoje.
- **Carregando:** indicador na cor do texto da variante e `busy`.
- **Foco (teclado externo/web):** fora do escopo.

## 5. Plano de migração (lotes pequenos)

Cada lote é um commit; verificação padrão em todos: `npm run test:all` (com `C:\Program Files\Git\bin` no PATH), `npx expo export --platform android` e `--platform ios`, e conferência no aparelho do que está listado.

| lote | conteúdo | verificação específica |
|---|---|---|
| **0** | tokens novos (item 4.3), `Button` e testes (render, `onPress`, alvo ≥ 44, rótulos e estados, sem `useNavigation`, só tokens, contraste ≥ 4,5:1 de todos os pares do item 4.2). **Nenhuma tela migrada** | testes novos no estilo de `screenheader.test.ts` e `tokens.test.ts` |
| **1** | **`ConfirmModal`** (`AuthParts.js:255-280`): confirmar vira `Button` (`destructive` quando `danger`, `primary` caso contrário) e "Cancelar" vira `Button tertiary`. Corrige o 3,76:1. Usado por sair da conta, excluir conta, desconectar saúde e apagar dados | testes de conta e saúde que exercitam o modal; conferir os 3 usos (`danger` e não `danger`) |
| **2** | **Componentes compartilhados:** `PrimaryButton`, `SecondaryButton`, `LinkButton` e `FooterButton` passam a usar `Button` por dentro, sem mudar as telas. Cobre as 4 telas de conta, `AccountCard`, `Advertise` e a série guiada | testes que leem `AuthParts.js` e `GuidedParts.js` (ajuste mínimo); smoke das telas de conta |
| **3** | **Treinos:** `WorkoutsScreen` (`aiBtn`, `smartBtn`, `manualBtn`, `linkBtn`, `evoBtn`, "Excluir série" `quiet`), `WorkoutDetailScreen` (`startBtn`) | `historico-series`, `integracao-acessibilidade`; "Excluir série" ainda só chama `deleteSeries` dentro da confirmação |
| **4** | **Saúde:** `HealthCategoryScreen` (`okBtn` ×2), `HealthConnectScreen` (`okBtn` ×2, `dangerBtn`, links), `HealthParts` ("Por que este número?", "Esconder o motivo") | testes de Saúde (`healthui`, `healthconnect*`); `connect-button` mantém `testID` |
| **5** | **Início, Perfil e entrada:** `HomeScreen` (`storeBtn`, `qAction` ×2), `GymNowScreen` (`refreshBtn`), `ProfileScreen` (`editBtn`), `AccountCard` (`deleteLink`), `WelcomeScreen` (2), `AboutCard`, `LegalLinks`, `EditNameRow` | `demostreak`, `infohelp`, testes de conta |
| **6** | **Fluxos e telas restantes:** onboarding (3), `SmartPlanScreen` (2), `GuidedPlanScreen` (`okBtn` ×2), `RemindersScreen` (2 + link), `AdvertiseScreen` (local), `StoreDetailScreen`, `StoreScreen`, `InfoSheet` (Fechar), `ErrorBoundary` (2), `ExerciseStills`, `CreateWorkout`/`EditBodyData` ("Salvar") | o `ErrorBoundary` não pode depender de contexto (o `Button` não depende); testes de onboarding |
| **7** (opcional) | `IconButton` e `Chip` próprios (fora do `Button`), alvo de 44 pt nos 8 botões "voltar" que ainda faltam, e remoção dos invólucros antigos | só depois de aprovados os lotes anteriores |

Teste de varredura a acrescentar a partir do lote 3: nenhum arquivo migrado define `backgroundColor: COLORS.primary` num estilo de botão (a regra "amarelo só no primário").

## 6. Riscos e o que NÃO será migrado

- **Barra de ação do treino ativo** (`ActiveWorkoutScreen.js:96`, `:155`): "Concluir" e o botão de próximo exercício têm largura total, ícone dinâmico (`currentIdx`) e posição fixa na parte inferior; ficam como estão por enquanto. Candidatos a `Button` `fullWidth` depois de provar o componente nas telas simples.
- **Botão de enviar do chat IA** (`AIPersonalTrainerScreen.js:645`, círculo de 44 pt) e **confirmar chips** (`:622`, 32 pt + `hitSlop` 6): são botões de ícone; ficam para o `IconButton`.
- **"+" de Treinos** (círculo amarelo de 38 pt dentro da coluna de 44 do `ScreenHeader`): continua como está.
- **Botão flutuante:** pela leitura do código, **o app não tem botão flutuante** (FAB). O mais próximo é o controle de play do vídeo sobreposto (`ExerciseVideoPlayer.js:92`, círculo amarelo de 44 pt), que fica de fora.
- **`SocialButton`:** segue como componente próprio (cores de marca).
- **Rota alternativa do chat IA** (`AIPersonalTrainerChat`): "Salvar meu plano" e "Ver meus treinos" (verde) só migram se a rota continuar viva; não são prioridade.
- **Risco de teste:** vários testes leem o código-fonte (`authui`, `integracao-acessibilidade`, `historico-series`, `healthui`, `infohelp`) e afirmam sobre `PrimaryButton`, `styles.okBtn`, rótulos e `testID`. Cada lote ajusta o mínimo e lista o que mudou.
- **Risco visual:** padronizar alturas muda o desenho (hoje 11 primários têm cerca de 52 a 55 pt só pelo `padding`; o "Salvar meu plano" ≈ 36 pt crescerá para 44). Passar contornos amarelos a neutros muda a identidade das telas Início e Treinos.
- **Risco de comportamento:** `loading` em botões que hoje trocam o texto ("Abrindo…", "Salvando…") passa a bloquear o toque e a trocar por indicador; conferir cada caso.
- **Trocar `TouchableOpacity` por `Pressable`:** a área de toque e o ripple do Android mudam um pouco; sem efeito colateral esperado, mas só o aparelho confirma.

## 7. Itens não verificáveis e decisões de produto

### 7.1 Não verificável sem o aparelho

- Todas as alturas marcadas "≈" (estimadas) e os alvos "⚠"; as medidas reais precisam do aparelho.
- Aparência real do amarelo pressionado `#D9B204`, do vermelho `#DC2626` e dos estados desabilitados (se `bgCardAlt` com texto `textMuted` ainda parece "desligado" ao sol).
- Se o feedback por cor (em vez de opacidade) é perceptível sem olhar fixo para o botão.
- Texto grande (Dynamic Type e escala de fonte do Android) em botões com ícone e rótulo longo, e o salto de largura ao entrar em `loading`.
- Leitor de tela (VoiceOver, TalkBack): anúncio de "desabilitado" e "ocupado".
- Cores do botão Apple/Google (definidas pelos provedores; não entram nas 4 variantes).
- Comportamento do ripple do Android e da área de toque com `Pressable`.
- O contraste do vermelho sobre o fundo real depois do `StatusBar`/`edge-to-edge` (não afeta o botão, mas o modal).

### 7.2 Decisões de produto (apenas listadas, sem decidir)

1. **"Conectar Apple Saúde" aparece em três lugares na Saúde:** a pílula amarela em cada categoria sem dados (`healthView.emptyAction`, linhas de `NoDataGroup`, uma por categoria), o botão "Conectar" das ações rápidas (`healthView.connectButtonState`) e o botão "Conectar ao Apple Saúde" da tela Conectar. A pílula se repete uma vez por categoria sem dados.
2. **"Personal Trainer IA" duplicado:** faixa amarela no Início (`HomeScreen.js:140`), botão no estado vazio de Treinos (`WorkoutsScreen.js:128`) e faixa amarela na lista de Treinos (`:158`); mais "Gerador rápido" e "Criar manualmente" repetidos no Início (`:160`, `:167`) e em Treinos (`:136`, `:144`).
3. **"Ver evolução das séries" duas vezes em Treinos** (`WorkoutsScreen.js:59` como link e `:174` como botão com contorno).
4. **Quantos destaques amarelos por tela:** o Início tem faixa amarela, "Ver marketplace" com contorno amarelo e "Gerador rápido" com texto amarelo; a regra "só a ação principal" implica escolher qual é a principal.
5. **Contornos e links amarelos passam a neutros?** Hoje distinguem "ação" de "texto" pela cor; com a regra do item 4.1 a pista passa a ser só o contorno e o sublinhado.
6. **"Salvar" no cabeçalho** (CreateWorkout, EditBodyData) como terciário em texto (hoje amarelo, sem caixa) ou como primário compacto.
7. **Faixas "Personal Trainer IA":** continuam cartão ou viram botão primário.
8. **"Excluir minha conta"** hoje é texto cinza sublinhado (não vermelho) e "Sair da conta" é contorno; como entram nas variantes.
9. **Botão verde "Ver meus treinos"** do chat IA: vira primário ou some junto com a rota.
10. **Estado selecionado dos chips:** continua amarelo (é estado, não ação) ou muda.
11. **Quando criar `IconButton` e `Chip`:** na mesma rodada ou depois.
