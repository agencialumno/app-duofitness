# Build iOS e TestFlight

O workflow [`.github/workflows/ios.yml`](../.github/workflows/ios.yml) gera o app iOS assinado e o envia ao TestFlight, sem EAS e sem fastlane.

- **Runner:** `macos-26` (arm64), com Xcode 26.6 como padrão e o SDK do iOS 26. Desde 28/04/2026 a Apple só aceita no App Store Connect apps compilados com Xcode 26 ou mais novo. O workflow confere a versão e para cedo se o runner tiver um Xcode mais antigo.
- **Projeto nativo:** gerado em cada execução por `npx expo prebuild --platform ios --no-install` (a pasta `ios/` fica fora do git), depois `pod install`.
- **Assinatura:** o **archive é feito SEM assinatura** (padrão) e a assinatura de **distribuição** acontece só no **export** (cloud signing); o archive assinado automático fica atrás do input `sign_archive=true` (ver "Limite de certificados"). A assinatura do export é automática, pela chave da API do App Store Connect (`xcodebuild -allowProvisioningUpdates` com `-authenticationKeyPath/ID/IssuerID`). É o *cloud signing*: a Apple guarda o certificado de distribuição, e o runner não precisa de certificado nem de perfil em arquivo.
- **Envio:** o `.ipa` que o export gerou e verificou é validado e enviado com o `altool` (`--validate-app` e depois `--upload-app`, com `--type ios --apiKey --apiIssuer`), por `scripts/ios-upload.sh`. O envio pelo próprio `xcodebuild -exportArchive` (`destination: upload`) falhava com *No Accounts with App Store Connect Access* mesmo com a chave funcionando para assinar, então foi removido.
- **Versão e build:** a versão vem do `app.json` (`expo.version`). O build number é o `github.run_number`. O Expo grava `CFBundleShortVersionString` e `CFBundleVersion` no `Info.plist` com valores literais do `app.json` (`ios.buildNumber` "1"), e o `Info.plist` não usa `$(CURRENT_PROJECT_VERSION)`; por isso o workflow grava os dois valores no `Info.plist` **gerado** (`scripts/set-ios-version.sh`, com o PlistBuddy), logo depois do prebuild. O `app.json` versionado não muda, e o passo "Conferir versão e build number do archive" confirma o resultado no archive.
- **Gatilhos:** execução manual (*Actions → ios → Run workflow*) e tag `ios-v*`. Nada roda em pull request.

> **Não renomeie `ios.yml`.** O `run_number` é contado por arquivo de workflow. Renomear reinicia a contagem em 1, e o App Store Connect recusa build number repetido na mesma versão.

## Secrets

Cadastre em *Settings → Secrets and variables → Actions → New repository secret*.

| Secret | Obrigatório | O que é |
|---|---|---|
| `APPLE_TEAM_ID` | **sim** | Team ID da organização (10 caracteres; no *Membership details* do developer.apple.com) |
| `APPSTORE_ISSUER_ID` | **sim** | Issuer ID (App Store Connect → Users and Access → Integrations → App Store Connect API, no topo da página) |
| `APPSTORE_KEY_ID` | **sim** | Key ID da chave de API |
| `APPSTORE_PRIVATE_KEY` | **sim** | Conteúdo do `AuthKey_XXXX.p8` inteiro (com as linhas `BEGIN/END PRIVATE KEY`), ou esse conteúdo em base64 |
| `EXPO_PUBLIC_API_URL` | não | URL do backend. Sem ela o app é gerado **100% offline** |
| `EXPO_PUBLIC_APP_KEY` | não | mesmo valor do `APP_KEY` do backend |

Se faltar algum dos quatro obrigatórios, o workflow para logo no começo e lista **só os nomes** dos que faltam. O resumo da execução informa se a URL da API foi embutida (sim/não), sem mostrar o valor. A chave `.p8` nunca é impressa e é apagada no último passo (`if: always()`).

## Papel da chave da API

A chave precisa ser uma **chave de equipe** (*Team Key*), não uma chave individual. O papel muda o que dá certo:

- **App Manager:** consulta o app e envia builds ao TestFlight. Basta nas execuções seguintes, depois que o certificado de distribuição gerenciado já existir.
- **Admin:** necessário no **primeiro build**, para o `xcodebuild` criar o certificado *Apple Distribution* gerenciado na nuvem e o perfil de provisionamento do app. Se a assinatura falhar com *Cloud signing permission error*, ou com mensagem de que a chave não tem permissão para criar certificado ou perfil, **gere uma chave com o papel Admin** e atualize os três secrets (`APPSTORE_KEY_ID`, `APPSTORE_ISSUER_ID`, `APPSTORE_PRIVATE_KEY`).

Como gerar: *App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → +*, dê um nome (ex.: `GitHub Actions`), escolha o acesso (**Admin**) e baixe o `.p8`. **O download só pode ser feito uma vez**: guarde o arquivo em um cofre de senhas, fora do GitHub. Só o Account Holder ou um Admin consegue gerar. Se a chave vazar, revogue-a na mesma tela.

O passo "Validar a chave da API" consulta o app `com.duofitness.app` pelo App Store Connect e acusa em segundos: credencial errada (401), chave sem permissão (403) ou app inexistente nesta conta. Ele **não** consegue confirmar a permissão de cloud signing: isso só o `xcodebuild` mostra.

## Primeira execução (valide antes de enviar)

1. Confirme que o app **Duo Fitness** existe no App Store Connect com o bundle id `com.duofitness.app` (já existe).
2. *Actions → ios → Run workflow*. Deixe `upload` **desmarcado**. Opcionalmente informe `branch` (vazio = a ref escolhida em *Use workflow from*).
3. Acompanhe o resumo do job. Com `upload=false` o workflow gera o archive, exporta o `.ipa` com a assinatura de **distribuição** e confere: `codesign --verify`, certificado *Apple Distribution*, Team ID, perfil de App Store (`get-task-allow` falso) e o `application-identifier`. Depois valida o `.ipa` no App Store Connect (`altool --validate-app`), que já acusa ícone, `Info.plist`, build number repetido ou acordo pendente. Nada é enviado.
4. Rode de novo com `upload` **marcado** para enviar ao TestFlight. Ou use a tag, que sempre envia:
   ```bash
   git tag ios-v0.1.0
   git push origin ios-v0.1.0
   ```
5. O resumo mostra a versão e o build number enviados. O App Store Connect leva de 5 a 30 minutos para processar o build.

O botão *Run workflow* só aparece depois que `ios.yml` estiver na branch padrão (`main`). A tag usa o workflow do commit marcado.

Cada execução em runner macOS consome bem mais minutos do plano do GitHub do que uma em Linux. Use `upload=false` só para validar.

### Nova versão

Suba `expo.version` no `app.json` (por exemplo, `1.0.0` para `1.0.1`). O build number sobe sozinho a cada execução.

## Testadores internos (passo a passo)

Testador **interno** é quem tem um usuário na equipe do App Store Connect (até 100). O build fica disponível assim que termina o processamento, sem revisão da Apple.

1. **Adicionar o testador à equipe.** *App Store Connect → Users and Access → Users → +*. Informe nome e o e-mail do Apple ID da pessoa, escolha um papel (para quem só testa, qualquer um serve; por exemplo, *Customer Support*) e o acesso ao app Duo Fitness. A pessoa recebe um convite por e-mail e precisa aceitá-lo.
2. **Criar o grupo interno.** *Apps → Duo Fitness → TestFlight → Internal Testing → +*. Dê um nome (ex.: `Equipe Duo`). Marque **Enable automatic distribution** para que cada build novo chegue sozinho ao grupo.
3. **Adicionar os testadores ao grupo.** No grupo, *Testers → +* e selecione as pessoas (só aparecem usuários já aceitos na equipe). Em *Builds*, confirme que o build desejado está no grupo.
4. **O testador instala.** No iPhone ou iPad:
   - instale o app **TestFlight** pela App Store e entre com o mesmo Apple ID do convite;
   - abra o e-mail *"You're invited to test Duo Fitness"* e toque em **View in TestFlight** (ou abra o TestFlight, escolha *Duo Fitness*);
   - toque em **Install** (ou **Update** nos builds seguintes) e abra o app.
5. **Feedback.** No TestFlight, o testador pode enviar capturas de tela e comentários (*Send Beta Feedback*), ou tirar um print com o app aberto.

Observações:
- O app já declara `ITSAppUsesNonExemptEncryption = false`, então o build não fica parado em *Missing Compliance*.
- Builds de TestFlight expiram em **90 dias**. Para renovar, envie um build novo.
- Testadores **externos** (fora da equipe) exigem a *Beta App Review* da Apple e não fazem parte deste guia.

## Limite de certificados (e por que o archive agora é sem assinatura)

**O que aconteceu:** o archive com assinatura automática (`-allowProvisioningUpdates` com a chave da API) criou, a cada execução, um certificado de **desenvolvimento** novo ("Created via API"). Cada execução roda num runner novo, sem a chave privada do certificado anterior, então o Xcode não reaproveita o anterior e cria outro. A conta acumulou 10 e a execução falhou com *"Choose a certificate to revoke. Your account has reached the maximum number of certificates"* e *"No profiles for 'com.duofitness.app' were found: iOS App Development provisioning profiles"*. Trocar o papel da chave não resolve (a chave já era Admin).

**O que fazer se acontecer de novo (manual, nunca pelo CI):** em developer.apple.com > Certificates, Identifiers & Profiles > Certificates, revogue **só** os certificados de tipo **Development** "Created via API", depois de conferir que nenhum outro pipeline da conta os usa. **Não toque nos Distribution nem no "Distribution Managed"** (o CI não consegue recriá-los e o cloud signing depende deles). O workflow **nunca** cria, lista, revoga nem imprime nomes de certificados.

**Como o workflow evita isso (padrão):**
- Archive: `xcodebuild archive ... CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY=` e **sem** `-allowProvisioningUpdates` nem a chave da API: nada é pedido à Apple, então nenhum certificado de desenvolvimento é criado.
- Export: `xcodebuild -exportArchive` com `method app-store-connect`, `signingStyle automatic`, `-allowProvisioningUpdates` e a chave da API. É aqui que o cloud signing usa o certificado de **distribuição** gerenciado.
- `sign_archive=true` (input do *Run workflow*, padrão `false`): volta ao caminho antigo (archive assinado automático, com a repetição sem assinatura se o time não tiver dispositivos). Use só se precisar, sabendo que cria um certificado de desenvolvimento por execução.

**Por que esta opção e não a outra (cloud-managed no archive):** o cloud signing da Apple (WWDC21, "Distribute apps in Xcode with cloud signing") acontece na **distribuição**, com a chave da API; um archive assinado precisa de um certificado de desenvolvimento com chave privada no runner, e é isso que o Xcode cria a cada execução. Não encontrei documentação de assinar o archive com o certificado "Distribution Managed" (que não tem chave privada no runner). A combinação `CODE_SIGNING_ALLOWED=NO` + `exportArchive` com a chave da API **não está documentada** pela Apple; o que a sustenta é este repositório já ter o caminho de repetição sem assinatura e um build de TestFlight exportado com certificado Apple Distribution.

**Se o export recusar o archive sem assinatura:** o passo registra o erro ("O export falhou depois do archive SEM assinatura (padrão)") e **não tenta outra coisa**. As saídas são: (1) rodar com `sign_archive=true` (cria um certificado de desenvolvimento por execução; revogue os acumulados de vez em quando), ou (2) **configurar o certificado fixo**, descrito na próxima seção (recomendado).

(O certificado fixo agora está implementado: veja a seção abaixo.)

## Assinatura MANUAL com certificado de distribuição fixo (recomendado)

**Por quê:** a assinatura automática (`sign_archive=true`) cria um certificado de desenvolvimento novo ("Created via API") a cada execução e esgota o limite da conta. Com a assinatura manual o runner importa SEMPRE o mesmo certificado de distribuição e o mesmo perfil, guardados em secrets. Nada é criado na conta Apple e o archive já sai assinado, com os entitlements certos (HealthKit e Sign in with Apple). Com os secrets, `sign_archive` não é necessário e o `check-ipa-entitlements` passa sem ele.

**Como o workflow decide:**
- Os três secrets existem: o passo "Assinatura manual - importar" roda `scripts/ios-signing-import.sh`; o archive usa assinatura manual só no target do app (`scripts/ios-set-manual-signing.rb`; os Pods não são tocados), **sem** `-allowProvisioningUpdates` e **sem** a chave da API; o export usa `signingStyle manual` com `provisioningProfiles` (`com.duofitness.app` -> nome do perfil lido do próprio arquivo). O envio ao TestFlight continua pelo `altool`.
- Nenhum dos três: o workflow avisa "Assinatura fixa NÃO configurada" e segue como antes (archive sem assinatura; `sign_archive=true` = automática).
- Só um ou dois: o job falha dizendo que faltam secrets.
- No fim (`if: always()`) o keychain temporário, o `.p12` e o perfil são apagados, mesmo se um passo falhar.

### Passos do Victor (no Mac)

1. **Certificado.** developer.apple.com > Certificates, Identifiers & Profiles > Certificates > **+** > **Apple Distribution**. Siga o assistente (pede um CSR criado no Keychain Access > Assistente de Certificado > Solicitar um certificado de uma autoridade). Baixe o `.cer` e dê duplo clique para instalar.
2. **Exportar o .p12.** Keychain Access > Meus Certificados > ache "Apple Distribution: ..." > clique com o botão direito > **Exportar** > formato `.p12`, com uma **senha forte**. O `.p12` precisa incluir a **chave privada** (a seta ao lado do certificado deve abrir e mostrar a chave).
3. **App ID.** Identifiers > `com.duofitness.app`: confira as capabilities **Sign in with Apple** e, se for usar a Saúde, **HealthKit** (NÃO ligue Clinical Health Records). Ligue ANTES de criar o perfil.
4. **Perfil.** Profiles > **+** > **App Store Connect** (distribuição) > App ID `com.duofitness.app` > escolha **o certificado do passo 1** > dê um nome (ex.: `Duo Fitness App Store`) > baixe o `.mobileprovision`.
5. **Codificar em base64** (no Terminal do Mac; copia direto para a área de transferência):
   - `base64 -i certificado.p12 | pbcopy` e cole no secret `IOS_DIST_CERT_P12_B64`;
   - `base64 -i perfil.mobileprovision | pbcopy` e cole no secret `IOS_PROVISIONING_PROFILE_B64`;
   - a senha do passo 2 vai no secret `IOS_DIST_CERT_PASSWORD`.
6. GitHub > Settings > Secrets and variables > Actions > **New repository secret** (os três nomes exatos acima). Rode o `ios.yml` (`upload=false` primeiro). Depois apague o `.p12` e o `.mobileprovision` das pastas de download; guarde o `.p12` e a senha num cofre de senhas (se perder, crie outro certificado).

### O que o passo de importação confere (e a mensagem de erro de cada falha)

O `.p12` abre com a senha; o perfil não expirou; é do Team ID e do App ID `com.duofitness.app`; é de **distribuição** (sem `get-task-allow` e sem lista de dispositivos); o certificado do `.p12` está **dentro do perfil** (compara o hash SHA-1, nada é impresso); o perfil tem **HealthKit** quando `HEALTH_INTEGRATION_ENABLED=true` e **Sign in with Apple** quando contas e Firebase estão ligados. Cada falha diz a causa e a ação (ex.: "O perfil não contém HealthKit: habilite a capability HealthKit no App ID, recrie o perfil, baixe e atualize IOS_PROVISIONING_PROFILE_B64"). Erros do `xcodebuild` (sem identidade, perfil que não bate, expirado, entitlement fora do perfil) são classificados pelo `ios-log-hints`.

**Privacidade do log:** os secrets são mascarados (`::add-mask::`); o log mostra só o nome do perfil, o Team ID e a data de validade. Nunca o conteúdo do `.p12`, a senha, o perfil ou a identidade completa.

### Renovação e troca

- O certificado de distribuição e o perfil **valem 1 ano**. Perto do vencimento (anote a data; o resumo do job mostra "expira em"): crie o perfil novo (passos 4-5; se o certificado também vence, refaça os passos 1-2) e **atualize os secrets** (substituir o valor basta; não precisa mexer no workflow).
- **Trocar o certificado:** refaça 1, 2, 4 e 5 (o perfil precisa ser criado com o certificado novo) e atualize os TRÊS secrets.
- **Só mudou uma capability** (ex.: ligou HealthKit): edite o App ID, **recrie o perfil** (o antigo não ganha a capability), baixe e atualize só `IOS_PROVISIONING_PROFILE_B64`.
- **Voltar ao modo anterior:** apague os três secrets.

### O que NÃO foi validado

O keychain, o `codesign` e o `xcodebuild` só existem no macOS do GitHub: nesta máquina (Windows) só foram testados o texto dos scripts, a ordem dos passos do workflow, o fallback sem secrets, o `always()` do cleanup e a classificação dos erros. A primeira execução real com os secrets é a validação. Risco conhecido: o `ruby` do runner precisa enxergar a gem `xcodeproj` do CocoaPods (o passo tenta o caminho do Homebrew se não enxergar).

## Entitlements do .ipa (Sign in with Apple)

Um archive sem assinatura pode perder entitlements. Depois do export (também com `upload=false`), o passo **"Conferir os entitlements do .ipa"** extrai os entitlements reais do `.ipa` (`codesign -d --entitlements :-`) e os compara com o `ios/<App>/<App>.entitlements` do projeto gerado (`scripts/check-ipa-entitlements.mjs`):
- toda chave do projeto precisa estar no `.ipa` (com o mesmo valor, quando o valor não usa `$(...)`); o `.ipa` pode ter chaves a mais (`application-identifier`, `get-task-allow`...);
- com `EXPO_PUBLIC_AUTH_ENABLED=true` **e** Firebase ligado (`FIREBASE_ENABLED`), o `com.apple.developer.applesignin` é **obrigatório**: sem ele o passo falha com `::error::` e o TestFlight não recebe um build sem o Sign in with Apple. Com as contas ligadas **sem** Firebase o login da Apple nem existe (provedor indisponível), então só há um aviso;
- só os nomes das chaves aparecem no log; certificados nunca são impressos (o passo da assinatura mostra apenas o tipo, "Apple Distribution").

## HealthKit no .ipa (integração de saúde)

Com a variável de repositório `HEALTH_INTEGRATION_ENABLED=true` (só para a conferência; ela não muda o app), o passo **"Conferir os entitlements do .ipa"** passa `--require-healthkit` e o `com.apple.developer.healthkit` vira **obrigatório** no `.ipa` e no projeto iOS gerado. Sem ele a integração com o Apple Saúde não funciona no aparelho. Hoje o HealthKit é só um stub desligado (`EXPO_PUBLIC_HEALTH_INTEGRATION=false`) e nenhum plugin declara o entitlement: com a variável ligada o passo vai falhar até o plugin do HealthKit existir, e isso é proposital.

**Importante (até a correção estrutural ser validada em macOS):** o archive **sem assinatura** (`sign_archive=false`, o padrão) **não grava entitlements** no app. O `ios.yml` já barrou um build por isso com o Sign in with Apple. Enquanto a correção estrutural dos entitlements não for validada em macOS, **o build com HealthKit deve ser gerado com `sign_archive=true`** (ele cria um certificado de desenvolvimento por execução; revogue os acumulados à mão de vez em quando). Com `HEALTH_INTEGRATION_ENABLED=true` e `sign_archive=false` o log mostra um aviso (`::notice::`) lembrando disso, e se o entitlement faltar o passo falha com `Falta no .ipa o entitlement com.apple.developer.healthkit`.

## HealthKit no build (Apple Saúde, só leitura)

Com a variável de repositório **`HEALTH_INTEGRATION_ENABLED=true`** (uma só variável, um só significado), o `ios.yml`:
1. instala os módulos nativos fixos (`scripts/install-healthkit-deps.mjs`: `@kingstinct/react-native-healthkit` 16.2.0, `@react-native-healthkit/core` 16.2.0, `react-native-nitro-modules` 0.35.10) no `package.json` do runner, antes do prebuild;
2. confere o autolinking do iOS (`check-autolinking.mjs --platform ios` exige os três);
3. o plugin `plugins/withHealthKitOptional.js` escreve no projeto gerado o entitlement `com.apple.developer.healthkit` e `NSHealthShareUsageDescription` (nada de escrita, background delivery nem registros clínicos), e `check-ios-project.mjs` confere isso;
4. liga o JavaScript do app (`EXPO_PUBLIC_HEALTH_INTEGRATION`, derivada da mesma variável, no `env` do job: chega ao bundle gerado pelo `xcodebuild`);
5. depois do export, `check-ipa-entitlements.mjs --require-healthkit` exige o entitlement no `.ipa`.

Sem a variável, nada disso acontece e o app e o iOS gerado ficam idênticos aos de antes (um teste e o job `ios-prebuild` do `ci.yml` conferem). O Android não recebe a flag.

**O build com HealthKit usa `sign_archive=true`.** O archive sem assinatura (padrão) não grava entitlements no app: já barrou um build por isso com o Sign in with Apple. Até a correção estrutural dos entitlements ser validada em macOS, rode o `ios.yml` com `sign_archive=true` quando `HEALTH_INTEGRATION_ENABLED=true`. Sem isso o passo "Conferir os entitlements do .ipa" falha com `Falta no .ipa o entitlement com.apple.developer.healthkit` (o log avisa com `::notice::`).

**Capability no portal da Apple:** o App ID `com.duofitness.app` precisa ter a capability **HealthKit** ligada (Certificates, Identifiers & Profiles > Identifiers). Com assinatura automática pela chave da API o Xcode costuma ligá-la; se o export reclamar de perfil sem HealthKit, ligue à mão e rode de novo. **Não** marque "Clinical Health Records".

O job `ios-prebuild-healthkit` do `ci.yml` reproduz os passos 1 a 3 em Linux, sem Mac.

## Problemas comuns

| Mensagem | O que fazer |
|---|---|
| *Faltam secrets da Apple: ...* | Cadastre os nomes listados. |
| *A App Store Connect recusou as credenciais (401)* | `APPSTORE_KEY_ID`, `APPSTORE_ISSUER_ID` e `APPSTORE_PRIVATE_KEY` precisam ser da mesma chave. |
| *A chave é válida, mas não tem permissão (403)* | Use uma chave de equipe com papel App Manager ou Admin. |
| *o app com bundle id ... não foi encontrado nesta conta* | Crie o app no App Store Connect com o bundle id `com.duofitness.app`. |
| *A chave da API não tem permissão para o cloud signing* | Gere uma chave com papel **Admin** e atualize os três secrets. |
| *Choose a certificate to revoke* / *maximum number of certificates* | Limite de certificados: veja "Limite de certificados" acima (revogar à mão só os Development "Created via API"). Não adianta trocar o papel da chave. |
| *O export falhou depois do archive SEM assinatura (padrão)* | Veja "Se o export recusar o archive sem assinatura" acima. |
| *Falta no .ipa o entitlement ...* | Os entitlements do projeto não chegaram ao `.ipa`. Veja "Entitlements do .ipa". |
| *O time Apple não tem dispositivos registrados* | O Xcode exige um dispositivo para gerar o perfil de desenvolvimento do archive. O workflow repete o archive **sem assinar** e deixa a assinatura de distribuição para o export (a chave precisa ter papel Admin no primeiro build). Para evitar esse caminho, registre um iPhone em *developer.apple.com → Certificates, Identifiers & Profiles → Devices → +* (nome e UDID do aparelho; o UDID aparece no Finder ao selecionar o iPhone no Mac, ou em Ajustes → Geral → Sobre). |
| *ITMS-90725 / SDK Version Issue* | O build não foi feito com Xcode 26. Confira o passo "Conferir Xcode 26" e a imagem `macos-26`. |
| *O número do build já foi usado* | Não renomeie `ios.yml`; suba a versão no `app.json` se precisar recomeçar a contagem. |
| *No Accounts with App Store Connect Access* / *Authentication credentials are missing or invalid* | O envio não autenticou. Confira que `APPSTORE_KEY_ID`, `APPSTORE_ISSUER_ID` e `APPSTORE_PRIVATE_KEY` são da mesma chave de equipe (papel App Manager ou Admin) e que o app existe na conta. O `altool` lê a chave `AuthKey_<KEYID>.p8` de `API_PRIVATE_KEYS_DIR` (e de `~/.appstoreconnect/private_keys`); o script copia o `.p8` para lá só durante o envio e apaga depois. |
| *acordo pendente* (*required agreement is missing or has expired*) | Só o Account Holder aceita: App Store Connect → Business (ou developer.apple.com/account) → acordos pendentes. Depois rode de novo. |
| *recusou o ícone* (ITMS-90022, ITMS-9071x, canal alfa) | O ícone precisa ser PNG 1024x1024 sem transparência. Rode `node scripts/check-pngs.mjs` e confira `assets/icon.png`. |
| *recusou o Info.plist* (ITMS-90056/90057...) | Veja as linhas `Apple: ITMS-...` no log: elas citam a chave inválida. Versão e build number são gravados por `scripts/set-ios-version.sh`; o resto vem do `app.json` (`ios.infoPlist`). |
| *sem a confirmação 'No errors uploading'* | No Xcode 26 o `altool` já foi visto saindo com código 0 mesmo com falha. O script só dá o envio por feito se a saída trouxer `No errors uploading`. Confira o TestFlight antes de rodar de novo. |
| *Não reconheci a causa no log* | Baixe o artifact `xcodebuild-logs-<n>` da execução (guardado por 3 dias, só com a saída do `xcodebuild`) e procure a primeira linha com `error:`. |

## Limites desta configuração

- O `ios.yml` foi escrito e conferido (YAML, shell e os scripts de apoio com testes), mas **ainda não rodou em um runner macOS**. Na primeira execução podem aparecer ajustes finos; por isso a primeira rodada deve ser com `upload=false`.
- O `prebuild` iOS não roda no Windows. Ele é validado no job `ios-prebuild` do `ci.yml` (Linux) e dentro do próprio `ios.yml`.
- O `xcodebuild` em runner novo pode pedir confirmação de plugins ou macros; o workflow não os usa.
- A página de referência do `altool` da Apple marca `--upload-app` como **obsoleto** (a substituta é `--upload-package`, que exige o Apple ID numérico do app, o bundle id e a versão). O script confere em tempo de execução, com `xcrun altool --help`, se `--upload-app` e `--validate-app` existem neste Xcode; se não existirem, usa o `xcrun iTMSTransporter` (`-m verify` e `-m upload`, com `-apiKey` e `-apiIssuer`). O log mostra qual ferramenta foi usada.
