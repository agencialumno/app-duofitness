# Fase 0 do plano de contas: medições e pontos a confirmar

Status: **preparada, NÃO medida em CI** (esta noite não houve push nem disparo de workflow). O que pude medir aqui (Windows, sem Xcode) está abaixo; o resto roda no `firebase-spike.yml` quando você mandar.

## 1. Como medir (workflow `firebase-spike.yml`, só manual)

`Actions > firebase-spike > Run workflow` (plataforma: both/android/ios). Cada plataforma roda duas variantes, **sem Firebase** ("off", como o build de hoje) e **com Firebase** ("on": módulos de conta, Google Services no Android, frameworks estáticos no iOS), usando arquivos de configuração **falsos** gerados no próprio job (nenhum secret). Não assina nem publica nada.

| Fase | Android | iOS |
|---|---|---|
| prebuild | `expo prebuild` | `expo prebuild` |
| dependências nativas | (Gradle) | `pod install` |
| compilação | `assembleDebug` (arm64) | `xcodebuild` Debug no simulador, sem assinatura |

O resumo de cada job lista os segundos por fase. **Critério de saída combinado:** se o build iOS "on" ficar **mais de 2x** mais lento que o "off" (compilação + `pod install`) **ou quebrar**, reavaliar o Firebase JS SDK **antes** da Fase 1 e me mostrar. Use a tabela abaixo para anotar.

| | Android off | Android on | iOS off | iOS on | Razão iOS on/off |
|---|---|---|---|---|---|
| prebuild (s) | | | | | |
| pod install (s) | n/a | n/a | | | |
| compilação (s) | | | | | |
| resultado | | | | | |

Referência (histórico dos builds assinados antes desta etapa, execuções manuais bem-sucedidas): Android de 9 a 13 min; iOS de 9 a 17 min no total (o maior inclui envio ao TestFlight).

## 2. O que já medi localmente

| Item | Resultado |
|---|---|
| `expo prebuild --platform android` sem Firebase | 21 s; sem `google-services` no Gradle |
| `expo prebuild --platform android` com Firebase (arquivos falsos) | 24 s; `google-services` aplicado no Gradle e `google-services.json` copiado |
| Config do iOS com Firebase (introspecção, o prebuild do iOS não roda no Windows) | `com.apple.developer.applesignin` no entitlement, URL scheme do Google (`REVERSED_CLIENT_ID`) no Info.plist |
| Bundle JS Android (Hermes) com os módulos instalados vs. sem eles | 3,66 MB vs. 3,47 MB (+0,19 MB, +5,6%) |
| Bundle sem os módulos instalados | compila normalmente (`require` opcional dentro de `try/catch`) |
| Instalação dos módulos de conta (`--save-exact` no workspace) | 76 pacotes em ~40 s; grava no `package.json` do workspace (o autolinking só vê `dependencies`); no CI o runner é descartado |

**Não medido:** `pod install` e compilação iOS com frameworks estáticos; compilação Gradle com Firebase; tamanho final do APK/IPA. Dependem do CI (workflow acima).

## 3. Pontos a confirmar do plano (seção 18) e o que descobri

| # | Ponto | Situação |
|---|---|---|
| 1 | Versões com SDK 54, RN 0.81 e nova arquitetura | Escolhi `@react-native-firebase/*` **23.8.8** (última 23.x) e `google-signin` **16.1.5** (peer `expo >= 52.0.40`), fixas em `firebase/native-deps.json`. As 26.x e 27.x têm **relatos de falha** com frameworks estáticos/SPM no iOS e com o Xcode 26 (ver fontes). **Falta** o build iOS real. |
| 2 | Política de senha do servidor | A documentação do Google (Identity Platform) lista mínimo 6 a 30 caracteres, maiúscula, minúscula, número e não alfanumérico, modos "exigir" e "avisar". **Não encontrei** declaração oficial de que está no plano Spark (só uma fonte de terceiros diz que sim). **Você** confere no console (item 1.3 de `pendencias-usuario.md`). |
| 3 | Capability Sign in with Apple e perfil gerado | O entitlement entra pelo plugin (confirmado por introspecção). A regeneração do perfil gerenciado só se verifica no **primeiro `ios.yml` com Firebase**. |
| 4 | App Check para Auth (prévia) e cota do Play Integrity | Não verifiquei; segue em **monitoramento** (decisão 7). |
| 5 | Limites do Spark (e-mails de verificação por dia, contas por IP) | Não verifiquei em detalhe; a página de limites do Firebase Auth traz os números atuais. **Você** confere. |
| 6 | `revokeToken` da Apple no RN Firebase instalado | **Existe**: `revokeAccessToken(auth, authorizationCode)` na API modular da 23.8.8. O provedor reautentica na Apple, revoga e só então apaga. Testado com módulos falsos; falta teste em aparelho. |
| 7 | Texto vigente da diretriz 4.8 | A Apple pede uma opção de login **equivalente** que limite a coleta a nome e e-mail, permita e-mail privado e não rastreie para anúncios; o "Entrar com a Apple" cumpre. **Confira o texto oficial** antes de submeter. |
| 8 | Prazo de comunicação de incidente à ANPD | Fontes secundárias dizem **3 dias úteis** (Resolução CD/ANPD nº 15/2024), contados do conhecimento do incidente. **Confirme o texto oficial** com o advogado. |

## 4. Fontes consultadas nesta etapa

- Problemas com RN Firebase no Expo SDK 54 / Xcode 26: [velog (Expo SDK 54 + RNFB)](https://velog.io/@minu-j/Expo-react-native-firebase-의존성-추가-후-iOS-빌드-실패-해결), [issue invertase #9161 (v26)](https://github.com/invertase/react-native-firebase/issues/9161), [Ometria (Firebase estático no Xcode 26)](https://mobile-sdk.docs.ometria.com/react-native/installation).
- Política de senha: [Google Identity Platform](https://docs.cloud.google.com/identity-platform/docs/password-policy?hl=en); limites do Auth: [firebase.google.com/docs/auth/limits](https://firebase.google.com/docs/auth/limits).
- Diretriz 4.8: [fórum de desenvolvedores da Apple](https://developer.apple.com/forums/thread/762647) (texto oficial: developer.apple.com/app-store/review/guidelines).
- Incidentes (ANPD): [Mattos Filho](https://www.mattosfilho.com.br/unico/regulamento-incidente-seguranca/), [CERT.br](https://forum.cert.br/forum2024/slides/forumcsirts2024-opiceblum.pdf).

## 5. iOS com Firebase (conta-firebase) x sem Firebase (conta-ui): medição real

Fonte: execuções do `ios.yml` (manual, `upload=false` na conta-firebase; a conta-ui enviou ao TestFlight), lidas depois com `gh run view` (somente leitura).

| | conta-ui (run 39947928953) | conta-firebase (run 39953174483, **falhou no archive**) | Razão |
|---|---|---|---|
| `pod install` | 35 s | 88 s | **2,5x** |
| Archive (assinatura automática) | 213 s (ok) | 191 s e **FALHOU** (exit 65) | sem comparação (o archive quebrou) |
| Job inteiro | 459 s (inclui export e envio ao TestFlight) | 322 s (parou no archive) | sem comparação |

Leitura contra o critério combinado ("o build iOS ficar **mais de 2x** mais lento **ou quebrar**: reavaliar o SDK JS antes de seguir"):
- **Quebrou** (erro do RNFBApp: "include of non-modular header inside framework module", com o React Native pré-compilado). O critério de saída foi **atingido** nesta primeira tentativa.
- O `pod install` já está a **2,5x** (acima de 2x), embora seja só ~1 minuto; o que decide é o archive (a compilação), ainda **não medido** com sucesso.
- Por decisão sua, antes de reavaliar o SDK foi aplicado o remédio documentado (ver abaixo). **Próxima medição:** rodar o `ios.yml` (`upload=false`) na conta-firebase e preencher a coluna "depois da correção":

| | conta-ui | conta-firebase DEPOIS da correção | Razão (limite: 2x) |
|---|---|---|---|
| `pod install` | 35 s | _preencher_ | |
| Archive | 213 s | _preencher_ | |
| Resultado | ok | _preencher_ | |

Se o archive passar, mas a razão da compilação for maior que 2x, ou se falhar com erro nativo DIFERENTE do Firebase/RNFBApp, **pare** e use `docs/avaliacao-sdk-js.md` (só será escrito nesse caso, sem implementar nada).

### Remédio documentado para o erro "non-modular header" (RNFB com frameworks estáticos, Expo SDK 54)

1. RNFB #8657 (central, "Solved!") e Expo #39607 (fechado em 26/09/2025, PR #39742): usar `expo-build-properties` com `ios.useFrameworks: "static"` **e** `ios.forceStaticLinking: ["RNFBApp", "RNFBAuth", ...]` (só os pods RNFB usados). Os pods RNFB viram bibliotecas estáticas e deixam de ser frameworks, então o header não modular do React Native pré-compilado deixa de ser erro. A documentação do `expo-build-properties` descreve `forceStaticLinking` exatamente para "pods... especialmente os binários pré-compilados do React Native" que falham por headers não modulares.
2. Reserva documentada: `ios.buildReactNativeFromSource: true` (compila o RN do código-fonte; "aumenta bastante o tempo de build", 10 a 13 min no EAS segundo os relatos).
3. O RNFB não documenta mais o `$RNFirebaseAsStaticFramework` para este caso, mas o podspec da 23.8.8 ainda o lê (`s.static_framework`); foi acrescentado como cinto e suspensório.
4. `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES` em post_install é relatado por usuários (Expo #39607, #8960), mas um mantenedor da Expo **desaconselha** (pode causar outros erros) e um usuário relatou que não resolveu. Foi aplicado só nos pods `RNFB*`, e não em todos.
5. Aviso: o RNFB 24+/Expo 55+ muda o quadro (SPM, `useFrameworks: "dynamic"`, sem `forceStaticLinking`). Esta correção vale para a geração Expo 54 / RNFB 23.x fixada aqui.

Implementação: `plugins/withFirebaseOptional.js` (forceStaticLinking) e `plugins/withFirebaseIosFix.js` (Podfile), só com `FIREBASE_ENABLED=true`; verificada no CI Linux (`ios-prebuild-firebase`: `ruby -c`, `scripts/check-firebase-podfile.mjs`, idempotência) e no `ios.yml` (passo "Conferir o Podfile do Firebase"). A compilação real só o macOS confirma.
