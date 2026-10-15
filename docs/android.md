# Build Android (APK e AAB) pelo GitHub Actions

O workflow [`.github/workflows/android.yml`](../.github/workflows/android.yml) gera o APK (para instalar em celulares) e o AAB (para a Play Store), assinados, sem EAS e sem Expo Go.

- O projeto nativo é gerado em cada execução por `npx expo prebuild --platform android --no-install`. As pastas `android/` e `ios/` ficam no `.gitignore` e **nada delas é commitado**.
- A assinatura e a versão são aplicadas pelo plugin local [`plugins/withAndroidRelease.js`](../plugins/withAndroidRelease.js), registrado em `app.json`. Ele altera o `build.gradle` gerado durante o prebuild: cria `signingConfigs.release` lendo o keystore de variáveis de ambiente (nenhuma senha em arquivo) e define `versionCode` e `versionName`. Sem as variáveis (build local), o app usa a assinatura de debug e os valores do `app.json`.
- `versionCode` = `github.run_number`. `versionName` vem da tag (`v1.2.3` vira `1.2.3`). Em execução manual, sem tag, vale a `version` do `app.json`.
- Disparo: push de uma tag `v*` ou execução manual (aba Actions, "Run workflow").

> **Não renomeie `android.yml`.** O `run_number` é contado por arquivo de workflow. Se o arquivo mudar de nome, a contagem recomeça em 1 e o `versionCode` fica menor que o das versões já enviadas: a Play Store recusa o upload e o Android não deixa instalar "por cima".

## Secrets

Cadastre em *Settings → Secrets and variables → Actions → New repository secret*.

| Secret | Obrigatório | Para quê |
|---|---|---|
| `ANDROID_KEYSTORE_BASE64` | **sim** | keystore de release convertido para base64 |
| `ANDROID_KEY_ALIAS` | **sim** | alias da chave dentro do keystore |
| `ANDROID_KEYSTORE_PASSWORD` | **sim** | senha do keystore |
| `ANDROID_KEY_PASSWORD` | **sim** | senha da chave (com keystore PKCS12 é a mesma senha do keystore) |
| `EXPO_PUBLIC_API_URL` | não | URL do backend. Sem ela o app é gerado **100% offline** |
| `EXPO_PUBLIC_APP_KEY` | não | mesmo valor do `APP_KEY` do backend |
| `BLOB_READ_WRITE_TOKEN` | não | publica o APK no Vercel Blob. Sem ele esse passo é pulado, sem falha |

Se faltar algum dos quatro secrets de assinatura, o workflow para logo no começo e lista **só os nomes** dos que faltam (nunca valores). Os secrets opcionais ausentes não fazem o build falhar. O resumo de cada execução informa se a URL da API foi embutida (sim/não), sem mostrar o valor. Lembre que `EXPO_PUBLIC_*` vai dentro do app e qualquer pessoa consegue extrair.

## Gerar o keystore (uma única vez)

Com o JDK instalado (`keytool` vem nele), no PowerShell, **fora da pasta do repositório**:

```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore duofitness-release.jks `
  -alias duofitness -keyalg RSA -keysize 2048 -validity 10000
```

Ele pergunta a senha (guarde bem), seu nome e organização. O alias do exemplo é `duofitness`.

Converta para base64 e copie para a área de transferência:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\caminho\duofitness-release.jks")) | Set-Clipboard
```

Cole o conteúdo no secret `ANDROID_KEYSTORE_BASE64`. Ou, com a GitHub CLI (`gh`) logada:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\caminho\duofitness-release.jks")) | gh secret set ANDROID_KEYSTORE_BASE64
gh secret set ANDROID_KEY_ALIAS          # digite: duofitness
gh secret set ANDROID_KEYSTORE_PASSWORD  # digite a senha
gh secret set ANDROID_KEY_PASSWORD       # a mesma senha (keystore PKCS12)
```

### Faça backup do keystore fora do GitHub

> **Guarde o `.jks` e as senhas fora do GitHub**: em um gerenciador de senhas e em uma cópia offline (pen drive ou cofre). Os secrets do GitHub **não podem ser lidos de volta**: depois de cadastrados, você só consegue sobrescrevê-los. Quem perde o keystore não consegue publicar atualizações do mesmo app. Na Play Store, ativar o *Play App Signing* reduz esse risco (o Google guarda a chave final e a sua vira uma "chave de upload", que pode ser trocada). Nunca commite o keystore nem as senhas.

### Sem JDK instalado

Escolha uma opção:

1. Instalar o JDK 17: `winget install EclipseAdoptium.Temurin.17.JDK` (reabra o PowerShell depois).
2. Usar o `keytool` do Android Studio, se você o tiver: `& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair ...` (mesmos argumentos acima).
3. Gerar uma vez no GitHub Actions. Cadastre antes os secrets `ANDROID_KEY_ALIAS`, `ANDROID_KEYSTORE_PASSWORD` e `ANDROID_KEY_PASSWORD`. Crie **temporariamente** o arquivo `.github/workflows/gerar-keystore.yml` abaixo (só na `main`, para aparecer em Actions), execute-o, baixe o artifact, converta para base64 como acima e, em seguida, **apague o artifact e o arquivo do workflow**. O artifact fica visível para quem tem acesso de leitura ao repositório; por isso a retenção é de 1 dia.

   ```yaml
   name: gerar-keystore
   on: workflow_dispatch
   permissions:
     contents: read
   jobs:
     gerar:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/setup-java@v4.7.1
           with: { distribution: temurin, java-version: '17' }
         - name: Gerar keystore
           env:
             ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
             ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
           run: |
             keytool -genkeypair -storetype PKCS12 -keystore duofitness-release.jks \
               -alias "$ANDROID_KEY_ALIAS" -keyalg RSA -keysize 2048 -validity 10000 \
               -storepass:env ANDROID_KEYSTORE_PASSWORD -keypass:env ANDROID_KEYSTORE_PASSWORD \
               -dname "CN=Duo Fitness, O=Duo Fitness, C=BR"
         - uses: actions/upload-artifact@v4.6.2
           with:
             name: keystore
             path: duofitness-release.jks
             retention-days: 1
   ```

## Primeiro build: tag `v0.1.0`

1. Confirme que `android.yml`, o plugin e o `app.json` estão no commit que vai receber a tag, e que os quatro secrets de assinatura estão cadastrados.
2. Crie e envie a tag (a tag precisa ser `vMAJOR.MINOR.PATCH`):
   ```powershell
   git tag v0.1.0
   git push origin v0.1.0
   ```
3. Acompanhe em *Actions → android*. O primeiro build leva mais tempo (cache do Gradle vazio).
4. Para repetir sem tag nova, use *Actions → android → Run workflow*. Esse botão só aparece depois que `android.yml` estiver na branch padrão (`main`).

## Baixar e instalar o APK

- **Artifacts:** abra a execução em *Actions*, role até *Artifacts* e baixe `duofitness-android-<versão>-<run>`. É um `.zip` com o `.apk` e o `.aab`. Os artifacts ficam **30 dias**. É preciso estar logado no GitHub com acesso ao repositório.
- **Vercel Blob (opcional):** com `BLOB_READ_WRITE_TOKEN` configurado, o resumo da execução mostra os links `duofitness-latest.apk` (sempre o último) e `duofitness-<versão>.apk`. Os links são **públicos**: quem tiver o link baixa o APK. O token vem de *Vercel → Storage → Blob → (seu store) → `BLOB_READ_WRITE_TOKEN`*.
- **Instalar no celular:** envie o `.apk` para o aparelho e abra. O Android pede para permitir instalar de "fontes desconhecidas" para o app usado (navegador ou gerenciador de arquivos).
- O **AAB** é o formato para enviar à Play Store. Não instala direto no celular.

## ABIs (arquiteturas)

O workflow compila só `arm64-v8a` e `armeabi-v7a` (variável `ANDROID_ABIS` no topo do `android.yml`). Isso cobre os celulares atuais e deixa o APK menor e o build mais rápido. O resumo da execução mostra as ABIs conferidas dentro do APK.

- **Emulador (x86_64):** edite `ANDROID_ABIS: arm64-v8a,armeabi-v7a,x86_64`.
- **Play Store:** o AAB deve voltar a incluir **todas** as ABIs: `ANDROID_ABIS: armeabi-v7a,arm64-v8a,x86,x86_64` (o padrão do template do Expo). Faça essa troca antes de gerar o AAB que vai para a loja. Como o workflow usa a mesma variável para o APK e o AAB, o APK dessa execução também fica maior.

## Checagens rápidas antes do build

Duas etapas do `android.yml` rodam **antes** do cache do Gradle, do `npm ci` e do Gradle. Elas falham em segundos, com a causa na tela, em vez de derrubar o build depois de vários minutos. A ordem é: versão, secrets presentes, Node e JDK, **PNGs**, decodificar o keystore, **validar o keystore**, cache, `npm ci`, prebuild e Gradle.

### 1) PNGs do app (`scripts/check-pngs.mjs`)

O empacotador de recursos do Android (AAPT2) recusa PNGs fora do padrão, e esse erro só aparecia no meio do Gradle. O caso real foi o `assets/logo.png`, que era um **JPEG com extensão `.png`**.

O script só usa módulos do Node (nenhuma dependência nova) e confere:

- os `*.png` de `assets/`, os `.png` citados no `app.json` e os `.png` importados ou requeridos em `src/` e `App.js`;
- **ERRO** (falha o build): assinatura PNG inválida (diz se o conteúdo é JPEG, GIF, WebP ou BMP), arquivo truncado, CRC de chunk inválido, PNG **entrelaçado** (Adam7), dados da imagem corrompidos ou incompletos (descompressão zlib e tamanho esperado) e arquivo referenciado que **não existe**;
- **AVISO** (não falha): bits por canal diferente de 8.

Cada problema aparece com o caminho do arquivo (no GitHub, como anotação `::error file=...` ou `::warning file=...`). Para rodar na sua máquina, na raiz do app:

```powershell
node scripts/check-pngs.mjs
```

Para corrigir, abra a imagem num editor e exporte de novo como PNG de verdade, 8 bits por canal (RGB ou RGBA) e sem entrelaçamento. A mesma checagem roda no job `app` do `ci.yml`, então o erro aparece já no pull request, não só no build da tag. Os testes do script ficam em `backend/test/pngcheck.test.ts` (rodam o script como processo externo, com fixtures temporárias).

### 2) Keystore (alias, senha do keystore e senha da chave)

O passo "Validar keystore" faz o que o Gradle fará: abre o keystore e extrai a chave para um arquivo temporário (`keytool -importkeystore` para `$RUNNER_TEMP/keycheck.p12`). Se falhar, diz **qual secret está errado**:

| Situação | Mensagem aponta para |
|---|---|
| senha do keystore não confere | `ANDROID_KEYSTORE_PASSWORD` |
| alias não existe | `ANDROID_KEY_ALIAS` (maiúsculas e minúsculas contam) |
| senha da chave não confere (keystore JKS) | `ANDROID_KEY_PASSWORD` |
| arquivo ilegível, vazio ou corrompido | `ANDROID_KEYSTORE_BASE64` |
| keystore PKCS12 com senhas diferentes | `ANDROID_KEY_PASSWORD` (mensagem abaixo) |

> Em keystore PKCS12 as senhas do keystore e da chave precisam ser iguais. Atualize ANDROID_KEY_PASSWORD com o mesmo valor de ANDROID_KEYSTORE_PASSWORD.

Esse último caso existe porque o `keytool` **ignora** a senha da chave em keystore PKCS12 (o formato que ele gera hoje), mas o Gradle não: uma `ANDROID_KEY_PASSWORD` diferente passaria no `keytool` e só falharia no Gradle. O tipo do keystore é lido dos primeiros bytes do arquivo.

Garantias: as senhas só passam por variáveis de ambiente (`-srcstorepass:env`, `-srckeypass:env`), a senha do arquivo temporário é aleatória e mascarada nos logs, e **nenhuma senha nem a saída crua do `keytool` é impressa** (a saída só serve para classificar o erro). O `keytool` roda em inglês (`-J-Duser.language=en`) para a classificação não depender do idioma do sistema. O `keycheck.p12` e o keystore decodificado são apagados no último passo, com `if: always()`, mesmo se algo falhar antes.

## Problemas comuns

- **"Faltam secrets de assinatura: ..."**: cadastre os nomes listados.
- **Falha em "Validar keystore"**: a mensagem diz qual secret corrigir (tabela na seção "Checagens rápidas antes do build").
- **Falha em "Conferir PNGs do app"**: o log lista o caminho de cada PNG com problema e o motivo. Regrave a imagem como PNG de 8 bits, sem entrelaçamento.
- **"ANDROID_KEYSTORE_BASE64 não é um base64 válido"**: refaça a conversão e cole sem aspas.
- **"O APK foi assinado com a chave de DEBUG"**: o plugin não aplicou a assinatura de release. Confira se `./plugins/withAndroidRelease` está em `plugins` no `app.json`.
- **Falha no Gradle ou no JDK:** o projeto está no Expo SDK 51 (React Native 0.74, Gradle 8.8, JDK 17). Se o build falhar por causa dessa combinação, não troque de SDK por conta própria: guarde o log do passo "Build (APK e AAB)" e trate numa etapa separada.
- **Build local sem secrets:** `npx expo prebuild --platform android` gera o `android/` com a assinatura de debug e a versão do `app.json`. Para testar o plugin, defina `ANDROID_VERSION_CODE`, `APP_VERSION_NAME` e `ANDROID_KEYSTORE_FILE` antes e confira `android/app/build.gradle`. Apague o `android/` depois (ele é ignorado pelo git).
