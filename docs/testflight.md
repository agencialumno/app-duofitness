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

**Se o export recusar o archive sem assinatura:** o passo registra o erro ("O export falhou depois do archive SEM assinatura (padrão)") e **não tenta outra coisa**. As saídas são: (1) rodar com `sign_archive=true` (cria um certificado de desenvolvimento por execução; revogue os acumulados de vez em quando), ou (2) **importar um certificado fixo**, descrito abaixo (não implementado).

### Opção não implementada: certificado fixo (.p12) importado de secrets

Em vez de depender da Apple para criar certificados, o runner importaria sempre o **mesmo** certificado. Exige: um certificado Apple Distribution (ou Development) exportado do Mac como `.p12` com senha; os secrets `IOS_CERT_P12_BASE64` e `IOS_CERT_P12_PASSWORD`; um passo que cria um keychain temporário (`security create-keychain`, `security import`, `security set-key-partition-list`) e o apaga no fim; e o export com `signingStyle manual` e um perfil de App Store baixado do portal (secret `IOS_PROVISIONING_PROFILE_BASE64`), ou automático com a identidade já no keychain. Contras: o `.p12` é um segredo de longa vida (rotação anual) e o perfil manual vence. Nada disso foi implementado, e o CI continua sem criar nem revogar certificados.

## Entitlements do .ipa (Sign in with Apple)

Um archive sem assinatura pode perder entitlements. Depois do export (também com `upload=false`), o passo **"Conferir os entitlements do .ipa"** extrai os entitlements reais do `.ipa` (`codesign -d --entitlements :-`) e os compara com o `ios/<App>/<App>.entitlements` do projeto gerado (`scripts/check-ipa-entitlements.mjs`):
- toda chave do projeto precisa estar no `.ipa` (com o mesmo valor, quando o valor não usa `$(...)`); o `.ipa` pode ter chaves a mais (`application-identifier`, `get-task-allow`...);
- com `EXPO_PUBLIC_AUTH_ENABLED=true` **e** Firebase ligado (`FIREBASE_ENABLED`), o `com.apple.developer.applesignin` é **obrigatório**: sem ele o passo falha com `::error::` e o TestFlight não recebe um build sem o Sign in with Apple. Com as contas ligadas **sem** Firebase o login da Apple nem existe (provedor indisponível), então só há um aviso;
- só os nomes das chaves aparecem no log; certificados nunca são impressos (o passo da assinatura mostra apenas o tipo, "Apple Distribution").

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
