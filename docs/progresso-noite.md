# Progresso da noite (modo autônomo, orçamento de 2 horas)

Início: **07:18** (`date`: Fri Oct 23 07:18:30 2026). Limites: 09:03 (1h45, parar trabalho novo) e 09:18 (2h, entregar o commitado).

Regras seguidas: sem push, sem `gh`, sem workflows, sem tags, `main` intocada; nenhum segredo nem arquivo do Firebase lido ou versionado;
chaves `@duo_*`, `workoutGenerator.js` e comportamento de adultos intactos (hashes de `imc.js` e `planForAge.js` iguais).

## Etapa 1: ajuda-textos

- (c) Frase para menores de 18 ("Para menores de 18 anos, a série foca em hábitos e técnica.") em `infoContent.js` (`MINOR_FOCUS_NOTE`, `getObjetivosBlocks`) e na tela dos objetivos da série guiada, só para `under18`. Decisão: o onboarding (`ProfileSetupScreen`) pergunta o objetivo ANTES da faixa etária, então a frase não aparece lá (não há como saber a idade ainda); aparece na série guiada, onde o objetivo é editável e a idade já é conhecida.
- (b) Smoke do player: causa provável da intermitência = o vídeo de teste gravado no navegador (MediaRecorder) às vezes sai vazio/lento com a máquina ocupada. Correção: o teste só segue depois de um `<video>` de prova disparar `loadeddata` (grava de novo, até 4 vezes, se não ficar pronto). Nada de repetir o passo.
- (a) Suíte completa: `npm test` 747 ok, `typecheck` ok, `expo-doctor` 18/18, `expo install --check` ok, `check-pngs`, `check-videos`, `check-autolinking` ok, `expo export --platform android` ok. Smoke web (fora do repositório, em %TEMP%\pw-smoke) com dois passos NOVOS (concluir um treino no Modo Demo; criar perfil de menor de 18 com "Emagrecer" e gerar a série): **48 passos OK, 0 erros de JS** (07:27). Os dois seletores do passo do menor falharam antes por erro MEU no teste (telas empilhadas e placeholder `70` x `170`), corrigidos no teste, não no app.

Ajuda-textos fechada às 07:28.

## Etapa 2: conta-ui (a partir da ajuda-textos), 07:28 a 07:47

Commits: `b76dcfa` política de senha; `a92f087` interface AuthProvider + Fake/Null + erros + limitador; `1733311` telas e fluxo; `7f382d2`/`26bc54c` testes de acessibilidade e flag.

Entregue, na ordem pedida:
1. `src/utils/passwordPolicy.js` (puro): 10+ caracteres (conta pontos de código: emoji vale 1), maiúscula, minúscula, número, símbolo, sem espaços, sem e-mail nem nome, lista de senhas comuns embutida (penaliza a força, não bloqueia), pontuação e rótulo de força. 23 testes (acentos, emoji, espaços).
2. `src/auth/`: interface (`authInterface.js`), `FakeAuthProvider` (testes e smoke), `NullAuthProvider` (convidado), `createAuthProvider`, `authErrors`, `attemptLimiter`, `authFlow`, `AuthContext`.
3. Cadastro com checklist em tempo real (ícone + texto "Atendido/Pendente", anúncio ao leitor de tela só quando o número de requisitos muda, com pausa), barra de força, mostrar/ocultar, confirmação, "18 anos ou mais" (sem ela orienta o modo sem conta), aceite dos termos (links que avisam "em revisão" enquanto a URL estiver vazia), `textContentType="newPassword"` e `passwordRules` no iOS.
4. Entrar, Esqueci a senha (resposta neutra), Verificar e-mail (reenviar com espera de 60 s e "Já verifiquei").
5. Boas-vindas com Criar conta / Entrar / Continuar sem conta SÓ com a flag; link do Modo Demo mantido; com a flag desligada a tela é a de antes.
6. Google nos dois sistemas e Apple SÓ no iOS (`Platform.OS`, função pura `showApple`); erros em português sem revelar se o e-mail existe; limite de tentativas no app; conflito de provedor com texto próprio.
7. Excluir conta no Perfil (cartão "Conta"): janela própria, exige digitar EXCLUIR e a senha (quem entra por e-mail). Sair não apaga os dados locais; excluir também não (ainda não há sincronização).

Decisões (conservadoras):
- Flag `EXPO_PUBLIC_AUTH_ENABLED` vazia = desligada. Ligada sem provedor real (conta-ui): `NullAuthProvider("unavailable")`, as telas aparecem e dizem "Conta indisponível nesta versão".
- O provedor falso só existe na web e só com `?duoFakeAuth=1` (não alcança iOS/Android). Gancho de teste `window.__duoFakeAuth`.
- Termos e política: `EXPO_PUBLIC_TERMS_URL` e `EXPO_PUBLIC_PRIVACY_URL` (variáveis opcionais); vazias, o link mostra "em revisão".
- Após cadastrar, vai para a verificação de e-mail, mas "Continuar" libera o app (a verificação só é exigida para nuvem e ações sensíveis, e ainda não há nuvem).
- O cartão de conta não aparece no Modo Demo.

Verificação (07:46): `npm test` 823 ok, `typecheck` ok, `expo-doctor` 18/18, `expo install --check` ok, `check-pngs`/`check-videos`/`check-autolinking` ok, `expo export --platform android` ok (flag desligada), **smoke principal (flag desligada) PASSOU**, **smoke da conta (flag ligada, provedor falso) PASSOU** (boas-vindas, checklist em tempo real, 18+/termos, Apple ausente na web, fluxo cadastro -> verificar -> perfil -> conta -> sair -> excluir, erro igual para e-mail inexistente e senha errada, limite de tentativas, recuperação neutra, conflito de provedor, 320 px, Modo Demo sem conta e sem rede).

Riscos: não testei em aparelho (iOS/Android) o teclado, o VoiceOver/TalkBack nem a fonte ampliada; só código e web. `passwordRules` é ignorado fora do iOS (esperado).

## Etapa 3: conta-firebase (a partir da conta-ui), 07:47 a 08:20

Commits (em ordem): `ee44d49` .gitignore do Firebase; `ce427ef` check-no-secrets no CI; `99a63fb` FirebaseAuthProvider + Firebase opcional; `ee10b7e` configuração por secrets + regras de referência; `160c496` firebase-spike.yml; `e32e4fa` medições da Fase 0; `c921418` rascunhos jurídicos.

- **.gitignore e CI primeiro**, em commits separados e antes de qualquer configuração do Firebase: `google-services.json`, `GoogleService-Info.plist`, `firebase/secrets/`, `.firebase-config/`, chaves de conta de serviço. `scripts/check-no-secrets.mjs` (ci.yml, android.yml, ios.yml, antes do `npm ci`) falha se esses arquivos estiverem versionados ou se qualquer arquivo versionado tiver `service_account`, chave privada ou o padrão `AIza`. Três testes antigos usam um cabeçalho PEM FALSO como fixture: liberados só para esse padrão, nesses dois arquivos.
- **FirebaseAuthProvider** (React Native Firebase 23.8.8, API modular): e-mail e senha, Google (`webClientId: "autoDetect"`, lido do arquivo do Firebase), Apple (nonce aleatório; a Apple recebe o SHA-256 e o Firebase o valor bruto; nome gravado na primeira vez) e exclusão de conta com reautenticação e **revogação do token da Apple antes de apagar**. Testado com módulos falsos (24 testes).
- **DECISÃO IMPORTANTE (diferente do que você esperava): os módulos nativos NÃO estão no `package.json`.** Motivo: o `@react-native-firebase/app` traz configuração própria de autolinking e NÃO dá para desligá-lo por `react-native.config.js` (testei); sem frameworks estáticos o `pod install` do iOS quebraria o build normal. Então `scripts/install-firebase-deps.mjs` os instala com `--no-save`, versões EXATAS (`firebase/native-deps.json`), só com `FIREBASE_ENABLED=true`. Sem a flag, `package.json`, lockfile e builds ficam idênticos (um teste confere). Contra: o lockfile não fixa as dependências transitivas do Firebase.
- `plugins/withFirebaseOptional.js` (no `app.json`): sem a flag ou sem os arquivos devolve o config intacto; com a flag, cada plataforma só liga se o arquivo existir (Google Services no Android; frameworks estáticos, `usesAppleSignIn` e URL scheme do Google no iOS). Verifiquei: prebuild do Android com arquivos falsos aplica o Google Services; introspecção do iOS mostra o entitlement e o URL scheme. O prebuild do iOS não roda no Windows: **o iOS com Firebase nunca foi gerado nem compilado**.
- `loadNativeProvider` usa `require` opcional dentro de `try/catch` direto (formato que o Metro aceita): o bundle compila sem os pacotes (testado). Sem módulos ou sem arquivo de configuração, o app segue convidado.
- **Workflows**: `firebase-prepare.mjs` decodifica o secret base64 (`FIREBASE_GOOGLE_SERVICES_JSON_B64`, `FIREBASE_GOOGLE_SERVICE_INFO_PLIST_B64`) para `.firebase-config/`, valida (JSON/plist, pacote/bundle `com.duofitness.app`), mascara a chave de API, nunca imprime o conteúdo e liga `FIREBASE_ENABLED` só para os passos seguintes; um passo `if: always()` apaga tudo ao fim. Sem a variável do repositório ou sem o secret: aviso e build normal. `check-autolinking` exige os módulos novos só com a flag.
- Regras do Firestore e do Storage em `firebase/` como **referência, não aplicadas** (o Firestore/Storage nem existem no projeto).
- Orçamento de build do Firebase: usei ~14 dos 20 minutos (o grosso foi descobrir que o `app` não se desliga no autolinking). Não estourou.

### Extras (sobrou tempo)

- Fase 0: `firebase-spike.yml` (só manual, sem secrets, arquivos falsos) e `docs/medicoes-fase0.md` com o que medi aqui e os pontos a confirmar. **Não disparei nada.**
- Rascunhos de termos e política em `docs/juridico/` (controlador a decidir: Duo Fitness ou Lumno; marcados "NÃO PUBLICAR").

## Resultado final (08:21)

| Verificação | ajuda-textos | conta-ui | conta-firebase |
|---|---|---|---|
| `npm test` (backend) | 747 ok | 823 ok | 871 ok |
| `typecheck` | ok | ok | ok |
| `expo-doctor` | 18/18 | 18/18 | 18/18 |
| check-pngs / videos / autolinking / no-secrets | ok | ok | ok |
| `expo export --platform android` | ok | ok | ok (sem módulos de Firebase) |
| smoke web principal (flag desligada) | 48/48 | passou | passou |
| smoke web da conta (provedor falso) | n/a | passou | passou (4 de 4 execuções) |

**Não verificado:** qualquer build nativo em CI (não havia push permitido); iOS com Firebase; Google/Apple reais; VoiceOver/TalkBack; teclado e fonte ampliada em aparelho; e-mails reais. O passo do player de vídeo do smoke passou nas últimas execuções depois da espera por "pronto" (ele falhou 2 de 8 antes); se voltar a falhar, é o vídeo gravado no navegador, não o app.

Riscos: (1) Firebase no iOS (frameworks estáticos, Xcode 26): rode o `firebase-spike` antes. (2) Versões do Firebase fixas na 23.8.8 por prudência. (3) A política de senha do servidor depende do console (pendência 1.3). (4) Os textos de termos e privacidade são rascunhos. (5) Sem sincronização, sair/excluir a conta NÃO apaga os dados locais (decisão 6 do plano).

Mensagem estranha recebida durante o trabalho (`32 ,0:}}}}^}]]]]]]]]]`): parecia digitação acidental; ignorada.
