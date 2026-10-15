# Build iOS e TestFlight

O workflow [`.github/workflows/ios.yml`](../.github/workflows/ios.yml) gera o app iOS assinado e o envia ao TestFlight, sem EAS e sem fastlane.

- **Runner:** `macos-26` (arm64), com Xcode 26.6 como padrão e o SDK do iOS 26. Desde 28/04/2026 a Apple só aceita no App Store Connect apps compilados com Xcode 26 ou mais novo. O workflow confere a versão e para cedo se o runner tiver um Xcode mais antigo.
- **Projeto nativo:** gerado em cada execução por `npx expo prebuild --platform ios --no-install` (a pasta `ios/` fica fora do git), depois `pod install`.
- **Assinatura:** automática, pela chave da API do App Store Connect (`xcodebuild -allowProvisioningUpdates` com `-authenticationKeyPath/ID/IssuerID`). É o *cloud signing*: a Apple guarda o certificado de distribuição, e o runner não precisa de certificado nem de perfil em arquivo.
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
3. Acompanhe o resumo do job. Com `upload=false` o workflow gera o archive, exporta o `.ipa` com a assinatura de **distribuição** e confere: `codesign --verify`, certificado *Apple Distribution*, Team ID, perfil de App Store (`get-task-allow` falso) e o `application-identifier`. Nada é enviado.
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

## Problemas comuns

| Mensagem | O que fazer |
|---|---|
| *Faltam secrets da Apple: ...* | Cadastre os nomes listados. |
| *A App Store Connect recusou as credenciais (401)* | `APPSTORE_KEY_ID`, `APPSTORE_ISSUER_ID` e `APPSTORE_PRIVATE_KEY` precisam ser da mesma chave. |
| *A chave é válida, mas não tem permissão (403)* | Use uma chave de equipe com papel App Manager ou Admin. |
| *o app com bundle id ... não foi encontrado nesta conta* | Crie o app no App Store Connect com o bundle id `com.duofitness.app`. |
| *A chave da API não tem permissão para o cloud signing* | Gere uma chave com papel **Admin** e atualize os três secrets. |
| *O time Apple não tem dispositivos registrados* | O Xcode exige um dispositivo para gerar o perfil de desenvolvimento do archive. O workflow repete o archive **sem assinar** e deixa a assinatura de distribuição para o export (a chave precisa ter papel Admin no primeiro build). Para evitar esse caminho, registre um iPhone em *developer.apple.com → Certificates, Identifiers & Profiles → Devices → +* (nome e UDID do aparelho; o UDID aparece no Finder ao selecionar o iPhone no Mac, ou em Ajustes → Geral → Sobre). |
| *ITMS-90725 / SDK Version Issue* | O build não foi feito com Xcode 26. Confira o passo "Conferir Xcode 26" e a imagem `macos-26`. |
| *O número do build já foi usado* | Não renomeie `ios.yml`; suba a versão no `app.json` se precisar recomeçar a contagem. |
| *Não reconheci a causa no log* | Baixe o artifact `xcodebuild-logs-<n>` da execução (guardado por 3 dias, só com a saída do `xcodebuild`) e procure a primeira linha com `error:`. |

## Limites desta configuração

- O `ios.yml` foi escrito e conferido (YAML, shell e os scripts de apoio com testes), mas **ainda não rodou em um runner macOS**. Na primeira execução podem aparecer ajustes finos; por isso a primeira rodada deve ser com `upload=false`.
- O `prebuild` iOS não roda no Windows. Ele é validado no job `ios-prebuild` do `ci.yml` (Linux) e dentro do próprio `ios.yml`.
- O `xcodebuild` em runner novo pode pedir confirmação de plugins ou macros; o workflow não os usa.
