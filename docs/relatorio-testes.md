# Relatório de testes de integração (branch `testes-integracao`)

Só testes, helpers de teste e documentação foram escritos: **nenhum código de produção do app foi alterado** (a única mudança fora de `backend/test/` e `docs/` é o script `test:all` no `package.json`). Tudo roda sem rede, sem credenciais e sem segredos: provedores falsos, bibliotecas de saúde falsas e armazenamento em memória.

## Como rodar tudo

```
npm run test:all
```

Roda, em ordem: `npm --prefix backend test` (vitest), `npm --prefix backend run typecheck`, `node scripts/check-no-secrets.mjs`, `node scripts/check-pngs.mjs` e `npx expo-doctor`. Só os testes novos: `cd backend && npx vitest run test/integracao-*.test.ts`.

## O que foi coberto, por área

Arquivos novos (141 testes: **136 passam + 5 "falha esperada" (`it.fails`) que documentam bugs**):

| Área | Arquivo | Testes | O que cobre |
|---|---|---|---|
| 1. Cadastro e conta | `integracao-conta.test.ts` | 41 | Idade (<13 bloqueado e conta excluída, 13 a 17 só com responsável, 18+; entradas inválidas; valor adulterado), nome/e-mail/senha, senha comum aceita mas limitada em "Razoável", aceite dos Termos/Política com links presentes e ausentes, exclusão de conta (a outra conta fica intacta; falha online não apaga nada), sair/entrar restaurando a MESMA conta, duas contas A→B→A→B sem vazar (`@duoacct:<uid>:snapshot`), queda antes de sair, snapshot corrompido |
| 2. Saúde | `integracao-saude.test.ts` | 17 | Botão Conectar (desligado → disponível → conectado → desconectado, iOS e Android), HealthKit e Health Connect com mocks (concedida, negada, vazia, parcial, indisponível, "precisa atualizar"), vazio = "sem dados" e não erro (nada é apagado), menor de 18 (provedor manual, sem conexão, sem peso no Duo Score, plano sem categoria de IMC de adulto), persistência da conexão |
| 3. Marketplace | `integracao-marketplace.test.ts` | 14 | Carrossel **renderizado** com os 3 banners na ordem atual e rótulos de acessibilidade, toque abrindo `AnunciarMarketplace`, pontos de navegação, selo "Exemplo" (itens e foto), itens, filtros, contato, imagens existentes/JPEG/limite de tamanho e `check-pngs` de verdade |
| 4. Treino e hábitos | `integracao-treino.test.ts` | 19 | Fuso **America/Sao_Paulo** (23:59 → 00:00, UTC → dia local, sequência cruzando a meia-noite, água, virada de mês/ano/bissexto), sessões, XP, conquistas (nunca revogadas), leitura de volta e chave corrompida, água (teto, meta), peso (vírgula, faixa, um por dia), modelo antigo → novo sem alterar o antigo |
| 5. Navegação e estado | `integracao-navegacao.test.ts` | 15 | `decideGate` em todas as combinações, rotas protegidas por árvore, **todo `navigate()` aponta para uma rota registrada**, deep links (não existem), ErrorBoundary e recuperação, reset só apaga `@duo_*` |
| 6. Firebase | `integracao-firebase.test.ts` | 15 | Seleção do provedor, provedor falso só na web por URL, interface, limitador de tentativas, regras de referência, nenhum arquivo de configuração real versionado, `check-no-secrets` |
| 7. Configuração e build | `integracao-config.test.ts` | 11 | Plugins avaliados **de verdade pelo Expo** (`expo config --type introspect`) com e sem flags; sem flag é idêntico ao de hoje; `NSHealthUpdateUsageDescription` ("não grava") quando a flag liga; permissões `READ_*` sem `WRITE_*`; `check-android-project` e `check-ios-project`; `check-no-secrets`, `check-pngs`, `check-autolinking` |
| 8. Acessibilidade | `integracao-acessibilidade.test.ts` | 9 | Análise estática de todos os toques das telas e componentes (nome acessível, papel, alvo de 44 pt) |

Helper novo: `backend/test/helpers/memstore.ts` (armazenamento em memória). Além disso, já existiam ~1.350 testes (contas, saúde, marketplace, workflows etc.) que continuam passando.

## O que NÃO foi coberto, e por quê

- **Aparelho real necessário:** HealthKit e Health Connect de verdade (folha de permissões, Apple Watch, Pixel/Galaxy Watch), VoiceOver/TalkBack e texto grande, o tamanho visual dos banners e dos cartões, o teclado sobre os campos, login real com Google/Apple, e-mail de verificação, notificações, vídeo (player).
- **Firebase/emuladores:** o projeto **não tem emuladores configurados** (sem `firebase.json`, `.firebaserc` nem `firebase-tools`). Tudo foi com mocks; sem cobertura real para login com Google/Apple, verificação de e-mail, renovação do token, exclusão no servidor e as regras do Firestore/Storage (que ainda nem estão publicadas).
- **Build nativo:** compilação iOS/Android, assinatura, keychain, altool/Play (só os workflows reais validam). Os plugins são checados pelo `expo config`, não por um `prebuild` completo.
- **React renderizado de ponta a ponta:** o app não tem renderizador de telas completo nos testes; só os componentes simples (carrossel, links, botões) rodam no renderizador mínimo. As telas inteiras (HealthScreen, SignUp…) são conferidas por análise do código-fonte e pela lógica pura. O smoke web com Playwright (fora do repositório) cobre o fluxo na web.
- **Deep links:** o app não declara esquema nem `linking`; nada a testar (o teste registra isso).
- **Tamanho de alvo (44 pt)** só é verificado quando o estilo declara largura/altura numérica; tamanhos calculados ou vindos de texto não aparecem na análise estática.

## Bugs encontrados (nenhum foi corrigido: os testes estão com `it.fails`)

| # | Gravidade | Onde | Passo para reproduzir | Teste |
|---|---|---|---|---|
| **B3** | Média (acessibilidade) | 14 toques sem nome acessível: botões só com ícone, sem `accessibilityLabel`. Ex.: `src/screens/WorkoutsScreen.js:17` (adicionar treino), `ExercisesScreen.js:56` (limpar busca), `CreateWorkoutScreen.js:39` (fechar), `ExerciseDetailScreen.js:17` (voltar), `EditBodyDataScreen.js:63`, `AIPersonalTrainerScreen.js:569/619/642`, `ActiveWorkoutScreen.js:105`, `SmartPlanScreen.js:217`, `WorkoutDetailScreen.js:24/27`, `onboarding/BodyDataScreen.js:42`, `onboarding/LevelSelectScreen.js:33` | Ligar o VoiceOver/TalkBack e focar o botão "+" de Treinos: o leitor lê só "botão" | `integracao-acessibilidade` "REGRA COMPLETA … nome acessível" |
| **B4** | Baixa/Média (acessibilidade) | 52 toques sem `accessibilityRole` (lista completa no baseline do teste) em `ActiveWorkoutScreen`, `CreateWorkoutScreen`, `ExercisesScreen`, `HomeScreen`, `WorkoutsScreen`, `ProfileScreen`, `SmartPlanScreen`, `WorkoutDetailScreen`, `onboarding/*` e `AIPersonalTrainerScreen` | Com leitor de tela, os toques não são anunciados como botão/caixa de seleção | `integracao-acessibilidade` "REGRA COMPLETA … papel" |
| **B5** | Baixa (acessibilidade) | 2 alvos com estilo menor que 44 pt e sem `hitSlop`: `src/screens/AIPersonalTrainerScreen.js:619` (botão de confirmar chips) e `src/screens/WorkoutsScreen.js:17` (botão "+", `styles.addBtn`) | Conferir o tamanho do estilo no arquivo; em aparelho, tentar tocar com o dedo | `integracao-acessibilidade` "REGRA COMPLETA … alvo mínimo" |
| **B1** | Baixa (privacidade) | `src/utils/errorRecovery.js:28-31` (`describeError`) e `src/components/ErrorBoundary.js:41`: a mensagem da exceção vai como veio para `console.error`. Se uma exceção carregar um valor de saúde na mensagem, ele cai no log local (regra do projeto: dado de saúde nunca em log) | `describeError(new Error('peso 71,3 kg'))` devolve o texto inteiro | `integracao-navegacao` "a descrição do erro não vaza…" |
| **B2** | Baixa (documentação) | `firebase/firestore.rules` (comentário de cabeçalho): diz "nada de dados de menores (a conta é 18+)", mas a idade mínima agora é 13 com responsável (`src/config/account.js`). As regras não estão publicadas | Ler o cabeçalho do arquivo | `integracao-firebase` "o comentário das regras…" |

Os testes com `it.fails` **passam** enquanto o bug existe e **passam a falhar quando o bug for corrigido**: nesse dia, troque `it.fails` por `it` (e, no caso de B3/B4/B5, esvazie o baseline). Os testes de **catraca** da acessibilidade impedem novas violações enquanto isso.

Observações (não são bugs):
- O botão "Conectar" da Saúde, a frase de aceite e o carrossel foram corrigidos em branches anteriores; os testes novos os travam.
- A idade máxima aceita é 119 (120 já é recusado).
- Nas duas contas com a mesma pessoa e dois e-mails, os dados não se misturam (por desenho: cada conta tem o próprio snapshot).

## Resultado da última execução

Veja o final desta branch (resumo colado na entrega): vitest, typecheck, check-no-secrets, check-pngs e expo-doctor.
