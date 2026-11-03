# Proposta: uso do amarelo da marca (`visual-cor`)

**Status: só proposta.** Nenhum código de produção foi escrito ou alterado. Base: leitura de todo o `src/` e do `App.js` na branch `visual-botoes` (que contém o `Button` e o `ConfirmModal` migrado; os invólucros `PrimaryButton` e afins ainda estão na forma antiga, porque o lote 2 vive em `visual-botoes-lote2`). Contrastes calculados pela fórmula WCAG 2.1 (4,5:1 para texto normal, 3:1 para ícone e borda de controle).

**Direção aprovada:** amarelo só para a ação principal da tela e para o item selecionado/ativo; o resto em branco e cinza; vermelho e laranja só para erro real.

## 0. Resumo

- Há **299 ocorrências de amarelo** em **269 linhas** de **49 arquivos**: `COLORS.primary` (258), tons escuros de âmbar usados como "tinta" de fundo e de borda (`#1A1700` 26 vezes, `#141200` 8, `#3A2A00` 3, `#2A2400` 2 e `#1A1200` 1, este o fundo de "Intermediário", cor de aviso), e um texto âmbar (`#C8A800`, 1). Não há `#FFD400` nem o `#fed205` literal no código; `primaryPressed` só existe no tema e no `Button`.
- Pela regra proposta (item 2): **94 ocorrências ficam amarelas** (botão primário, item selecionado ou ativo, aba ativa, cursor), **149 viram branco, cinza ou superfície neutra** e **56 são casos de fronteira** que dependem de decisão (números em destaque, barras e indicadores, faixa "Personal Trainer IA", selos "Dados de exemplo" e "IA", cor por faixa de saúde).
- Os papéis que mais mudam são: ícones decorativos (36), selos e etiquetas (25, dos quais 19 mudam), botões de contorno (15), fundos tintados de ícone (12) e de cartões de dica (7), títulos (13, dos quais 11 mudam), links (11), ícones de ação (11), setas (9) e itens selecionados com **texto ou fundo tintado** em amarelo (7).
- Migração em 10 lotes de um papel cada, do que mais muda ao que menos muda; os casos de fronteira ficam para depois das decisões do item 4.

## 1. Inventário

### 1.1 Como foi levantado

- Varredura de `src/**/*.js` e `App.js` (exceto `utils/theme.js`, onde as cores são definidas) por: `COLORS.primary`, `COLORS.primaryPressed`, qualquer cor `#rrggbb` ou `rgba()` de matiz amarelo (38° a 62°, saturação > 0,5) e a chave do estilo em que cada uma aparece. Resultado: 269 linhas, 299 ocorrências. As cores de `theme.js` (`COLORS.primary`, `primaryPressed`, `BUTTON`, `SHADOWS.card.shadowColor`) são a definição, não uso. `SHADOWS.card` não é importado por nenhuma tela. `app.json` e os plugins não contêm amarelo.
- **Papel** foi atribuído por regra, a partir do nome do estilo, da propriedade (fundo, borda, texto, ícone) e do contexto (por exemplo `chipActive`, `streakNum`, `tipCard`). É uma classificação automática revisada por amostragem: linhas de fronteira podem ter mais de uma leitura (o doc as marca "fronteira"). A coluna **decisão** aplica a regra do item 2: **mantém** (continua amarelo), **muda** (vai para branco, cinza ou neutro) ou **fronteira** (sem decisão; ver item 4).
- Telas que compartilham componentes aparecem pela tela onde o componente é usado (por exemplo `CategoryCard` e `HealthParts` em "Saúde"). `InfoButton`/`InfoSheet` ("i") aparecem como "Ajuda i (transversal)", usados em 12 arquivos.
- O logo (`assets/logo.png`), o ícone do app e a tela de abertura são imagens e **não** estão neste inventário.

### 1.2 Contagem por papel

| papel | ocorrências | mantém | muda | fronteira |
|---|---|---|---|---|
| item selecionado / destaque (fundo ou borda) | 61 | 54 | 7 | 0 |
| ícone decorativo | 36 | 0 | 36 | 0 |
| botão primário (fundo) | 25 | 25 | 0 | 0 |
| selo/badge/etiqueta | 25 | 0 | 19 | 6 |
| barra de gráfico/progresso/indicador | 20 | 0 | 0 | 20 |
| número em destaque | 19 | 0 | 0 | 19 |
| botão contorno (borda/texto) | 15 | 0 | 15 | 0 |
| título/rótulo em amarelo | 13 | 0 | 11 | 2 |
| fundo tintado de ícone/número | 12 | 0 | 12 | 0 |
| texto de link / ação em texto | 11 | 0 | 11 | 0 |
| ícone de ação (dentro de botão ou linha tocável) | 11 | 0 | 11 | 0 |
| seta (chevron) | 9 | 0 | 9 | 0 |
| cartão tintado (dica/aviso) | 7 | 0 | 7 | 0 |
| cor por estado/faixa | 5 | 0 | 0 | 5 |
| botão de ícone (fundo amarelo) | 5 | 4 | 1 | 0 |
| ícone de estado (selecionado/ativo) | 5 | 5 | 0 | 0 |
| indicador de carregamento | 5 | 0 | 5 | 0 |
| texto corrido | 4 | 0 | 4 | 0 |
| cursor e seleção de texto | 3 | 3 | 0 | 0 |
| aba ativa / tema de navegação | 3 | 3 | 0 | 0 |
| borda de destaque | 2 | 0 | 0 | 2 |
| faixa Personal Trainer IA (amarelo cheio) | 2 | 0 | 0 | 2 |
| botão "i" | 1 | 0 | 1 | 0 |
| **Total** | **299** | **94** | **149** | **56** |

### 1.3 Contagem por tela

| tela | ocorrências | mantém | muda | fronteira |
|---|---|---|---|---|
| Série guiada | 26 | 12 | 11 | 3 |
| Perfil | 25 | 5 | 16 | 4 |
| Início | 25 | 0 | 20 | 5 |
| Onboarding | 24 | 16 | 3 | 5 |
| Série inteligente | 20 | 6 | 10 | 4 |
| Detalhe do exercício | 17 | 1 | 13 | 3 |
| Saúde | 17 | 2 | 13 | 2 |
| Marketplace | 15 | 3 | 6 | 6 |
| Chat Personal Trainer IA | 15 | 5 | 9 | 1 |
| Treino ativo | 12 | 2 | 4 | 6 |
| Novo treino | 11 | 7 | 4 | 0 |
| Treinos | 11 | 2 | 6 | 3 |
| Ajuda "i" (transversal) | 9 | 3 | 5 | 1 |
| Contas (peças) | 7 | 4 | 1 | 2 |
| Saúde (conectar) | 7 | 3 | 3 | 1 |
| Dados físicos | 6 | 4 | 2 | 0 |
| Exercícios | 6 | 2 | 3 | 1 |
| Saúde (detalhe) | 6 | 6 | 0 | 0 |
| Recuperação de erro | 5 | 1 | 4 | 0 |
| Boas-vindas | 5 | 1 | 4 | 0 |
| Detalhe do treino | 5 | 1 | 3 | 1 |
| Saúde (gráfico) | 4 | 0 | 0 | 4 |
| Academia agora | 4 | 0 | 4 | 0 |
| Marketplace (detalhe) | 4 | 1 | 2 | 1 |
| Navegação | 3 | 3 | 0 | 0 |
| Lembretes | 3 | 3 | 0 | 0 |
| Início / Academia agora | 2 | 0 | 0 | 2 |
| Anunciar | 2 | 1 | 1 | 0 |
| Exercícios (ícone) | 1 | 0 | 1 | 0 |
| Contas / Perfil | 1 | 0 | 1 | 0 |
| Evolução das séries | 1 | 0 | 0 | 1 |

### 1.4 Lista completa (uma ocorrência por linha de código)

Coluna "propriedade": o que recebe a cor. Cores `#rrggbb` aparecem como foram escritas.

| arquivo:linha | tela | papel | propriedade | cor | decisão |
|---|---|---|---|---|---|
| components/AboutCard.js:58 | Perfil | texto de link / ação em texto | texto | COLORS.primary | MUDA |
| components/auth/AuthParts.js:67 | Contas (peças) | cursor e seleção de texto | cursor | COLORS.primary | MANTÉM |
| components/auth/AuthParts.js:172 | Contas (peças) | cor por estado/faixa | texto | COLORS.primary | FRONTEIRA |
| components/auth/AuthParts.js:230 | Contas (peças) | cor por estado/faixa | cor por estado | COLORS.primary | FRONTEIRA |
| components/auth/AuthParts.js:301 | Contas (peças) | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| components/auth/AuthParts.js:309 | Contas (peças) | texto de link / ação em texto | texto | COLORS.primary | MUDA |
| components/auth/AuthParts.js:314 | Contas (peças) | item selecionado / destaque (fundo ou borda) | fundo | COLORS.primary COLORS.primary | MANTÉM |
| components/EditNameRow.js:26 | Perfil | ícone de ação (dentro de botão ou linha tocável) | cor do ícone | COLORS.primary | MUDA |
| components/EditNameRow.js:45 | Perfil | cursor e seleção de texto | cursor | COLORS.primary | MANTÉM |
| components/EditNameRow.js:74 | Perfil | botão primário (fundo) | fundo | COLORS.primary COLORS.primary | MANTÉM |
| components/ErrorBoundary.js:106 | Recuperação de erro | selo/badge/etiqueta | borda | COLORS.primary | MUDA |
| components/ErrorBoundary.js:107 | Recuperação de erro | título/rótulo em amarelo | texto | COLORS.primary | MUDA |
| components/ErrorBoundary.js:110 | Recuperação de erro | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| components/ErrorBoundary.js:112 | Recuperação de erro | botão contorno (borda/texto) | borda | COLORS.primary | MUDA |
| components/ErrorBoundary.js:113 | Recuperação de erro | botão contorno (borda/texto) | texto | COLORS.primary | MUDA |
| components/ExerciseIcon.js:8 | Exercícios (ícone) | ícone decorativo | texto | COLORS.primary | MUDA |
| components/ExerciseMedia.js:59 | Detalhe do exercício | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| components/ExerciseMedia.js:76 | Detalhe do exercício | selo/badge/etiqueta | fundo | COLORS.primary | FRONTEIRA |
| components/ExerciseStills.js:84 | Detalhe do exercício | botão contorno (borda/texto) | cor | COLORS.primary | MUDA |
| components/ExerciseStills.js:85 | Detalhe do exercício | botão contorno (borda/texto) | texto | COLORS.primary | MUDA |
| components/ExerciseVideoPlayer.js:87 | Detalhe do exercício | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| components/ExerciseVideoPlayer.js:109 | Detalhe do exercício | botão de ícone (fundo amarelo) | cor | COLORS.primary | MANTÉM |
| components/guided/GuidedParts.js:50 | Série guiada | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| components/guided/GuidedParts.js:68 | Série guiada | ícone de estado (selecionado/ativo) | cor do ícone | COLORS.primary | MANTÉM |
| components/guided/GuidedParts.js:76 | Série guiada | ícone de estado (selecionado/ativo) | texto | COLORS.primary | MANTÉM |
| components/guided/GuidedParts.js:110 | Série guiada | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| components/guided/GuidedParts.js:148 | Série guiada | ícone de estado (selecionado/ativo) | texto | COLORS.primary | MANTÉM |
| components/guided/GuidedParts.js:165 | Série guiada | barra de gráfico/progresso/indicador | fundo | COLORS.primary | FRONTEIRA |
| components/guided/GuidedParts.js:166 | Série guiada | selo/badge/etiqueta | fundo | #1A1700 | MUDA |
| components/guided/GuidedParts.js:167 | Série guiada | selo/badge/etiqueta | texto | COLORS.primary | MUDA |
| components/guided/GuidedParts.js:168 | Série guiada | selo/badge/etiqueta | fundo | COLORS.primary | FRONTEIRA |
| components/guided/GuidedParts.js:170 | Série guiada | item selecionado / destaque (fundo ou borda) | borda | COLORS.primary #1A1700 | MANTÉM |
| components/guided/GuidedParts.js:175 | Série guiada | item selecionado / destaque (fundo ou borda) | fundo | COLORS.primary COLORS.primary | MANTÉM |
| components/guided/GuidedParts.js:179 | Série guiada | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| components/guided/GuidedParts.js:180 | Série guiada | botão contorno (borda/texto) | borda | COLORS.primary | MUDA |
| components/guided/GuidedParts.js:183 | Série guiada | botão contorno (borda/texto) | texto | COLORS.primary | MUDA |
| components/guided/SeriesCard.js:71 | Série guiada | ícone de ação (dentro de botão ou linha tocável) | cor do ícone | COLORS.primary | MUDA |
| components/guided/SeriesCard.js:108 | Série guiada | barra de gráfico/progresso/indicador | fundo | COLORS.primary | FRONTEIRA |
| components/guided/SeriesCard.js:120 | Série guiada | texto de link / ação em texto | texto | COLORS.primary | MUDA |
| components/health/CategoryCard.js:33 | Saúde | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| components/health/CategoryCard.js:64 | Saúde | fundo tintado de ícone/número | fundo | #1A1700 | MUDA |
| components/health/HealthParts.js:11 | Saúde | cor por estado/faixa | cor por estado | COLORS.primary | FRONTEIRA |
| components/health/HealthParts.js:78 | Saúde | ícone de estado (selecionado/ativo) | cor do ícone | COLORS.primary | MANTÉM |
| components/health/HealthParts.js:121 | Saúde | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| components/health/HealthParts.js:132 | Saúde | seta (chevron) | cor do ícone | COLORS.primary | MUDA |
| components/health/HealthParts.js:155 | Saúde | seta (chevron) | cor do ícone | COLORS.primary | MUDA |
| components/health/HealthParts.js:167 | Saúde | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| components/health/HealthParts.js:189 | Saúde | seta (chevron) | cor do ícone | COLORS.primary | MUDA |
| components/health/HealthParts.js:209 | Saúde | ícone de ação (dentro de botão ou linha tocável) | cor do ícone | COLORS.primary | MUDA |
| components/health/HealthParts.js:218 | Saúde | seta (chevron) | cor do ícone | COLORS.primary | MUDA |
| components/health/HealthParts.js:227 | Saúde | número em destaque | texto | COLORS.primary | FRONTEIRA |
| components/health/HealthParts.js:269 | Saúde | texto corrido | texto | COLORS.primary | MUDA |
| components/health/HealthParts.js:271 | Saúde | texto de link / ação em texto | texto | COLORS.primary | MUDA |
| components/health/HealthParts.js:275 | Saúde | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| components/health/ProfileHealthCard.js:37 | Perfil | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| components/health/ProfileHealthCard.js:39 | Perfil | seta (chevron) | cor do ícone | COLORS.primary | MUDA |
| components/health/ProfileHealthCard.js:68 | Perfil | número em destaque | texto | COLORS.primary | FRONTEIRA |
| components/health/ProfileHealthCard.js:70 | Perfil | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| components/health/TrendBars.js:13 | Saúde (gráfico) | barra de gráfico/progresso/indicador | texto | COLORS.primary | FRONTEIRA |
| components/health/WeightChart.js:58 | Saúde (gráfico) | barra de gráfico/progresso/indicador | fundo | COLORS.primary | FRONTEIRA |
| components/health/WeightChart.js:59 | Saúde (gráfico) | barra de gráfico/progresso/indicador | borda | COLORS.primary | FRONTEIRA |
| components/health/WeightChart.js:60 | Saúde (gráfico) | barra de gráfico/progresso/indicador | fundo | COLORS.primary | FRONTEIRA |
| components/InfoButton.js:11 | Ajuda "i" (transversal) | botão "i" | texto | COLORS.primary | MUDA |
| components/InfoSheet.js:142 | Ajuda "i" (transversal) | título/rótulo em amarelo | texto | COLORS.primary | MUDA |
| components/InfoSheet.js:146 | Ajuda "i" (transversal) | texto corrido | texto | COLORS.primary | MUDA |
| components/InfoSheet.js:149 | Ajuda "i" (transversal) | item selecionado / destaque (fundo ou borda) | fundo | #1A1700 | MUDA |
| components/InfoSheet.js:150 | Ajuda "i" (transversal) | número em destaque | texto | COLORS.primary | FRONTEIRA |
| components/InfoSheet.js:162 | Ajuda "i" (transversal) | item selecionado / destaque (fundo ou borda) | borda | COLORS.primary #1A1700 | MANTÉM |
| components/InfoSheet.js:168 | Ajuda "i" (transversal) | título/rótulo em amarelo | texto | COLORS.primary | MUDA |
| components/InfoSheet.js:169 | Ajuda "i" (transversal) | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| components/LegalLinks.js:44 | Contas / Perfil | texto de link / ação em texto | texto | COLORS.primary | MUDA |
| components/MarketplaceBanners.js:109 | Marketplace | selo/badge/etiqueta | borda | COLORS.primary | FRONTEIRA |
| components/MarketplaceBanners.js:110 | Marketplace | título/rótulo em amarelo | texto | COLORS.primary | FRONTEIRA |
| components/MarketplaceBanners.js:117 | Marketplace | barra de gráfico/progresso/indicador | fundo | COLORS.primary | FRONTEIRA |
| components/MarketplaceImage.js:27 | Marketplace | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| components/MarketplaceImage.js:42 | Marketplace | selo/badge/etiqueta | borda | COLORS.primary | FRONTEIRA |
| components/MarketplaceImage.js:43 | Marketplace | título/rótulo em amarelo | texto | COLORS.primary | FRONTEIRA |
| components/OccupancyCard.js:36 | Início / Academia agora | cor por estado/faixa | texto | COLORS.primary | FRONTEIRA |
| components/OccupancyCard.js:75 | Início / Academia agora | selo/badge/etiqueta | fundo | COLORS.primary | FRONTEIRA |
| components/RemindersCard.js:12 | Perfil | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| navigation/MainNavigator.js:110 | Navegação | aba ativa / tema de navegação | tema | COLORS.primary | MANTÉM |
| navigation/navTheme.js:10 | Navegação | aba ativa / tema de navegação | tema | COLORS.primary | MANTÉM |
| navigation/navTheme.js:15 | Navegação | aba ativa / tema de navegação | tema | COLORS.primary | MANTÉM |
| screens/ActiveWorkoutScreen.js:180 | Treino ativo | barra de gráfico/progresso/indicador | fundo | COLORS.primary | FRONTEIRA |
| screens/ActiveWorkoutScreen.js:183 | Treino ativo | fundo tintado de ícone/número | fundo | #1A1700 | MUDA |
| screens/ActiveWorkoutScreen.js:188 | Treino ativo | barra de gráfico/progresso/indicador | fundo | COLORS.primary | FRONTEIRA |
| screens/ActiveWorkoutScreen.js:189 | Treino ativo | barra de gráfico/progresso/indicador | borda | COLORS.primary | FRONTEIRA |
| screens/ActiveWorkoutScreen.js:192 | Treino ativo | número em destaque | texto | COLORS.primary | FRONTEIRA |
| screens/ActiveWorkoutScreen.js:195 | Treino ativo | cartão tintado (dica/aviso) | fundo | #141200 #2A2400 | MUDA |
| screens/ActiveWorkoutScreen.js:197 | Treino ativo | número em destaque | texto | COLORS.primary | FRONTEIRA |
| screens/ActiveWorkoutScreen.js:199 | Treino ativo | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| screens/ActiveWorkoutScreen.js:205 | Treino ativo | fundo tintado de ícone/número | fundo | COLORS.primary | MUDA |
| screens/ActiveWorkoutScreen.js:210 | Treino ativo | número em destaque | texto | COLORS.primary | FRONTEIRA |
| screens/ActiveWorkoutScreen.js:212 | Treino ativo | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| screens/AdvertiseScreen.js:307 | Anunciar | título/rótulo em amarelo | texto | COLORS.primary | MUDA |
| screens/AdvertiseScreen.js:318 | Anunciar | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| screens/AIPersonalTrainerScreen.js:519 | Chat Personal Trainer IA | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/AIPersonalTrainerScreen.js:590 | Chat Personal Trainer IA | indicador de carregamento | cor do indicador | COLORS.primary | MUDA |
| screens/AIPersonalTrainerScreen.js:601 | Chat Personal Trainer IA | indicador de carregamento | cor do indicador | COLORS.primary | MUDA |
| screens/AIPersonalTrainerScreen.js:672 | Chat Personal Trainer IA | botão de ícone (fundo amarelo) | fundo | COLORS.primary | MUDA |
| screens/AIPersonalTrainerScreen.js:675 | Chat Personal Trainer IA | cartão tintado (dica/aviso) | fundo | #1A1700 #3A2A00 | MUDA |
| screens/AIPersonalTrainerScreen.js:678 | Chat Personal Trainer IA | texto corrido | texto | COLORS.primary | MUDA |
| screens/AIPersonalTrainerScreen.js:682 | Chat Personal Trainer IA | título/rótulo em amarelo | texto | COLORS.primary | MUDA |
| screens/AIPersonalTrainerScreen.js:684 | Chat Personal Trainer IA | selo/badge/etiqueta | fundo | #1A1700 | MUDA |
| screens/AIPersonalTrainerScreen.js:685 | Chat Personal Trainer IA | número em destaque | texto | COLORS.primary | FRONTEIRA |
| screens/AIPersonalTrainerScreen.js:688 | Chat Personal Trainer IA | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| screens/AIPersonalTrainerScreen.js:693 | Chat Personal Trainer IA | item selecionado / destaque (fundo ou borda) | fundo | COLORS.primary COLORS.primary | MANTÉM |
| screens/AIPersonalTrainerScreen.js:696 | Chat Personal Trainer IA | botão de ícone (fundo amarelo) | fundo | COLORS.primary | MANTÉM |
| screens/AIPersonalTrainerScreen.js:700 | Chat Personal Trainer IA | botão de ícone (fundo amarelo) | fundo | COLORS.primary | MANTÉM |
| screens/CreateWorkoutScreen.js:128 | Novo treino | texto de link / ação em texto | texto | COLORS.primary | MUDA |
| screens/CreateWorkoutScreen.js:134 | Novo treino | item selecionado / destaque (fundo ou borda) | fundo | COLORS.primary COLORS.primary | MANTÉM |
| screens/CreateWorkoutScreen.js:138 | Novo treino | item selecionado / destaque (fundo ou borda) | texto | COLORS.primary | MUDA |
| screens/CreateWorkoutScreen.js:140 | Novo treino | item selecionado / destaque (fundo ou borda) | fundo | #1A1700 | MUDA |
| screens/CreateWorkoutScreen.js:142 | Novo treino | item selecionado / destaque (fundo ou borda) | texto | COLORS.primary | MUDA |
| screens/CreateWorkoutScreen.js:145 | Novo treino | item selecionado / destaque (fundo ou borda) | borda | COLORS.primary #141200 | MANTÉM |
| screens/CreateWorkoutScreen.js:147 | Novo treino | item selecionado / destaque (fundo ou borda) | fundo | COLORS.primary | MANTÉM |
| screens/CreateWorkoutScreen.js:152 | Novo treino | item selecionado / destaque (fundo ou borda) | fundo | COLORS.primary COLORS.primary | MANTÉM |
| screens/EditBodyDataScreen.js:191 | Dados físicos | texto de link / ação em texto | texto | COLORS.primary | MUDA |
| screens/EditBodyDataScreen.js:213 | Dados físicos | item selecionado / destaque (fundo ou borda) | fundo | COLORS.primary COLORS.primary | MANTÉM |
| screens/EditBodyDataScreen.js:218 | Dados físicos | item selecionado / destaque (fundo ou borda) | borda | COLORS.primary #141200 | MANTÉM |
| screens/EditBodyDataScreen.js:220 | Dados físicos | item selecionado / destaque (fundo ou borda) | texto | COLORS.primary | MUDA |
| screens/ExerciseDetailScreen.js:95 | Detalhe do exercício | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/ExerciseDetailScreen.js:113 | Detalhe do exercício | fundo tintado de ícone/número | fundo | #1A1700 | MUDA |
| screens/ExerciseDetailScreen.js:116 | Detalhe do exercício | selo/badge/etiqueta | fundo | #1A1700 | MUDA |
| screens/ExerciseDetailScreen.js:117 | Detalhe do exercício | selo/badge/etiqueta | texto | COLORS.primary | MUDA |
| screens/ExerciseDetailScreen.js:122 | Detalhe do exercício | número em destaque | texto | COLORS.primary | FRONTEIRA |
| screens/ExerciseDetailScreen.js:131 | Detalhe do exercício | fundo tintado de ícone/número | fundo | #1A1700 | MUDA |
| screens/ExerciseDetailScreen.js:132 | Detalhe do exercício | número em destaque | texto | COLORS.primary | FRONTEIRA |
| screens/ExerciseDetailScreen.js:134 | Detalhe do exercício | cartão tintado (dica/aviso) | fundo | #141200 #2A2400 | MUDA |
| screens/ExerciseDetailScreen.js:135 | Detalhe do exercício | título/rótulo em amarelo | texto | COLORS.primary | MUDA |
| screens/ExerciseDetailScreen.js:136 | Detalhe do exercício | texto corrido | texto | #C8A800 | MUDA |
| screens/ExercisesScreen.js:11 | Exercícios | cor por estado/faixa | cor | #1A1200 | FRONTEIRA |
| screens/ExercisesScreen.js:145 | Exercícios | item selecionado / destaque (fundo ou borda) | fundo | COLORS.primary COLORS.primary | MANTÉM |
| screens/ExercisesScreen.js:156 | Exercícios | fundo tintado de ícone/número | fundo | #1A1700 | MUDA |
| screens/ExercisesScreen.js:164 | Exercícios | selo/badge/etiqueta | fundo | #1A1700 | MUDA |
| screens/ExercisesScreen.js:166 | Exercícios | selo/badge/etiqueta | texto | COLORS.primary | MUDA |
| screens/GuidedPlanScreen.js:251 | Série guiada | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/GuidedPlanScreen.js:272 | Série guiada | ícone de ação (dentro de botão ou linha tocável) | cor do ícone | COLORS.primary | MUDA |
| screens/GuidedPlanScreen.js:539 | Série guiada | item selecionado / destaque (fundo ou borda) | borda | COLORS.primary | MANTÉM |
| screens/GuidedPlanScreen.js:540 | Série guiada | item selecionado / destaque (fundo ou borda) | borda | COLORS.primary #1A1700 | MANTÉM |
| screens/GuidedPlanScreen.js:543 | Série guiada | item selecionado / destaque (fundo ou borda) | texto | COLORS.primary | MUDA |
| screens/GuidedPlanScreen.js:548 | Série guiada | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| screens/GymNowScreen.js:43 | Academia agora | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/GymNowScreen.js:65 | Academia agora | ícone de ação (dentro de botão ou linha tocável) | cor do ícone | COLORS.primary | MUDA |
| screens/GymNowScreen.js:94 | Academia agora | botão contorno (borda/texto) | cor | COLORS.primary | MUDA |
| screens/GymNowScreen.js:95 | Academia agora | botão contorno (borda/texto) | texto | COLORS.primary | MUDA |
| screens/HealthCategoryScreen.js:204 | Saúde (detalhe) | cursor e seleção de texto | cursor | COLORS.primary | MANTÉM |
| screens/HealthCategoryScreen.js:257 | Saúde (detalhe) | item selecionado / destaque (fundo ou borda) | fundo | COLORS.primary COLORS.primary | MANTÉM |
| screens/HealthCategoryScreen.js:275 | Saúde (detalhe) | item selecionado / destaque (fundo ou borda) | fundo | COLORS.primary COLORS.primary | MANTÉM |
| screens/HealthCategoryScreen.js:282 | Saúde (detalhe) | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| screens/HealthConnectScreen.js:133 | Saúde (conectar) | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/HealthConnectScreen.js:302 | Saúde (conectar) | borda de destaque | borda | COLORS.primary | FRONTEIRA |
| screens/HealthConnectScreen.js:304 | Saúde (conectar) | título/rótulo em amarelo | texto | COLORS.primary | MUDA |
| screens/HealthConnectScreen.js:312 | Saúde (conectar) | item selecionado / destaque (fundo ou borda) | fundo | COLORS.primary COLORS.primary | MANTÉM |
| screens/HealthConnectScreen.js:314 | Saúde (conectar) | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| screens/HealthConnectScreen.js:318 | Saúde (conectar) | texto de link / ação em texto | texto | COLORS.primary | MUDA |
| screens/HealthScreen.js:68 | Saúde | indicador de carregamento | cor do indicador | COLORS.primary COLORS.primary | MUDA |
| screens/HomeScreen.js:53 | Início | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/HomeScreen.js:71 | Início | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/HomeScreen.js:118 | Início | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/HomeScreen.js:132 | Início | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/HomeScreen.js:164 | Início | ícone de ação (dentro de botão ou linha tocável) | cor do ícone | COLORS.primary | MUDA |
| screens/HomeScreen.js:171 | Início | ícone de ação (dentro de botão ou linha tocável) | cor do ícone | COLORS.primary | MUDA |
| screens/HomeScreen.js:185 | Início | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/HomeScreen.js:187 | Início | seta (chevron) | cor do ícone | COLORS.primary | MUDA |
| screens/HomeScreen.js:225 | Início | ícone de ação (dentro de botão ou linha tocável) | cor do ícone | COLORS.primary | MUDA |
| screens/HomeScreen.js:227 | Início | seta (chevron) | cor do ícone | COLORS.primary | MUDA |
| screens/HomeScreen.js:239 | Início | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/HomeScreen.js:241 | Início | seta (chevron) | cor do ícone | COLORS.primary | MUDA |
| screens/HomeScreen.js:261 | Início | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/HomeScreen.js:282 | Início | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/HomeScreen.js:304 | Início | selo/badge/etiqueta | borda | #3A2A00 | MUDA |
| screens/HomeScreen.js:305 | Início | número em destaque | texto | COLORS.primary | FRONTEIRA |
| screens/HomeScreen.js:310 | Início | selo/badge/etiqueta | fundo | #1A1700 | MUDA |
| screens/HomeScreen.js:311 | Início | número em destaque | texto | COLORS.primary | FRONTEIRA |
| screens/HomeScreen.js:313 | Início | barra de gráfico/progresso/indicador | fundo | COLORS.primary | FRONTEIRA |
| screens/HomeScreen.js:331 | Início | faixa Personal Trainer IA (amarelo cheio) | fundo | COLORS.primary | FRONTEIRA |
| screens/HomeScreen.js:343 | Início | número em destaque | texto | COLORS.primary | FRONTEIRA |
| screens/HomeScreen.js:351 | Início | botão contorno (borda/texto) | cor | COLORS.primary | MUDA |
| screens/HomeScreen.js:352 | Início | botão contorno (borda/texto) | texto | COLORS.primary | MUDA |
| screens/HomeScreen.js:356 | Início | botão contorno (borda/texto) | texto | COLORS.primary | MUDA |
| screens/HomeScreen.js:358 | Início | fundo tintado de ícone/número | fundo | #1A1700 | MUDA |
| screens/onboarding/BodyDataScreen.js:161 | Onboarding | barra de gráfico/progresso/indicador | fundo | COLORS.primary | FRONTEIRA |
| screens/onboarding/BodyDataScreen.js:168 | Onboarding | item selecionado / destaque (fundo ou borda) | fundo | COLORS.primary COLORS.primary | MANTÉM |
| screens/onboarding/BodyDataScreen.js:173 | Onboarding | item selecionado / destaque (fundo ou borda) | borda | COLORS.primary #141200 | MANTÉM |
| screens/onboarding/BodyDataScreen.js:175 | Onboarding | item selecionado / destaque (fundo ou borda) | texto | COLORS.primary | MUDA |
| screens/onboarding/BodyDataScreen.js:192 | Onboarding | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| screens/onboarding/LevelSelectScreen.js:69 | Onboarding | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/onboarding/LevelSelectScreen.js:96 | Onboarding | barra de gráfico/progresso/indicador | fundo | COLORS.primary | FRONTEIRA |
| screens/onboarding/LevelSelectScreen.js:101 | Onboarding | item selecionado / destaque (fundo ou borda) | borda | COLORS.primary #141200 | MANTÉM |
| screens/onboarding/LevelSelectScreen.js:104 | Onboarding | item selecionado / destaque (fundo ou borda) | fundo | COLORS.primary | MANTÉM |
| screens/onboarding/LevelSelectScreen.js:110 | Onboarding | item selecionado / destaque (fundo ou borda) | borda | COLORS.primary | MANTÉM |
| screens/onboarding/LevelSelectScreen.js:111 | Onboarding | barra de gráfico/progresso/indicador | fundo | COLORS.primary | FRONTEIRA |
| screens/onboarding/LevelSelectScreen.js:115 | Onboarding | número em destaque | texto | COLORS.primary | FRONTEIRA |
| screens/onboarding/LevelSelectScreen.js:116 | Onboarding | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| screens/onboarding/ProfileSetupScreen.js:125 | Onboarding | barra de gráfico/progresso/indicador | fundo | COLORS.primary | FRONTEIRA |
| screens/onboarding/ProfileSetupScreen.js:131 | Onboarding | título/rótulo em amarelo | texto | COLORS.primary | MUDA |
| screens/onboarding/ProfileSetupScreen.js:135 | Onboarding | item selecionado / destaque (fundo ou borda) | borda | COLORS.primary #141200 | MANTÉM |
| screens/onboarding/ProfileSetupScreen.js:137 | Onboarding | item selecionado / destaque (fundo ou borda) | fundo | COLORS.primary | MANTÉM |
| screens/onboarding/ProfileSetupScreen.js:143 | Onboarding | item selecionado / destaque (fundo ou borda) | borda | COLORS.primary COLORS.primary | MANTÉM |
| screens/onboarding/ProfileSetupScreen.js:144 | Onboarding | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| screens/onboarding/WelcomeScreen.js:37 | Boas-vindas | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/onboarding/WelcomeScreen.js:81 | Boas-vindas | fundo tintado de ícone/número | fundo | #1A1700 | MUDA |
| screens/onboarding/WelcomeScreen.js:86 | Boas-vindas | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| screens/onboarding/WelcomeScreen.js:90 | Boas-vindas | botão contorno (borda/texto) | borda | COLORS.primary | MUDA |
| screens/onboarding/WelcomeScreen.js:91 | Boas-vindas | botão contorno (borda/texto) | texto | COLORS.primary | MUDA |
| screens/ProfileScreen.js:65 | Perfil | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/ProfileScreen.js:75 | Perfil | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/ProfileScreen.js:93 | Perfil | ícone de ação (dentro de botão ou linha tocável) | cor do ícone | COLORS.primary | MUDA |
| screens/ProfileScreen.js:102 | Perfil | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/ProfileScreen.js:108 | Perfil | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/ProfileScreen.js:114 | Perfil | ícone de estado (selecionado/ativo) | cor do ícone | COLORS.primary | MANTÉM |
| screens/ProfileScreen.js:152 | Perfil | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/ProfileScreen.js:167 | Perfil | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/ProfileScreen.js:221 | Perfil | borda de destaque | borda | COLORS.primary | FRONTEIRA |
| screens/ProfileScreen.js:225 | Perfil | selo/badge/etiqueta | fundo | #1A1700 #3A2A00 | MUDA |
| screens/ProfileScreen.js:226 | Perfil | selo/badge/etiqueta | texto | COLORS.primary | MUDA |
| screens/ProfileScreen.js:231 | Perfil | número em destaque | texto | COLORS.primary | FRONTEIRA |
| screens/ProfileScreen.js:233 | Perfil | barra de gráfico/progresso/indicador | fundo | COLORS.primary | FRONTEIRA |
| screens/ProfileScreen.js:239 | Perfil | texto de link / ação em texto | texto | COLORS.primary | MUDA |
| screens/RemindersScreen.js:150 | Lembretes | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| screens/RemindersScreen.js:160 | Lembretes | item selecionado / destaque (fundo ou borda) | fundo | COLORS.primary COLORS.primary | MANTÉM |
| screens/SeriesTimelineScreen.js:57 | Evolução das séries | barra de gráfico/progresso/indicador | fundo | COLORS.primary | FRONTEIRA |
| screens/SmartPlanScreen.js:141 | Série inteligente | indicador de carregamento | cor do indicador | COLORS.primary | MUDA |
| screens/SmartPlanScreen.js:186 | Série inteligente | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/SmartPlanScreen.js:199 | Série inteligente | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/SmartPlanScreen.js:237 | Série inteligente | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/SmartPlanScreen.js:298 | Série inteligente | barra de gráfico/progresso/indicador | fundo | COLORS.primary | FRONTEIRA |
| screens/SmartPlanScreen.js:300 | Série inteligente | cartão tintado (dica/aviso) | fundo | #1A1700 | MUDA |
| screens/SmartPlanScreen.js:301 | Série inteligente | selo/badge/etiqueta | texto | COLORS.primary | MUDA |
| screens/SmartPlanScreen.js:309 | Série inteligente | item selecionado / destaque (fundo ou borda) | borda | COLORS.primary #141200 | MANTÉM |
| screens/SmartPlanScreen.js:315 | Série inteligente | item selecionado / destaque (fundo ou borda) | fundo | COLORS.primary COLORS.primary | MANTÉM |
| screens/SmartPlanScreen.js:317 | Série inteligente | item selecionado / destaque (fundo ou borda) | borda | COLORS.primary | MANTÉM |
| screens/SmartPlanScreen.js:318 | Série inteligente | barra de gráfico/progresso/indicador | fundo | COLORS.primary | FRONTEIRA |
| screens/SmartPlanScreen.js:320 | Série inteligente | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| screens/SmartPlanScreen.js:328 | Série inteligente | fundo tintado de ícone/número | fundo | COLORS.primary | MUDA |
| screens/SmartPlanScreen.js:333 | Série inteligente | selo/badge/etiqueta | fundo | #1A1700 | MUDA |
| screens/SmartPlanScreen.js:334 | Série inteligente | número em destaque | texto | COLORS.primary | FRONTEIRA |
| screens/SmartPlanScreen.js:336 | Série inteligente | título/rótulo em amarelo | texto | COLORS.primary | MUDA |
| screens/SmartPlanScreen.js:341 | Série inteligente | título/rótulo em amarelo | texto | COLORS.primary | MUDA |
| screens/SmartPlanScreen.js:343 | Série inteligente | barra de gráfico/progresso/indicador | fundo | COLORS.primary | FRONTEIRA |
| screens/StoreDetailScreen.js:118 | Marketplace (detalhe) | selo/badge/etiqueta | fundo | #1A1700 | MUDA |
| screens/StoreDetailScreen.js:119 | Marketplace (detalhe) | selo/badge/etiqueta | texto | COLORS.primary | MUDA |
| screens/StoreDetailScreen.js:123 | Marketplace (detalhe) | número em destaque | texto | COLORS.primary | FRONTEIRA |
| screens/StoreDetailScreen.js:126 | Marketplace (detalhe) | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| screens/StoreScreen.js:89 | Marketplace | ícone decorativo | cor do ícone | COLORS.primary | MUDA |
| screens/StoreScreen.js:124 | Marketplace | seta (chevron) | cor do ícone | COLORS.primary | MUDA |
| screens/StoreScreen.js:149 | Marketplace | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| screens/StoreScreen.js:153 | Marketplace | item selecionado / destaque (fundo ou borda) | fundo | COLORS.primary COLORS.primary | MANTÉM |
| screens/StoreScreen.js:159 | Marketplace | selo/badge/etiqueta | fundo | #1A1700 | MUDA |
| screens/StoreScreen.js:160 | Marketplace | selo/badge/etiqueta | texto | COLORS.primary | MUDA |
| screens/StoreScreen.js:166 | Marketplace | número em destaque | texto | COLORS.primary | FRONTEIRA |
| screens/StoreScreen.js:168 | Marketplace | texto de link / ação em texto | texto | COLORS.primary | MUDA |
| screens/WorkoutDetailScreen.js:83 | Detalhe do treino | título/rótulo em amarelo | texto | COLORS.primary | MUDA |
| screens/WorkoutDetailScreen.js:88 | Detalhe do treino | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| screens/WorkoutDetailScreen.js:93 | Detalhe do treino | fundo tintado de ícone/número | fundo | #1A1700 | MUDA |
| screens/WorkoutDetailScreen.js:94 | Detalhe do treino | número em destaque | texto | COLORS.primary | FRONTEIRA |
| screens/WorkoutDetailScreen.js:95 | Detalhe do treino | fundo tintado de ícone/número | fundo | #1A1700 | MUDA |
| screens/WorkoutsScreen.js:140 | Treinos | ícone de ação (dentro de botão ou linha tocável) | cor do ícone | COLORS.primary | MUDA |
| screens/WorkoutsScreen.js:175 | Treinos | ícone de ação (dentro de botão ou linha tocável) | cor do ícone | COLORS.primary | MUDA |
| screens/WorkoutsScreen.js:223 | Treinos | botão de ícone (fundo amarelo) | fundo | COLORS.primary | MANTÉM |
| screens/WorkoutsScreen.js:228 | Treinos | faixa Personal Trainer IA (amarelo cheio) | fundo | COLORS.primary | FRONTEIRA |
| screens/WorkoutsScreen.js:239 | Treinos | fundo tintado de ícone/número | fundo | #1A1700 | MUDA |
| screens/WorkoutsScreen.js:240 | Treinos | número em destaque | texto | COLORS.primary | FRONTEIRA |
| screens/WorkoutsScreen.js:244 | Treinos | selo/badge/etiqueta | fundo | COLORS.primary | FRONTEIRA |
| screens/WorkoutsScreen.js:255 | Treinos | botão primário (fundo) | fundo | COLORS.primary | MANTÉM |
| screens/WorkoutsScreen.js:266 | Treinos | botão contorno (borda/texto) | texto | COLORS.primary | MUDA |
| screens/WorkoutsScreen.js:275 | Treinos | texto de link / ação em texto | texto | COLORS.primary | MUDA |
| screens/WorkoutsScreen.js:285 | Treinos | botão contorno (borda/texto) | texto | COLORS.primary | MUDA |

## 2. Regra proposta por papel

Tokens de destino: `COLORS.textPrimary`/`white` (branco), `COLORS.textSecondary` (`#B0B0B5`), `COLORS.textMuted` (`#8E8E93`), `COLORS.bgCardAlt` (`#1C1C1C`) e `COLORS.border` (`#2A2A2A`) para superfícies. Nenhum token novo é necessário para a regra; a tinta âmbar (`#1A1700`, `#141200`...) deixa de existir como cor literal nas telas.

| papel | ocorrências | decisão | motivo |
|---|---|---|---|
| botão primário (fundo) | 25 | **continua amarelo**, no máximo um por tela; um segundo vira secundário (contorno neutro) | é a ação principal; combina com `docs/visual-botoes.md` |
| botão de ícone com fundo amarelo (enviar, "+", confirmar, play) | 5 | **continua amarelo** quando é a ação principal do contexto; o avatar da IA (`aiAvatar`) vira superfície neutra | avatar não é ação |
| botão de contorno (borda e texto amarelos) | 15 | **branco/cinza**: texto branco, borda `textSecondary`, como o `Button` secundário | não é a ação principal |
| texto de link / ação em texto | 11 | **`textSecondary` sublinhado**; links que hoje não têm sublinhado ganham (ver item 6) | não é a ação principal |
| ícone de ação (dentro de botão ou linha tocável) | 11 | **branco** (ou a cor do texto do controle) | segue o rótulo do botão |
| seta (chevron) | 9 | **`textSecondary`** | indicação de navegação, não destaque |
| ícone decorativo | 36 | **`textSecondary`** | decoração não é "ação nem seleção" |
| botão "i" (`InfoButton`) | 1 definição, 19 usos | **contorno cinza**: círculo com borda `textSecondary` e "i" `textSecondary` | explicação, não ação principal |
| item selecionado: fundo cheio ou borda | 54 | **continua amarelo** | é o estado "selecionado/ativo" da direção aprovada |
| item selecionado: texto e fundo tintado | 7 | **texto branco**; fundo tintado vira `bgCardAlt` (a borda amarela continua) | o amarelo fica na borda/fundo cheio; texto legível |
| ícone de estado selecionado/ativo | 5 | **continua amarelo** | indica seleção ou passo ativo |
| aba ativa e tema de navegação | 3 | **continua amarelo** (ver item 4) | item ativo |
| cursor e seleção de texto | 3 | **continua amarelo** | campo ativo, identidade do app |
| selo / badge / etiqueta | 25 (19 mudam) | texto e fundo tintado → **`textSecondary` sobre `bgCardAlt`**; os selos "Dados de exemplo" e "IA" ficam para o item 4 | etiqueta informativa |
| fundo tintado de ícone ou número | 12 | **`bgCardAlt`** | tinta âmbar sai |
| cartão tintado (dica, aviso, bolha do usuário) | 7 | **`bgCard` com borda `border`**; título branco; corpo `textSecondary` | texto corrido não fica amarelo |
| título / rótulo em amarelo | 13 (11 mudam) | **branco** (peso e tamanho continuam) | hierarquia por tipografia, não por cor |
| texto corrido (incluindo `#C8A800` e as "Sugestões para você") | 4 | **branco ou `textSecondary`**; nunca amarelo | legibilidade de parágrafo |
| indicador de carregamento | 5 | **`textSecondary`** (dentro de botão primário continua preto) | não é ação |
| barra / progresso / indicador de página | 20 | **sem decisão**: item 4 | depende de produto |
| número em destaque | 19 | **sem decisão**: item 4 | depende de produto |
| cor por estado ou faixa | 5 | **sem decisão**: item 4 | semântica de saúde e de aviso |
| borda de destaque (avatar, "em breve") | 2 | **sem decisão**: item 4 | |
| faixa "Personal Trainer IA" (amarelo cheio) | 2 | **sem decisão**: item 4 | |

## 3. Mapa por tela (o que mudaria)

"→" = muda; "=" = continua amarelo; "?" = fronteira. Coluna "efeito": quantas ocorrências deixam de ser amarelas e o que permanece. Sem opinar sobre estética.

| tela | ocorrências | efeito | detalhe por papel (arquivo:linha) |
|---|---|---|---|
| Série guiada | 26 | 11 de 26 deixam de ser amarelas; 12 continuam; 3 em aberto (fronteira) | ícone decorativo 3: GuidedParts:50→ GuidedParts:110→ GuidedPlanScreen:251→; ícone de estado 3: GuidedParts:68= GuidedParts:76= GuidedParts:148=; barra de gráfico/progresso/indicador 2: GuidedParts:165? SeriesCard:108?; selo/badge/etiqueta 3: GuidedParts:166→ GuidedParts:167→ GuidedParts:168?; item selecionado / destaque 5: GuidedParts:170= GuidedParts:175= GuidedPlanScreen:539= GuidedPlanScreen:540= GuidedPlanScreen:543→; botão primário 2: GuidedParts:179= GuidedPlanScreen:548=; botão contorno 2: GuidedParts:180→ GuidedParts:183→; ícone de ação 2: SeriesCard:71→ GuidedPlanScreen:272→; texto de link / ação em texto 1: SeriesCard:120→ |
| Perfil | 25 | 16 de 25 deixam de ser amarelas; 5 continuam; 4 em aberto (fronteira) | texto de link / ação em texto 2: AboutCard:58→ ProfileScreen:239→; ícone de ação 2: EditNameRow:26→ ProfileScreen:93→; cursor e seleção de texto 1: EditNameRow:45=; botão primário 2: EditNameRow:74= ProfileHealthCard:70=; ícone decorativo 8: ProfileHealthCard:37→ RemindersCard:12→ ProfileScreen:65→ ProfileScreen:75→ ProfileScreen:102→ ProfileScreen:108→ ProfileScreen:152→ ProfileScreen:167→; seta 1: ProfileHealthCard:39→; número em destaque 2: ProfileHealthCard:68? ProfileScreen:231?; ícone de estado 1: ProfileScreen:114=; borda de destaque 1: ProfileScreen:221?; selo/badge/etiqueta 2: ProfileScreen:225→ ProfileScreen:226→; barra de gráfico/progresso/indicador 1: ProfileScreen:233? |
| Início | 25 | 20 de 25 deixam de ser amarelas; 5 em aberto (fronteira) | ícone decorativo 8: HomeScreen:53→ HomeScreen:71→ HomeScreen:118→ HomeScreen:132→ HomeScreen:185→ HomeScreen:239→ HomeScreen:261→ HomeScreen:282→; ícone de ação 3: HomeScreen:164→ HomeScreen:171→ HomeScreen:225→; seta 3: HomeScreen:187→ HomeScreen:227→ HomeScreen:241→; selo/badge/etiqueta 2: HomeScreen:304→ HomeScreen:310→; número em destaque 3: HomeScreen:305? HomeScreen:311? HomeScreen:343?; barra de gráfico/progresso/indicador 1: HomeScreen:313?; faixa Personal Trainer IA 1: HomeScreen:331?; botão contorno 3: HomeScreen:351→ HomeScreen:352→ HomeScreen:356→; fundo tintado de ícone/número 1: HomeScreen:358→ |
| Onboarding | 24 | 3 de 24 deixam de ser amarelas; 16 continuam; 5 em aberto (fronteira) | barra de gráfico/progresso/indicador 4: BodyDataScreen:161? LevelSelectScreen:96? LevelSelectScreen:111? ProfileSetupScreen:125?; item selecionado / destaque 9: BodyDataScreen:168= BodyDataScreen:173= BodyDataScreen:175→ LevelSelectScreen:101= LevelSelectScreen:104= LevelSelectScreen:110= ProfileSetupScreen:135= ProfileSetupScreen:137= ProfileSetupScreen:143=; botão primário 3: BodyDataScreen:192= LevelSelectScreen:116= ProfileSetupScreen:144=; ícone decorativo 1: LevelSelectScreen:69→; número em destaque 1: LevelSelectScreen:115?; título/rótulo em amarelo 1: ProfileSetupScreen:131→ |
| Série inteligente | 20 | 10 de 20 deixam de ser amarelas; 6 continuam; 4 em aberto (fronteira) | indicador de carregamento 1: SmartPlanScreen:141→; ícone decorativo 3: SmartPlanScreen:186→ SmartPlanScreen:199→ SmartPlanScreen:237→; barra de gráfico/progresso/indicador 3: SmartPlanScreen:298? SmartPlanScreen:318? SmartPlanScreen:343?; cartão tintado 1: SmartPlanScreen:300→; selo/badge/etiqueta 2: SmartPlanScreen:301→ SmartPlanScreen:333→; item selecionado / destaque 3: SmartPlanScreen:309= SmartPlanScreen:315= SmartPlanScreen:317=; botão primário 1: SmartPlanScreen:320=; fundo tintado de ícone/número 1: SmartPlanScreen:328→; número em destaque 1: SmartPlanScreen:334?; título/rótulo em amarelo 2: SmartPlanScreen:336→ SmartPlanScreen:341→ |
| Detalhe do exercício | 17 | 13 de 17 deixam de ser amarelas; 1 continuam; 3 em aberto (fronteira) | ícone decorativo 3: ExerciseMedia:59→ ExerciseVideoPlayer:87→ ExerciseDetailScreen:95→; selo/badge/etiqueta 3: ExerciseMedia:76? ExerciseDetailScreen:116→ ExerciseDetailScreen:117→; botão contorno 2: ExerciseStills:84→ ExerciseStills:85→; botão de ícone 1: ExerciseVideoPlayer:109=; fundo tintado de ícone/número 2: ExerciseDetailScreen:113→ ExerciseDetailScreen:131→; número em destaque 2: ExerciseDetailScreen:122? ExerciseDetailScreen:132?; cartão tintado 1: ExerciseDetailScreen:134→; título/rótulo em amarelo 1: ExerciseDetailScreen:135→; texto corrido 1: ExerciseDetailScreen:136→ |
| Saúde | 17 | 13 de 17 deixam de ser amarelas; 2 continuam; 2 em aberto (fronteira) | ícone decorativo 3: CategoryCard:33→ HealthParts:121→ HealthParts:167→; fundo tintado de ícone/número 1: CategoryCard:64→; cor por estado/faixa 1: HealthParts:11?; ícone de estado 1: HealthParts:78=; seta 4: HealthParts:132→ HealthParts:155→ HealthParts:189→ HealthParts:218→; ícone de ação 1: HealthParts:209→; número em destaque 1: HealthParts:227?; texto corrido 1: HealthParts:269→; texto de link / ação em texto 1: HealthParts:271→; botão primário 1: HealthParts:275=; indicador de carregamento 1: HealthScreen:68→ |
| Marketplace | 15 | 6 de 15 deixam de ser amarelas; 3 continuam; 6 em aberto (fronteira) | selo/badge/etiqueta 4: MarketplaceBanners:109? MarketplaceImage:42? StoreScreen:159→ StoreScreen:160→; título/rótulo em amarelo 2: MarketplaceBanners:110? MarketplaceImage:43?; barra de gráfico/progresso/indicador 1: MarketplaceBanners:117?; ícone decorativo 2: MarketplaceImage:27→ StoreScreen:89→; seta 1: StoreScreen:124→; botão primário 1: StoreScreen:149=; item selecionado / destaque 1: StoreScreen:153=; número em destaque 1: StoreScreen:166?; texto de link / ação em texto 1: StoreScreen:168→ |
| Chat Personal Trainer IA | 15 | 9 de 15 deixam de ser amarelas; 5 continuam; 1 em aberto (fronteira) | ícone decorativo 1: AIPersonalTrainerScreen:519→; indicador de carregamento 2: AIPersonalTrainerScreen:590→ AIPersonalTrainerScreen:601→; botão de ícone 3: AIPersonalTrainerScreen:672→ AIPersonalTrainerScreen:696= AIPersonalTrainerScreen:700=; cartão tintado 1: AIPersonalTrainerScreen:675→; texto corrido 1: AIPersonalTrainerScreen:678→; título/rótulo em amarelo 1: AIPersonalTrainerScreen:682→; selo/badge/etiqueta 1: AIPersonalTrainerScreen:684→; número em destaque 1: AIPersonalTrainerScreen:685?; botão primário 1: AIPersonalTrainerScreen:688=; item selecionado / destaque 1: AIPersonalTrainerScreen:693= |
| Treino ativo | 12 | 4 de 12 deixam de ser amarelas; 2 continuam; 6 em aberto (fronteira) | barra de gráfico/progresso/indicador 3: ActiveWorkoutScreen:180? ActiveWorkoutScreen:188? ActiveWorkoutScreen:189?; fundo tintado de ícone/número 2: ActiveWorkoutScreen:183→ ActiveWorkoutScreen:205→; número em destaque 3: ActiveWorkoutScreen:192? ActiveWorkoutScreen:197? ActiveWorkoutScreen:210?; cartão tintado 1: ActiveWorkoutScreen:195→; botão primário 2: ActiveWorkoutScreen:199= ActiveWorkoutScreen:212= |
| Novo treino | 11 | 4 de 11 deixam de ser amarelas; 7 continuam | texto de link / ação em texto 1: CreateWorkoutScreen:128→; item selecionado / destaque 7: CreateWorkoutScreen:134= CreateWorkoutScreen:138→ CreateWorkoutScreen:140→ CreateWorkoutScreen:142→ CreateWorkoutScreen:145= CreateWorkoutScreen:147= CreateWorkoutScreen:152= |
| Treinos | 11 | 6 de 11 deixam de ser amarelas; 2 continuam; 3 em aberto (fronteira) | ícone de ação 2: WorkoutsScreen:140→ WorkoutsScreen:175→; botão de ícone 1: WorkoutsScreen:223=; faixa Personal Trainer IA 1: WorkoutsScreen:228?; fundo tintado de ícone/número 1: WorkoutsScreen:239→; número em destaque 1: WorkoutsScreen:240?; selo/badge/etiqueta 1: WorkoutsScreen:244?; botão primário 1: WorkoutsScreen:255=; botão contorno 2: WorkoutsScreen:266→ WorkoutsScreen:285→; texto de link / ação em texto 1: WorkoutsScreen:275→ |
| Ajuda "i" (transversal) | 9 | 5 de 9 deixam de ser amarelas; 3 continuam; 1 em aberto (fronteira) | botão "i" 1: InfoButton:11→; título/rótulo em amarelo 2: InfoSheet:142→ InfoSheet:168→; texto corrido 1: InfoSheet:146→; item selecionado / destaque 2: InfoSheet:149→ InfoSheet:162=; número em destaque 1: InfoSheet:150?; botão primário 1: InfoSheet:169= |
| Contas (peças) | 7 | 1 de 7 deixam de ser amarelas; 4 continuam; 2 em aberto (fronteira) | cursor e seleção de texto 1: AuthParts:67=; cor por estado/faixa 2: AuthParts:172? AuthParts:230?; botão primário 1: AuthParts:301=; texto de link / ação em texto 1: AuthParts:309→; item selecionado / destaque 1: AuthParts:314= |
| Saúde (conectar) | 7 | 3 de 7 deixam de ser amarelas; 3 continuam; 1 em aberto (fronteira) | ícone decorativo 1: HealthConnectScreen:133→; borda de destaque 1: HealthConnectScreen:302?; título/rótulo em amarelo 1: HealthConnectScreen:304→; item selecionado / destaque 1: HealthConnectScreen:312=; botão primário 1: HealthConnectScreen:314=; texto de link / ação em texto 1: HealthConnectScreen:318→ |
| Dados físicos | 6 | 2 de 6 deixam de ser amarelas; 4 continuam | texto de link / ação em texto 1: EditBodyDataScreen:191→; item selecionado / destaque 3: EditBodyDataScreen:213= EditBodyDataScreen:218= EditBodyDataScreen:220→ |
| Exercícios | 6 | 3 de 6 deixam de ser amarelas; 2 continuam; 1 em aberto (fronteira) | cor por estado/faixa 1: ExercisesScreen:11?; item selecionado / destaque 1: ExercisesScreen:145=; fundo tintado de ícone/número 1: ExercisesScreen:156→; selo/badge/etiqueta 2: ExercisesScreen:164→ ExercisesScreen:166→ |
| Saúde (detalhe) | 6 | 0 de 6 deixam de ser amarelas; 6 continuam | cursor e seleção de texto 1: HealthCategoryScreen:204=; item selecionado / destaque 2: HealthCategoryScreen:257= HealthCategoryScreen:275=; botão primário 1: HealthCategoryScreen:282= |
| Recuperação de erro | 5 | 4 de 5 deixam de ser amarelas; 1 continuam | selo/badge/etiqueta 1: ErrorBoundary:106→; título/rótulo em amarelo 1: ErrorBoundary:107→; botão primário 1: ErrorBoundary:110=; botão contorno 2: ErrorBoundary:112→ ErrorBoundary:113→ |
| Boas-vindas | 5 | 4 de 5 deixam de ser amarelas; 1 continuam | ícone decorativo 1: WelcomeScreen:37→; fundo tintado de ícone/número 1: WelcomeScreen:81→; botão primário 1: WelcomeScreen:86=; botão contorno 2: WelcomeScreen:90→ WelcomeScreen:91→ |
| Detalhe do treino | 5 | 3 de 5 deixam de ser amarelas; 1 continuam; 1 em aberto (fronteira) | título/rótulo em amarelo 1: WorkoutDetailScreen:83→; botão primário 1: WorkoutDetailScreen:88=; fundo tintado de ícone/número 2: WorkoutDetailScreen:93→ WorkoutDetailScreen:95→; número em destaque 1: WorkoutDetailScreen:94? |
| Saúde (gráfico) | 4 | 0 de 4 deixam de ser amarelas; 4 em aberto (fronteira) | barra de gráfico/progresso/indicador 4: TrendBars:13? WeightChart:58? WeightChart:59? WeightChart:60? |
| Academia agora | 4 | 4 de 4 deixam de ser amarelas | ícone decorativo 1: GymNowScreen:43→; ícone de ação 1: GymNowScreen:65→; botão contorno 2: GymNowScreen:94→ GymNowScreen:95→ |
| Marketplace (detalhe) | 4 | 2 de 4 deixam de ser amarelas; 1 continuam; 1 em aberto (fronteira) | selo/badge/etiqueta 2: StoreDetailScreen:118→ StoreDetailScreen:119→; número em destaque 1: StoreDetailScreen:123?; botão primário 1: StoreDetailScreen:126= |
| Navegação | 3 | 0 de 3 deixam de ser amarelas; 3 continuam | aba ativa / tema de navegação 3: MainNavigator:110= navTheme:10= navTheme:15= |
| Lembretes | 3 | 0 de 3 deixam de ser amarelas; 3 continuam | botão primário 1: RemindersScreen:150=; item selecionado / destaque 1: RemindersScreen:160= |
| Início / Academia agora | 2 | 0 de 2 deixam de ser amarelas; 2 em aberto (fronteira) | cor por estado/faixa 1: OccupancyCard:36?; selo/badge/etiqueta 1: OccupancyCard:75? |
| Anunciar | 2 | 1 de 2 deixam de ser amarelas; 1 continuam | título/rótulo em amarelo 1: AdvertiseScreen:307→; botão primário 1: AdvertiseScreen:318= |
| Exercícios (ícone) | 1 | 1 de 1 deixam de ser amarelas | ícone decorativo 1: ExerciseIcon:8→ |
| Contas / Perfil | 1 | 1 de 1 deixam de ser amarelas | texto de link / ação em texto 1: LegalLinks:44→ |
| Evolução das séries | 1 | 0 de 1 deixam de ser amarelas; 1 em aberto (fronteira) | barra de gráfico/progresso/indicador 1: SeriesTimelineScreen:57? |

## 4. Casos de fronteira (sem decisão)

Para cada caso: as opções e a consequência. O inventário do item 1 marca como "fronteira" as 56 ocorrências abaixo.

### 4.1 Números em destaque (19)
XP e nível (`xpText`, `xpValue`), sequência (`streakNum`), valor do IMC/faixa (`healthBand`, `band`), os números grandes do treino ativo (`repsNumber` e `restTimer`, 52 pt; `doneStatValue`), valores de configuração do exercício, preço no marketplace, letras de série (`cardSerieText`, `planSerieText`), número de passo (`stepNumText`, `exNumText`).
- **A. Continuam amarelos.** O número é o dado principal da tela e o amarelo o isola. Consequência: ficam vários amarelos por tela (o treino ativo teria o cronômetro, os repetições, o botão e o ícone ao mesmo tempo).
- **B. Branco em negrito.** Hierarquia só por tamanho e peso. Consequência: contraste sobe de 13,61:1 (amarelo sobre `bg`) para 19,80:1; a tela perde um ponto de cor.
- **C. Amarelo só no número que é o objetivo da ação atual** (por exemplo o tempo de descanso durante o descanso) e branco nos demais. Consequência: regra por contexto, mais difícil de testar com varredura.

### 4.2 Barras de gráfico, progresso e indicadores (20)
`TrendBars` (cor padrão), `WeightChart` (linha e último ponto), preenchimento do progresso (série guiada, treino ativo, série inteligente, XP), bolinhas de passo do onboarding e do carrossel de banners, bolinhas de série do treino ativo, ponto da linha do tempo, marcador de notas.
- **A. Continuam amarelos** (representam o valor ou o passo atual, isto é, "ativo"). Consequência: a Saúde mantém um gráfico amarelo no meio de uma tela já neutra.
- **B. Branco ou `textSecondary`.** Consequência: contraste do preenchimento contra a trilha `border` (`#2A2A2A`): branco 14,35:1, `textSecondary` 6,65:1 (hoje, amarelo 9,87:1); o gráfico fica monocromático.
- **C. Amarelo só no valor selecionado ou no último ponto** e cinza no resto. Consequência: o amarelo passa a significar "selecionado" também no gráfico; exige que o gráfico tenha seleção.

### 4.3 Ícones de estado (concluído, online, passo ativo)
O passo ativo da checklist e a opção selecionada já usam amarelo (`GuidedParts:68`, `:76`, `:148`); "concluído" é verde (`COLORS.success`) e o ponto "online" do chat IA também. Verde não está na direção aprovada (que só cita vermelho e laranja).
- **A. Verde continua para concluído/online; amarelo continua para ativo.** Consequência: dois acentos de cor na checklist (verde e amarelo).
- **B. Concluído em branco com marca; ativo em amarelo; pendente em cinza.** Consequência: o estado deixa de depender de cor entre concluído e pendente (ícone muda de forma), o verde sai do app.
- **C. Tudo em cinza exceto o ativo.** Consequência: concluído e pendente só se distinguem pelo ícone (círculo cheio com marca x vazio).

### 4.4 Abas ativas (`MainNavigator.js:110` e o tema em `navTheme.js`)
Ativa amarela; inativa `#555555` (hoje 2,66:1 sobre `bg`, abaixo de 3:1, para o ícone, e abaixo de 4,5:1 para o rótulo de 11 pt).
- **A. Ativa continua amarela** (item ativo). Consequência: nenhuma mudança visual; o contraste da inativa segue baixo.
- **B. Ativa branca com ícone preenchido**, inativa `textMuted` (6,07:1). Consequência: perde o amarelo na navegação principal, melhora o contraste da inativa.
- **C. Ativa amarela e inativa `textMuted`.** Consequência: só corrige o contraste da inativa (de 2,66:1 para 6,07:1).
O `navTheme.primary` e o `notification` do React Navigation não são visíveis hoje; mudar o primeiro afeta o realce de foco e o ripple.

### 4.5 Faixa "Personal Trainer IA" (amarelo cheio, Início e Treinos)
- **A. Continua amarelo cheio** (cartão-CTA principal). Consequência: no Início ela compete com o botão primário e com o item selecionado; em Treinos, com o botão "Personal Trainer IA" do estado vazio e com a faixa da lista.
- **B. Cartão neutro** (`bgCard`, borda `border`, ícone e título brancos). Consequência: some o maior bloco amarelo do app; a CTA deixa de ser a mais chamativa.
- **C. Vira botão primário normal** (preto sobre amarelo, 52 pt). Consequência: depende da decisão de duplicação em `docs/visual-botoes.md`.

### 4.6 Selo "Dados de exemplo" e selo "IA"
`MarketplaceBanners`, `MarketplaceImage` (fundo preto, texto e borda amarelos), `OccupancyCard` (fundo amarelo cheio), selo "IA" da série (`iaBadge`, `aiBadge`, fundo amarelo) e o selo de vídeo em `ExerciseMedia`.
- **A. Continuam amarelos** (sinalizam "não é dado real"/"gerado por IA"). Consequência: amarelo como "aviso", fora da regra "ação ou selecionado".
- **B. Neutros** (`textSecondary` sobre `bgCardAlt`, ou sobre preto nas fotos). Consequência: na foto do marketplace o selo deixa de se destacar; contraste `textSecondary` sobre preto 9,72:1.
- **C. Branco com borda `textSecondary`.** Consequência: o selo continua visível sobre foto sem usar a cor da marca.

### 4.7 Cor por faixa de saúde, "em breve", avatar e emblema de erro
`BAND_COLOR.good` (Duo Score "Bom", amarelo), `STRENGTH_COLORS` (força da senha, 4º nível amarelo), `Notice` do tipo informação, `STATE_COLOR` da lotação, cartão "em breve" da Conectar (borda e título amarelos), borda do avatar do Perfil e emblema da tela de erro.
- **A. Amarelo continua** como nível intermediário nas escalas (força da senha, faixa "Bom"). Consequência: a escala verde/amarelo/laranja/vermelho segue completa, mas laranja deixa de ser "só erro real" (a faixa "Regular" usa `COLORS.warning`).
- **B. Faixa "Bom" em branco ou verde.** Consequência: a escala perde um degrau de cor; o texto da faixa continua dizendo o nível.
- **C. Faixas todas em tons de cinza e o texto diz o nível.** Consequência: nada depende de cor, e a Saúde fica sem cores de semáforo.

### 4.8 Outros
- **`profileChipMissing`/`profileChipValueMissing`** (série guiada): amarelo hoje marca "campo que falta", que não é seleção nem ação. Opções: manter, passar a borda `textSecondary`, ou usar o mesmo estilo de item selecionado.
- **Asterisco de obrigatório** (`AdvertiseScreen.js:307`): amarelo, não é erro nem ação. Opções: branco, `textSecondary`.
- **Cursor** (`selectionColor`): amarelo é a cor da marca no campo ativo; mudar altera a identidade em todos os campos.

## 5. Plano de migração

Um papel por lote, do que mais muda ao que menos muda. Cada lote é um commit; em todos: `npm run test:all` (com `C:\Program Files\Git\bin` no PATH), `npx expo export --platform android` e `--platform ios`, e conferência no aparelho.

| lote | papel | ocorrências que mudam | coordenação |
|---|---|---|---|
| 1 | ícones decorativos, de ação e setas | 56 | — |
| 2 | selos e etiquetas (sem os de fronteira) | 19 | depois do item 4.6 para os selos de exemplo e IA |
| 3 | fundos tintados de ícone/número e cartões tintados | 19 | — |
| 4 | botões de contorno | 15 | junto dos lotes de botões (variante secundária do `Button`) |
| 5 | títulos e rótulos em amarelo | 11 | — |
| 6 | links e ações em texto | 11 | junto do `Button` terciário |
| 7 | itens selecionados: texto e fundo tintado | 7 | — |
| 8 | indicador de carregamento | 5 | — |
| 9 | texto corrido (inclui `#C8A800` e as sugestões da Saúde) | 4 | — |
| 10 | botão "i" e avatar da IA | 2 | altera `InfoButton` e `InfoSheet` |
| 11+ | casos de fronteira | 56 | só depois de decididos os itens 4.1 a 4.8 |

### Como cada lote é verificado
1. **Teste automático novo** (`cor.test.ts`, a partir do lote 1): varredura do código que falha se um papel já migrado voltar a usar `COLORS.primary` ou a tinta âmbar fora de uma lista explícita de exceções (cada exceção cita arquivo e linha e o motivo). A lista só encolhe.
2. **Contraste:** cada cor de destino é conferida contra as superfícies onde é usada (item 6); o teste existente de tokens segue passando.
3. **Testes existentes** que leem código-fonte e citam `COLORS.primary` (`authbackground.test.ts` cita `selectionColor={COLORS.primary}`; `healthui.test.ts`, `exerciseicons.test.ts` e `authui.test.ts` também) são ajustados ao mínimo e listados no lote.
4. `test:all` e os dois `expo export`.

### O que precisa de olhar no aparelho (todos os lotes)
- Se a tela ainda tem uma hierarquia legível sem o amarelo (o que é principal, o que é secundário).
- Se o item selecionado continua inequívoco ao lado dos não selecionados.
- Contraste real dos cinzas ao ar livre e em brilho baixo.
- Lote 1: ícones decorativos, setas e ícones de ação (ícones cinza ao lado de texto branco).
- Lote 3: o fundo `bgCardAlt` no lugar da tinta âmbar em cartões e ícones.
- Lote 10: o botão "i" em contorno cinza e a área de toque.

## 6. Acessibilidade

### 6.1 Contraste das trocas (calculado, sobre as superfícies reais)

| cor | `bg` `#0A0A0A` | `bgCard` `#141414` | `bgCardAlt` `#1C1C1C` | tinta `#1A1700` | tinta `#141200` | `border` `#2A2A2A` |
|---|---|---|---|---|---|---|
| amarelo `#fed205` (hoje) | 13,61 | 12,66 | 11,71 | 12,37 | 12,93 | 9,87 |
| branco | 19,80 | 18,42 | 17,04 | 18,00 | 18,81 | 14,35 |
| `textSecondary` `#B0B0B5` | 9,17 | 8,53 | 7,89 | 8,34 | 8,71 | 6,65 |
| `textMuted` `#8E8E93` | 6,07 | 5,65 | 5,23 | 5,52 | 5,77 | 4,40 |
| `#C8A800` (texto âmbar de dica) | 8,54 | 7,95 | 7,35 | 7,76 | 8,11 | 6,19 |
| vermelho `error` | 5,26 | 4,90 | 4,53 | 4,78 | 5,00 | 3,81 |
| laranja `warning` | 7,06 | 6,57 | 6,08 | 6,42 | 6,71 | 5,12 |
| verde `success` | 8,69 | 8,08 | 7,48 | 7,90 | 8,26 | 6,30 |
| `#555555` (aba inativa hoje) | 2,66 | 2,47 | 2,29 | 2,41 | 2,52 | 1,93 |

- **Amarelo → branco:** o contraste sobe (13,61 para 19,80 sobre `bg`). **Amarelo → `textSecondary`:** cai (13,61 para 9,17), mas continua acima de 4,5:1 para texto e de 3:1 para ícone em todas as superfícies, inclusive a tinta e a `border`.
- **Preto sobre amarelo** (botão primário e chip selecionado) continua em 14,43:1; **branco sobre amarelo** seria 1,45:1 (não usar texto branco sobre amarelo).
- Para distinguir dois cinzas vizinhos: branco contra `textSecondary` 2,16:1 e `textSecondary` contra `textMuted` 1,51:1. Quando dois níveis de cinza precisam ser percebidos como diferentes, a diferença é pequena (sem exigência da WCAG para texto, mas é pouca para quem tem baixa visão).
- Contra o `border` (`#2A2A2A`), o `textMuted` fica em 4,40:1: não usar `textMuted` para texto sobre `border`.

### 6.2 O que deixaria de ser distinguível só por cor
- **Links sem sublinhado:** `whyText` ("Por que este número?"), `swapText`, `editBtnText` do Perfil, "Salvar" do cabeçalho (CreateWorkout e EditBodyData) e `moreText` hoje se reconhecem como tocáveis pela cor amarela. Em cinza, precisam de sublinhado, ícone ou caixa.
- **Títulos de seção e de sugestão** (`heading`, `tipTitle`, `notesTitle`, `planPreviewTitle`): hoje se separam do corpo pela cor; em branco, só por peso 700 e tamanho.
- **Texto de item selecionado** (`ageLabelActive`, `filterChipTextActive`, `selectedCount`): se o texto passa a branco, o selecionado depende da borda e do fundo amarelos; o chip selecionado de fundo cheio mantém texto preto. O estado selecionado continua acompanhado de forma (marca de seleção, ponto do rádio, preenchimento), exceto onde só a borda muda (`profileChipActive`, `exCardActive`, `ageCardActive`): ali a borda amarela é o único indicador e a regra mantém o amarelo.
- **Barras e pontos de página**: o ponto ativo do carrossel e do onboarding também muda de largura (20 e 22 contra 8 do ponto inativo), então a forma ajuda; o preenchimento de progresso e as bolinhas de série do treino ativo dependem só de cor/preenchimento contra a trilha.
- **Faixas de saúde e força da senha:** o rótulo em texto acompanha a cor ("Bom", "Fraca"), então nada depende só de cor; trocar o amarelo da faixa "Bom" não esconde informação.
- **Aba ativa:** o ícone muda de contorno para preenchido, então a aba ativa não depende só de cor.
- **Ícones de estado** (concluído, ativo, pendente na checklist): hoje cor e forma diferem; se tudo virar cinza, a forma do ícone passa a ser o único sinal.

## 7. Riscos e o que NÃO será tocado

**Riscos**
- **Hierarquia visual:** o amarelo hoje guia o olhar em quase toda tela; sem ele, telas densas (Início, Série guiada, Perfil) podem ficar planas. Só o aparelho mostra.
- **Testes que leem o código-fonte** e citam `COLORS.primary` quebram a cada lote e precisam de ajuste mínimo (item 5).
- **Dois lotes de botões em andamento** (`visual-botoes` e `visual-botoes-lote2`): este plano toca os mesmos arquivos (`AuthParts`, `GuidedParts`, `HomeScreen`, `WorkoutsScreen`); os lotes 4 e 6 devem seguir a ordem dos lotes de botões para evitar conflito.
- **Tinta âmbar literal** (`#1A1700` e outros) está em 41 ocorrências: a troca por `bgCardAlt` muda também o contraste de bordas (por exemplo borda amarela sobre fundo `#1C1C1C`, 11,71:1, contra 12,37:1 hoje).
- **Cor por faixa** (item 4.7) e **laranja como "só erro"**: a faixa "Regular" do Duo Score e o nível de força da senha usam `warning`; a direção pede laranja só para erro.
- **Identidade da marca:** o logo continua amarelo sobre preto; o app fica com menos presença da marca fora dele.

**O que NÃO será tocado**
- Imagens: `logo.png`, ícone do app, tela de abertura, fotos de exercício, banners e imagens do marketplace.
- `app.json` e os plugins (não contêm amarelo).
- Cores semânticas de erro (`COLORS.error`), aviso (`COLORS.warning`) e sucesso (`COLORS.success`), até a decisão do item 4.7.
- `SocialButton` (Google, Apple) e as cores de marca de terceiros.
- O próprio tema: `COLORS.primary`, `primaryPressed`, `danger` e `BUTTON` continuam existindo.
- Botão primário (25 ocorrências), item selecionado (54), aba ativa, cursor: continuam amarelos.
- Navegação, lógica, textos e ordem de blocos das telas.
- A tela de recuperação do `ErrorBoundary` fica fora até haver decisão sobre o emblema e os botões dela, porque não pode depender de componentes que usem contexto.

## 8. Itens não verificáveis sem o aparelho
- Se o app continua com identidade de marca legível quando a cor fica concentrada em botão primário e itens selecionados.
- A hierarquia de cada tela sem amarelo nos títulos, números e ícones.
- Cinzas ao ar livre e em brilho baixo (principalmente `textMuted` e `textSecondary` sobre `bgCardAlt`).
- O modo de contraste alto e inversão de cores do sistema.
- Daltonismo: a diferença entre cinzas vizinhos e entre o laranja de aviso e o vermelho de erro depende da percepção real.
- A classificação por papel foi automática com revisão por amostragem; linhas de fronteira podem ter outra leitura e devem ser conferidas na tela.
