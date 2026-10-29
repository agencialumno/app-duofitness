# Pendências do usuário (passos SEUS, em ordem)

Nada abaixo foi feito por mim: exige as suas contas (Firebase, Google Cloud, Apple, GitHub), o seu aparelho ou o seu advogado.
Os builds de hoje seguem idênticos enquanto `EXPO_PUBLIC_AUTH_ENABLED` e `FIREBASE_ENABLED` estiverem vazias.
Os módulos nativos do Firebase NÃO estão no `package.json` do repositório: com `FIREBASE_ENABLED=true` o workflow os grava no `package.json` do runner (`scripts/install-firebase-deps.mjs`, antes do prebuild e do check-autolinking; nada é commitado). Se o passo "Conferir autolinking" falhar com Firebase ligado, a mensagem mostra a causa e a ordem esperada: `npm ci -> firebase-prepare -> install-firebase-deps -> expo prebuild -> check-autolinking`.

## 1. Console do Firebase (projeto `duofitness-app`)

1. Authentication > Sign-in method: ativar **E-mail/senha** (e deixar "Link por e-mail" desligado). O Google e a Apple você já configurou.
2. Authentication > Settings > **Proteção contra enumeração de e-mails**: ligar.
3. Authentication > Settings > **Política de senha**: comprimento mínimo 10; exigir maiúscula, minúscula, número e caractere especial (o servidor impõe; "sem espaços" e "sem e-mail/nome" ficam só no app). Se a opção não aparecer no seu plano, anotar e me avisar.
4. Authentication > Templates: traduzir para português o e-mail de **verificação**, **redefinição de senha** e **alteração de e-mail** (nome exibido: Duo Fitness). Domínio próprio para os e-mails fica para depois do primeiro build interno.
5. Authentication > Settings > Domínios autorizados: conferir a lista (remover o que não usa).
6. App Check: registrar os apps em modo **monitoramento** (Android: Play Integrity; iOS: App Attest). NÃO impor ainda (o APK avulso não passa no Play Integrity).
7. Não criar Firestore nem Storage agora. As regras de referência estão em `firebase/` e NÃO foram aplicadas.
8. Conferir se os **alertas de orçamento** do projeto cortam ou só avisam (só avisam, em regra); criar alertas em valores baixos.

## 2. Google Cloud (mesmo projeto)

1. Credenciais: **restringir as chaves de API** do Android (pacote `com.duofitness.app` + SHA-1) e do iOS (bundle id). Não é segredo, mas a restrição reduz abuso.
2. Tela de consentimento OAuth: nome do app "Duo Fitness", e-mail de suporte, links da política e dos termos (quando houver).
3. Orçamento e alertas de faturamento em valor baixo.

## 3. Apple Developer

1. App ID `com.duofitness.app`: confirmar a capability **Sign in with Apple** (você disse que já marcou).
2. Na primeira execução do `ios.yml` com Firebase ligado, o perfil gerenciado é regenerado com o entitlement: conferir no resumo do job. Se falhar, ativar manualmente no portal.
3. App Store Connect > Privacidade do app: preencher conforme `docs/plano-conta.md` (seção 10) e informar a URL da política de privacidade.
4. Conta de teste para o revisor: criar uma conta e-mail/senha já verificada e colocar nas notas de revisão.

## 4. GitHub (repositório)

Variáveis (Settings > Secrets and variables > Actions > **Variables**), todas opcionais:

| Variável | Valor | Para quê |
|---|---|---|
| `EXPO_PUBLIC_AUTH_ENABLED` | `true` | liga as telas de conta (vazio = desligadas) |
| `EXPO_PUBLIC_TERMS_URL` | URL dos termos | link na tela de cadastro (vazio = "em revisão") |
| `EXPO_PUBLIC_PRIVACY_URL` | URL da política | idem |
| `FIREBASE_ENABLED` | `true` | inclui o Firebase no build; cada plataforma só liga se o secret dela existir (sem secret: aviso e build normal) |

Secrets (Settings > Secrets and variables > Actions > **Secrets**), em base64 de uma linha:

```
base64 -w0 google-services.json      # -> FIREBASE_GOOGLE_SERVICES_JSON_B64
base64 -w0 GoogleService-Info.plist  # -> FIREBASE_GOOGLE_SERVICE_INFO_PLIST_B64
```
(no Windows/PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("google-services.json"))`). Não cole esses valores em nenhum chat, issue ou arquivo do repositório.
Ative também a **push protection** do repositório (Settings > Code security).

## 4b. Antes de ligar o Firebase nos builds

Rode o workflow **firebase-spike** (não usa secrets) e preencha `docs/medicoes-fase0.md`. Se o iOS ficar mais de 2x mais lento ou quebrar, me avise antes de seguir.
Ordem dos disparos e comandos de push: `docs/comandos-push.md`.

## 5. Revisões

1. **Jurídico:** termos de uso e política de privacidade (rascunhos em `docs/juridico/`, marcados "NÃO PUBLICAR"). Publique as páginas e preencha `EXPO_PUBLIC_TERMS_URL` e `EXPO_PUBLIC_PRIVACY_URL`. Decidir com o advogado quem é o **controlador** dos dados (Duo Fitness ou Lumno), a base legal e o tratamento de menores (a conta é só para 18+).
2. **Profissional de saúde:** revisar os textos de `src/data/infoContent.js` e as notas de `src/utils/imc.js` (hábitos, sem dieta/meta), a frase para menores de 18 e o tratamento de "Emagrecer" para menores.

## 6. Testes em aparelho (roteiro)

Pré-requisito: um build com `EXPO_PUBLIC_AUTH_ENABLED=true` e, para Firebase real, `FIREBASE_ENABLED=true` com os dois secrets.

1. **Sem a flag:** instalar o build normal. As boas-vindas têm "Começar agora" como sempre. Tudo igual.
2. **Com a flag, sem Firebase** (conta-ui): "Criar conta" e "Entrar" aparecem; ao tentar entrar, a mensagem diz que a conta está indisponível nesta versão; "Continuar sem conta" funciona.
3. **Cadastro (conta-firebase):** a checklist ticka a cada tecla (ícone e texto); o botão só habilita com tudo; "tenho 18 anos" e termos; o e-mail de verificação chega em português; "Já verifiquei" funciona.
4. **Entrar** com senha errada e com e-mail inexistente: mesma mensagem. Cinco erros seguidos: espera.
5. **Esqueci a senha:** mensagem neutra; o e-mail chega.
6. **Google** (iOS e Android) e **Apple** (só iOS; não deve aparecer no Android). Testar também o conflito: criar conta por e-mail e entrar com Google do mesmo e-mail.
7. **VoiceOver/TalkBack:** a checklist anuncia "N de 7 requisitos" sem repetir a cada tecla; o campo focado fica visível com o teclado aberto; fonte grande no sistema não corta nada.
8. **Perfil > Conta:** e-mail e status; "Sair da conta" mantém os treinos; "Excluir conta" pede senha e a palavra EXCLUIR; depois a conta não entra mais. Com Apple: a exclusão revoga o token (conferir em Ajustes > Apple ID > Entrar com Apple).
9. **Modo Demo:** nenhum cartão de conta, nenhuma chamada de rede.

## 7. Se o `ios.yml` com Firebase falhar de novo

Baixe o artifact `xcodebuild-logs-<run>` (sobe em qualquer falha, inclusive do prebuild e do pod install; já sanitizado) e leia o resumo do job: o `ios-log-hints` diz a causa e a ação, ou mostra as primeiras 40 linhas de erro. Confira no resumo a linha "Podfile COM Firebase: ok". Depois de uma execução bem-sucedida, preencha a tabela "depois da correção" em `docs/medicoes-fase0.md` (limite: 2x).

## 8. Certificados da conta Apple

- Depois de revogar à mão os certificados de desenvolvimento "Created via API", **não crie mais**: o `ios.yml` agora faz o archive sem assinatura. Se ver de novo "maximum number of certificates", só pode ter rodado com `sign_archive=true`; revogue só os Development "Created via API" (nunca os Distribution nem o "Distribution Managed") e confira antes se outro pipeline os usa.
- Na próxima execução do `ios.yml` (`upload=false`), confira no resumo: "archive sem assinatura (padrão)", a assinatura de distribuição validada e "entitlements do .ipa conferidos". Se o export recusar o archive sem assinatura, rode com `sign_archive=true` ou considere o certificado fixo (.p12) descrito em `docs/testflight.md`.

## 9. Login com Google abre o seletor de contas e volta com erro (iPhone)

O código agora cobre o que dava para cobrir (URL scheme explícito, checagens no CI e mensagens que dizem o motivo). O que sobra é **configuração sua** e só se confirma no aparelho:

1. **Firebase Console > Authentication > Sign-in method:** confirme que **Google** está **Ativado** (com e-mail de suporte do projeto).
2. **Baixe o `GoogleService-Info.plist` de novo** (Configurações do projeto > Seus apps > app iOS `com.duofitness.app`) **depois** de ativar o Google. Um plist baixado antes **não tem** `CLIENT_ID`, `REVERSED_CLIENT_ID` nem `SERVER_CLIENT_ID`, e sem eles o retorno do Google não volta ao app.
3. Gere o base64 do plist novo e **atualize o secret** `FIREBASE_GOOGLE_SERVICE_INFO_PLIST_B64` (GitHub > Settings > Secrets). Faça o mesmo com o `google-services.json` se for testar no Android.
4. Rode o `ios.yml`. O passo do `firebase-prepare` agora **falha com a mensagem "foi baixado ANTES de ativar o login com Google"** se o plist ainda estiver sem esses campos, e o passo "Conferir o projeto iOS gerado" falha com `[Google URL scheme]` se o `Info.plist` não ficar com o esquema do Google. Nenhum valor é impresso.
5. No iPhone, ao falhar, a tela mostra o motivo (por exemplo "O Google não devolveu a identificação da conta") e o **código bruto** aparece no console do aparelho (`[Google Sign-In] ...`, nunca token nem e-mail): conecte o iPhone ao Mac e veja pelo Console.app, filtrando por "Google Sign-In", e me diga o código.
6. Se o erro for do Firebase (`auth/invalid-credential` ou `auth/operation-not-allowed`), confira o passo 1 e, no Google Cloud Console, se o cliente OAuth **iOS** do app existe com o bundle id `com.duofitness.app`.

## 10. Conta obrigatória e menores de 18 anos (branch `conta-obrigatoria`)

O app agora **só entra com conta** (e-mail e senha, Google, Apple no iOS) e aceita **menores de 13 a 17 anos** com a autorização do responsável. Antes de publicar:

1. **Revisão jurídica:** a **idade mínima** (`MIN_ACCOUNT_AGE = 13` em `src/config/account.js`) e o **texto da autorização do responsável** ("Confirmo que tenho autorização do meu responsável legal para usar o app", `GUARDIAN_CONSENT_TEXT` no mesmo arquivo) precisam de revisão de um advogado (LGPD, art. 14, tratamento de dados de crianças e adolescentes; COPPA se houver público nos EUA). Mudar a idade é trocar a constante.
2. **Política de privacidade e etiqueta de privacidade da App Store** precisam refletir **menores com conta**: quais dados ficam só no aparelho (idade, treinos, saúde), o que o login coleta (e-mail, nome, identificador da conta) e a autorização do responsável. Publique a política e preencha `EXPO_PUBLIC_PRIVACY_URL` (o link da etapa de idade usa essa variável).
3. **Questionário de classificação etária** (App Store Connect): refaça com as respostas corretas para o conteúdo do app, incluindo que há conta de usuário e menores usando.
4. **Conta de teste fixa para o revisor da Apple:** como a conta agora é obrigatória, crie uma conta (e-mail e senha, **maior de 18 anos**, e-mail verificado, perfil já preenchido) e informe e-mail e senha em *App Store Connect > Informações do app > Informações de revisão > Conta de demonstração*. Sem isso o revisor não entra no app.
5. **Sincronização com a nuvem** fica para uma fase futura: hoje os dados de cada conta ficam **só neste aparelho** (snapshot por conta). Trocar de celular ou reinstalar o app começa do zero.
6. **Build com contas:** como a conta é obrigatória, o build precisa de `EXPO_PUBLIC_AUTH_ENABLED=true` **e** de `FIREBASE_ENABLED=true` com os secrets do Firebase (veja as seções 1 a 3). Sem isso a tela de boas-vindas avisa que a conta está indisponível e ninguém consegue entrar.
7. Quem usava o app **sem conta** antes: os dados do aparelho são adotados pela **primeira conta que entrar** (que ainda passa pela etapa de idade). Os dados de exemplo do antigo Modo Demo não são adotados.

## 11. ID de cliente Web do Google (login com Google que "tenta de novo" e não conecta)

Causa técnica: o app configurava o Google com `webClientId: 'autoDetect'`, mas esse valor **não existe** no pacote `@react-native-google-signin/google-signin` 16.1.5 (versão fixada). No iOS, `ios/RNGoogleSignin.mm` (linha 100) repassa `options[@"webClientId"]` direto como `serverClientID` da `GIDConfiguration`; no Android, `android/src/main/java/com/reactnativegooglesignin/Utils.java` (linhas 65 a 66) faz `requestIdToken(webClientId)` com o mesmo texto. Uma busca por `autoDetect` em todo o pacote não encontra nada: nenhuma parte o resolve a partir do `GoogleService-Info.plist` ou do `google-services.json`. Então o texto literal "autoDetect" vira o ID de cliente do servidor, o `idToken` não tem o `aud` que o Firebase aceita (ou o login falha antes), e o Firebase recusa. Por isso o app agora lê **`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`** e só cai no `'autoDetect'` quando a variável está vazia (comportamento antigo).

O que fazer:

1. Firebase Console > **Authentication > Método de login > Google > Configuração do SDK da Web**: copie o **ID do cliente da Web** (termina em `.apps.googleusercontent.com`). Ele é **público**, não é segredo. (Também aparece no `google-services.json`, em `oauth_client` com `client_type: 3`.)
2. GitHub > Settings > Secrets and variables > Actions > aba **Variables**: crie `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` com esse valor (variável, não secret).
3. Rode o `android.yml` e o `ios.yml` de novo. Se a variável estiver vazia com `FIREBASE_ENABLED=true`, o passo do Firebase mostra o aviso "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID vazio: o login com Google pode falhar" (o build segue; o valor nunca é impresso).
4. No aparelho, se ainda falhar, a tela mostra "Código: ... · etapa: ..." (sem dados pessoais): me envie essa linha.
