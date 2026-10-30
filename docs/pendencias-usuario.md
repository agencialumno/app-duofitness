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

## 12. HealthKit (Apple Saúde): o que fazer antes de testar com o Apple Watch

1. **Variável do repositório:** GitHub > Settings > Secrets and variables > Actions > **Variables** > `HEALTH_INTEGRATION_ENABLED` = `true`. Uma só variável liga tudo (plugin, módulos, JavaScript e a checagem do `.ipa`). Sem ela o app fica como sempre.
2. **Capability no portal da Apple:** developer.apple.com > Certificates, Identifiers & Profiles > Identifiers > `com.duofitness.app` > marque **HealthKit** (e **não** marque "Clinical Health Records"). Salve. Se o export reclamar de perfil, regenere pelo próprio workflow.
3. **Rode o `ios.yml` com `sign_archive=true`** (o archive sem assinatura não grava entitlements; ver `docs/testflight.md`). Se o passo "Conferir os entitlements do .ipa" falhar com `Falta no .ipa o entitlement com.apple.developer.healthkit`, é isso.
4. **Política de privacidade e etiqueta da App Store:** declare que o app **lê** dados de saúde (atividade, sono, frequência cardíaca, peso, água) do Apple Saúde **no aparelho**, só leitura, sem enviar a servidores e sem uso para publicidade. A App Store exige a justificativa do HealthKit na revisão: mencione "mostrar a evolução do usuário na tela Saúde".
5. **Risco de compilação:** o primeiro build com a biblioteca (Nitro) e frameworks estáticos pode falhar no Mac. Baixe o artifact `xcodebuild-logs-<run>` e me envie o erro; o primeiro remédio é descrito em `docs/saude.md` (forceStaticLinking dos três pods).

## 13. Erro 90683 do HealthKit (Missing purpose string) e as notas de revisão

- O erro `Missing purpose string ... NSHealthUpdateUsageDescription (90683)` foi corrigido no código: o plugin agora escreve a chave com o texto "O Duo Fitness não grava dados no app Saúde. Ele apenas lê os dados que você autorizar. Esta permissão não é usada." (com `HEALTH_INTEGRATION_ENABLED=true`). Rode o `ios.yml` de novo (`sign_archive=true`).
- **No envio à App Store (não só ao TestFlight)**, nas **notas de revisão** (App Store Connect > o app > a versão > "Informações de revisão" > Notas), escreva: *"O Duo Fitness usa o HealthKit somente para leitura (atividade, sono, frequência cardíaca, peso e água) para mostrar a evolução do usuário no próprio aparelho. O app não grava dados no app Saúde: a chave NSHealthUpdateUsageDescription existe apenas porque a biblioteca de leitura referencia essas APIs, e ela não é usada."* Sem isso o revisor pode estranhar a chave de escrita.
- Se o altool falhar de novo, o resumo do job agora diz a causa (ITMS-90683 com o nome da chave, build repetido, ícone, entitlement fora do perfil ou permissão da chave de API). Os logs completos do altool estão em `ipa-validate.log` e `ipa-upload.log` no artifact `xcodebuild-logs-<execução>`.

## 14. Assinatura manual do iOS (certificado de distribuição fixo)

- Para parar de criar certificados de desenvolvimento a cada execução (e estourar o limite da conta), crie os 3 secrets: `IOS_DIST_CERT_P12_B64`, `IOS_DIST_CERT_PASSWORD` e `IOS_PROVISIONING_PROFILE_B64`. Passo a passo (certificado Apple Distribution, exportar o `.p12` com a chave privada, perfil App Store com o MESMO certificado e as capabilities ligadas, `base64 -i ... | pbcopy`) em `docs/testflight.md`, seção "Assinatura MANUAL".
- Com os secrets, `sign_archive` deixa de ser necessário. Sem eles, tudo segue como antes (aviso "Assinatura fixa NÃO configurada").
- **Anote a data de validade**: certificado e perfil valem 1 ano; renove e atualize os secrets antes (o resumo do job mostra "expira em").
- Se ligar HealthKit ou Sign in with Apple depois de criar o perfil, **recrie o perfil** e atualize `IOS_PROVISIONING_PROFILE_B64`.
- Não foi possível testar o keychain nem a assinatura fora do macOS do GitHub: a primeira execução com `upload=false` é a validação.

## 15. Health Connect (Android) e a Google Play

- **Variável:** a mesma `HEALTH_INTEGRATION_ENABLED=true` (Settings > Secrets and variables > Actions > Variables) liga o Health Connect no `android.yml` e o HealthKit no `ios.yml`. Sem ela, nada muda.
- **O APK avulso funciona sem declaração nenhuma** (instalação direta, teste interno por arquivo). **A loja exige a declaração** para publicar um app que usa o Health Connect.
- **Formulário "Health apps" (Play Console > o app > Política > Conteúdo do app > Declaração de apps de saúde)**: marque a categoria Saúde e fitness e, na tela seguinte, para **cada tipo** justifique o uso, em português simples e sem promessa médica. Tipos usados e justificativa sugerida (todos **somente leitura**):
  - Passos, energia ativa, exercício: "Mostrar a atividade do dia e a tendência de 7 e 30 dias dentro do app."
  - Frequência cardíaca, em repouso, variabilidade, VO₂ máx.: "Mostrar o valor e a tendência da própria pessoa, comparando com ela mesma. Não há diagnóstico."
  - Sono: "Mostrar duração e horários de dormir e acordar."
  - Peso e % de gordura (só maiores de 18): "Acompanhar as medidas ao longo do tempo."
  - Hidratação: "Mostrar os copos de água do dia."
  - Declare que o app **não grava** no Health Connect, **não lê em segundo plano** e **não pede o histórico** além dos 30 dias.
- **Seção "Segurança dos dados" (Data safety):** dados de saúde e fitness coletados: sim, **tratados só no aparelho**; **não compartilhados** com terceiros; **não enviados ao servidor**; coleta **opcional** (o usuário concede); o usuário pode pedir a exclusão (Desconectar apaga os dados importados; Excluir conta apaga o resto). Confira se o texto bate com a política de privacidade.
- **Política de privacidade:** precisa estar publicada em uma URL (`EXPO_PUBLIC_PRIVACY_URL`) e na ficha da loja, e **mencionar** o Health Connect: o que é lido, para quê, que fica só no aparelho, que não é compartilhado, e como retirar a permissão. O rascunho está em `docs/juridico/`. A tela Conectar tem o botão que abre essa política.
- **Tela de justificativa:** o app declara o filtro e o alias exigidos pelo Health Connect, mas ambos abrem o app (não uma tela dedicada). Se a revisão pedir que abram a política direto, avise: o próximo passo é uma activity nativa mínima.
- **Notas de revisão (cole no envio):** "O Duo Fitness lê dados do Health Connect SOMENTE PARA LEITURA (passos, energia ativa, exercício, frequência cardíaca, sono, peso, % de gordura e hidratação) para mostrar a evolução do usuário no próprio aparelho, depois que ele concede cada permissão. O app não grava no Health Connect, não lê em segundo plano, não usa o histórico além de 30 dias e não envia esses dados a servidores. Menores de 18 anos não têm acesso à integração. Para testar: Saúde > Conectar > Conectar ao Health Connect."
- **Teste num Android real com relógio** antes de enviar (roteiro em `docs/saude.md`, seção "Health Connect"): nada disto pôde ser validado no CI.
- Os nomes exatos das telas da Play Console mudam; confira o guia oficial "Declare access to Health Connect data types" (developer.android.com/health-and-fitness).

## 16. Imagens novas do marketplace (6 arquivos): marca, alegações e licença

- **Marca "PRO NUTRITION" na imagem do whey** (`whey.jpg`, frasco e embalagem): confirme que **não é uma marca real** (pesquise no INPI e na internet). Se existir ou houver dúvida, troque a arte antes de qualquer push: este repositório é público e o histórico do git é permanente. As artes com nome de marca já foram trocadas antes (docs/midia-pendente.md); esta nova voltou a trazer um nome. **Não faça push desta branch antes de decidir isso.**
- **Alegações da arte do whey** ("auxilia no ganho de massa muscular", "24 g de proteína por porção", "5,4 g de BCAAs", "contribui para a recuperação muscular", "compra 100% segura", "entrega para todo o Brasil", "mais resultados"): são **só de exemplo**, não descrevem produto real, e o Duo Fitness não vende nem entrega (o aviso do marketplace diz isso). O app marca o item como "Exemplo" (lista, detalhe e Home), mas a imagem em si traz as frases. Antes de publicar na loja, troque por arte sem alegações de saúde, de preço, de segurança de compra ou de entrega (política das lojas e regras de publicidade de suplementos).
- **Origem e licença das 6 imagens** (`banner-anuncie`, `banner-treino`, `banner-vitrine`, `suplemento`, `proteina`, `whey`): anote de onde vieram (criadas por você, por um designer ou geradas por IA, e com qual ferramenta/termos) e confirme o direito de uso comercial. As cenas têm pessoas/partes do corpo (braços, tronco) e o logotipo da Duo Fitness: confirme que não há rosto, marca ou foto de terceiros reconhecível. Sem essa confirmação, não publique.
- **Nome dos arquivos:** dois banners têm nome que não combina com o texto (docs/marketplace.md, "Mapa das 6 imagens"); decida se quer renomear.
- Os 6 arquivos foram regravados como JPEG de verdade (os originais eram PNG com extensão .jpg) e otimizados para ~100 a 200 KB; guarde os originais grandes **fora do git**.
