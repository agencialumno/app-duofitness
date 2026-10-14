// Config plugin local: assinatura de release e versão do Android, sem commitar nada em android/.
//
// O android/ é gerado por "expo prebuild" e fica fora do git. Este plugin roda durante o
// prebuild e ajusta o android/app/build.gradle gerado:
//
//  - cria signingConfigs.release, lendo o keystore de variáveis de ambiente (nenhuma senha
//    em arquivo):
//      ANDROID_KEYSTORE_FILE, ANDROID_KEY_ALIAS, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_PASSWORD
//  - usa essa assinatura no buildType release quando ANDROID_KEYSTORE_FILE existe; sem ela
//    (build local) continua com a assinatura de debug do template;
//  - define versionCode e versionName a partir de ANDROID_VERSION_CODE e APP_VERSION_NAME;
//    sem elas valem os valores do app.json.
//
// Se o template do Expo mudar e os trechos não forem encontrados, o prebuild FALHA de
// propósito (melhor do que gerar um release assinado com a chave de debug).
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// [withAndroidRelease]';

const RELEASE_SIGNING = `
        release {
            ${MARKER}
            if (System.getenv('ANDROID_KEYSTORE_FILE')) {
                storeFile file(System.getenv('ANDROID_KEYSTORE_FILE'))
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_KEY_PASSWORD')
            }
        }`;

function patchBuildGradle(contents) {
  if (contents.includes(MARKER)) return contents; // já aplicado

  // 1) signingConfigs.release logo depois de "signingConfigs {"
  const signingOpen = /signingConfigs\s*\{/;
  if (!signingOpen.test(contents)) {
    throw new Error('withAndroidRelease: bloco "signingConfigs {" não encontrado no build.gradle gerado.');
  }
  let out = contents.replace(signingOpen, (m) => `${m}${RELEASE_SIGNING}`);

  // 2) buildTypes.release passa a usar a assinatura release quando o keystore existe
  const releaseSigning = /(buildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
  if (!releaseSigning.test(out)) {
    throw new Error('withAndroidRelease: "signingConfig signingConfigs.debug" do buildType release não encontrado.');
  }
  out = out.replace(
    releaseSigning,
    "$1signingConfig System.getenv('ANDROID_KEYSTORE_FILE') ? signingConfigs.release : signingConfigs.debug",
  );
  return out;
}

module.exports = function withAndroidRelease(config) {
  const code = Number.parseInt(process.env.ANDROID_VERSION_CODE ?? '', 10);
  if (Number.isInteger(code) && code > 0) {
    config.android = { ...(config.android || {}), versionCode: code };
  }
  const name = (process.env.APP_VERSION_NAME ?? '').trim();
  if (name) {
    config.version = name;
  }

  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withAndroidRelease: build.gradle em Kotlin DSL não é suportado por este plugin.');
    }
    cfg.modResults.contents = patchBuildGradle(cfg.modResults.contents);
    return cfg;
  });
};

module.exports.patchBuildGradle = patchBuildGradle;
