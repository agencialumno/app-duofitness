# Firebase (conta): arquivos de referência

Nada aqui é aplicado automaticamente. **Nenhum segredo** fica neste diretório (repositório público).

| Arquivo | Para quê |
|---|---|
| `native-deps.json` | versões EXATAS dos módulos nativos de conta, instalados só com `FIREBASE_ENABLED=true` por `scripts/install-firebase-deps.mjs` (`--no-save`) |
| `firestore.rules` | regras de **referência** do Firestore (o Firestore ainda não existe no projeto) |
| `storage.rules` | regras de **referência** do Storage (o Storage ainda não existe no projeto) |

## Como o Firebase entra no build

1. Variável do repositório `FIREBASE_ENABLED=true` (vazia = desligado; o build é idêntico ao de antes).
2. Secrets `FIREBASE_GOOGLE_SERVICES_JSON_B64` (Android) e `FIREBASE_GOOGLE_SERVICE_INFO_PLIST_B64` (iOS), em base64.
3. O workflow roda `scripts/firebase-prepare.mjs <plataforma>`: decodifica para `.firebase-config/` (ignorado pelo git), valida o
   pacote/bundle id `com.duofitness.app`, mascara a chave de API nos logs e liga `FIREBASE_ENABLED` para os passos seguintes.
   Sem o secret, o build segue SEM Firebase (aviso no log).
4. `scripts/install-firebase-deps.mjs` instala os módulos nativos; o plugin `plugins/withFirebaseOptional.js` aplica
   Google Services (Android), frameworks estáticos, Apple e URL scheme do Google (iOS) só se o arquivo da plataforma existir.
5. Ao fim do job (mesmo com falha) `scripts/firebase-prepare.mjs cleanup` apaga os arquivos.

Para desenvolver localmente com Firebase: `FIREBASE_ENABLED=true node scripts/install-firebase-deps.mjs`, coloque os arquivos em
`.firebase-config/` (ignorado pelo git) e rode o prebuild com `FIREBASE_ENABLED=true`.

## Versões

`@react-native-firebase/*` fica na **23.8.8** (última 23.x): as 26.x e 27.x têm relatos de falha com frameworks estáticos/SPM no iOS.
Antes de subir de versão, rodar o `ios.yml` (`upload=false`) com a nova versão.
