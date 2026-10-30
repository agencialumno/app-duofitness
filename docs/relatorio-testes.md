# Relatório de testes de integração (branch `testes-integracao`)

Só testes, helpers de teste e documentação foram escritos: na branch `testes-integracao` **nenhum código de produção do app foi alterado** (a única mudança fora de `backend/test/` e `docs/` é o script `test:all` no `package.json`); as correções dos bugs estão na branch `correcoes-acessibilidade`, mais abaixo. Tudo roda sem rede, sem credenciais e sem segredos: provedores falsos, bibliotecas de saúde falsas e armazenamento em memória.

## Como rodar tudo

```
npm run test:all
```

Roda, em ordem: `npm --prefix backend test` (vitest), `npm --prefix backend run typecheck`, `node scripts/check-no-secrets.mjs`, `node scripts/check-pngs.mjs` e `npx expo-doctor`. Só os testes novos: `cd backend && npx vitest run test/integracao-*.test.ts`.

## O que foi coberto, por área

Arquivos novos (141 testes originais; depois das correções **todos passam** e não há mais `it.fails`):

| Área | Arquivo | Testes | O que cobre |
|---|---|---|---|
| 1. Cadastro e conta | `integracao-conta.test.ts` | 41 | Idade (<13 bloqueado e conta excluída, 13 a 17 só com responsável, 18+; entradas inválidas; valor adulterado), nome/e-mail/senha, senha comum aceita mas limitada em "Razoável", aceite dos Termos/Política com links presentes e ausentes, exclusão de conta (a outra conta fica intacta; falha online não apaga nada), sair/entrar restaurando a MESMA conta, duas contas A→B→A→B sem vazar (`@duoacct:<uid>:snapshot`), queda antes de sair, snapshot corrompido |
| 2. Saúde | `integracao-saude.test.ts` | 17 | Botão Conectar (desligado → disponível → conectado → desconectado, iOS e Android), HealthKit e Health Connect com mocks (concedida, negada, vazia, parcial, indisponível, "precisa atualizar"), vazio = "sem dados" e não erro (nada é apagado), menor de 18 (provedor manual, sem conexão, sem peso no Duo Score, plano sem categoria de IMC de adulto), persistência da conexão |
| 3. Marketplace | `integracao-marketplace.test.ts` | 14 | Carrossel **renderizado** com os 3 banners na ordem atual e rótulos de acessibilidade, toque abrindo `AnunciarMarketplace`, pontos de navegação, selo "Exemplo" (itens e foto), itens, filtros, contato, imagens existentes/JPEG/limite de tamanho e `check-pngs` de verdade |
| 4. Treino e hábitos | `integracao-treino.test.ts` | 19 | Fuso **America/Sao_Paulo** (23:59 → 00:00, UTC → dia local, sequência cruzando a meia-noite, água, virada de mês/ano/bissexto), sessões, XP, conquistas (nunca revogadas), leitura de volta e chave corrompida, água (teto, meta), peso (vírgula, faixa, um por dia), modelo antigo → novo sem alterar o antigo |
| 5. Navegação e estado | `integracao-navegacao.test.ts` | 15 | `decideGate` em todas as combinações, rotas protegidas por árvore, **todo `navigate()` aponta para uma rota registrada**, deep links (não existem), ErrorBoundary e recuperação, reset só apaga `@duo_*` |
| 6. Firebase | `integracao-firebase.test.ts` | 15 | Seleção do provedor, provedor falso só na web por URL, interface, limitador de tentativas, regras de referência, nenhum arquivo de configuração real versionado, `check-no-secrets` |
| 7. Configuração e build | `integracao-config.test.ts` | 11 | Plugins avaliados **de verdade pelo Expo** (`expo config --type introspect`) com e sem flags; sem flag é idêntico ao de hoje; `NSHealthUpdateUsageDescription` ("não grava") quando a flag liga; permissões `READ_*` sem `WRITE_*`; `check-android-project` e `check-ios-project`; `check-no-secrets`, `check-pngs`, `check-autolinking` |
| 8. Acessibilidade | `integracao-acessibilidade.test.ts` | 10 | Análise estática de todos os toques das telas e componentes (nome acessível, papel, alvo de 44 pt contando o `hitSlop`), com catraca em zero |

Helper novo: `backend/test/helpers/memstore.ts` (armazenamento em memória). Além disso, já existiam ~1.350 testes (contas, saúde, marketplace, workflows etc.) que continuam passando.

## O que NÃO foi coberto, e por quê

- **Aparelho real necessário:** HealthKit e Health Connect de verdade (folha de permissões, Apple Watch, Pixel/Galaxy Watch), VoiceOver/TalkBack e texto grande, o tamanho visual dos banners e dos cartões, o teclado sobre os campos, login real com Google/Apple, e-mail de verificação, notificações, vídeo (player).
- **Firebase/emuladores:** o projeto **não tem emuladores configurados** (sem `firebase.json`, `.firebaserc` nem `firebase-tools`). Tudo foi com mocks; sem cobertura real para login com Google/Apple, verificação de e-mail, renovação do token, exclusão no servidor e as regras do Firestore/Storage (que ainda nem estão publicadas).
- **Build nativo:** compilação iOS/Android, assinatura, keychain, altool/Play (só os workflows reais validam). Os plugins são checados pelo `expo config`, não por um `prebuild` completo.
- **React renderizado de ponta a ponta:** o app não tem renderizador de telas completo nos testes; só os componentes simples (carrossel, links, botões) rodam no renderizador mínimo. As telas inteiras (HealthScreen, SignUp…) são conferidas por análise do código-fonte e pela lógica pura. O smoke web com Playwright (fora do repositório) cobre o fluxo na web.
- **Deep links:** o app não declara esquema nem `linking`; nada a testar (o teste registra isso).
- **Tamanho de alvo (44 pt)** só é verificado quando o estilo declara largura/altura numérica; tamanhos calculados ou vindos de texto não aparecem na análise estática.

## Bugs encontrados e corrigidos (branch `correcoes-acessibilidade`)

Todos os cinco bugs abaixo foram **corrigidos**, um commit por bug. Os `it.fails` viraram testes normais que passam e os baselines das catracas de acessibilidade foram a **zero**.

| # | Estado | Commit | O que foi feito |
|---|---|---|---|
| **B2** (comentário das regras do Firestore) | ✅ corrigido | `953cd9b` | O cabeçalho de `firebase/firestore.rules` passou a dizer "conta 13+, com autorização do responsável entre 13 e 17". **A regra em si não mudou** e nenhuma regra executável checa idade (o teste confere). |
| **B1** (mensagem de erro em `console.error`) | ✅ corrigido | `7fe9b20` | `describeError` devolve só o **nome** do erro e o **código** (`Error (auth/network-request-failed)`), nunca a mensagem; nome/código com formato estranho (ou só numérico) são descartados. Teste: um valor de saúde dentro da mensagem não aparece em nenhum `console.error` do ErrorBoundary. |
| **B3** (14 botões só com ícone) | ✅ corrigido | `21d3a30` | `accessibilityRole="button"` e rótulo curto em português: "Criar treino", "Limpar busca", "Fechar", "Voltar" (8x), "Sair do treino", "Excluir treino", "Confirmar seleção" e "Enviar mensagem" (estes dois com estado desativado). |
| **B5** (alvos menores que 44 pt) | ✅ corrigido | `e1ce57c` | `hitSlop` de 3 pt no "+" de Treinos (38 → 44 pt) e de 6 pt no confirmar chips do Personal Trainer (32 → 44 pt). O desenho continua 38x38 e 32x32; o teste soma estilo + `hitSlop`. |
| **B4** (toques sem papel) | ✅ corrigido | `fea1423` | 37 toques ganharam `accessibilityRole` (eram 52 no relatório original; 14 já tinham sido tratados no B3 e 1 era contagem em duplicidade do levantamento). |

### B4: decisões e dúvidas (conferir com VoiceOver/TalkBack)
- **`button`**: todos os toques que navegam ou executam uma ação (Concluir, Pular descanso, próxima série, Salvar, Ver meus treinos, cartões da Home, Iniciar treino, linhas de exercício, etc.).
- **`checkbox` + `checked`**: seleção múltipla, onde se pode marcar mais de um: objetivos do onboarding (`ProfileSetupScreen`) e exercícios de "Novo treino" (`CreateWorkoutScreen`).
- **Dúvida (aplicado `button` + `accessibilityState={{ selected }}`, e não `radio`)**: escolhas exclusivas em forma de chip ou cartão: categoria e filtro do "Novo treino", categoria dos Exercícios, sexo (onboarding e Dados físicos), nível, opções do Gerador rápido e chips do Personal Trainer IA (que ora são únicos, ora múltiplos, conforme a pergunta). `radio` seria mais preciso para as exclusivas, mas o suporte do leitor de tela varia por plataforma; vale testar num aparelho e trocar, se preferirem.
- **Estados acrescentados** (não visuais): `disabled` nos botões "Continuar/Salvar/Próximo" que só ficavam apagados no estilo.
- Textos novos: só rótulos de acessibilidade. **Nenhuma mudança visual.**

Observações:
- O botão "Conectar" da Saúde, a frase de aceite e o carrossel foram corrigidos em branches anteriores; os testes novos os travam.
- A idade máxima aceita é 119 (120 já é recusado).
- Nas duas contas com a mesma pessoa e dois e-mails, os dados não se misturam (por desenho: cada conta tem o próprio snapshot).

## Resultado da última execução

Veja o final desta branch (resumo colado na entrega): vitest, typecheck, check-no-secrets, check-pngs e expo-doctor.
