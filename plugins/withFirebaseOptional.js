// Config plugin local: Firebase (conta) OPCIONAL no prebuild. Sem FIREBASE_ENABLED=true e sem os arquivos de
// configuração, devolve o config INTACTO: o prebuild, o expo-doctor e os builds ficam como antes (sem frameworks
// estáticos no iOS, sem Google Services no Android, sem entitlement da Apple).
//
// Com FIREBASE_ENABLED=true, cada plataforma só é configurada se o arquivo dela existir:
//   Android: FIREBASE_ANDROID_CONFIG (padrão .firebase-config/google-services.json)
//   iOS:     FIREBASE_IOS_CONFIG     (padrão .firebase-config/GoogleService-Info.plist)
// Os workflows gravam esses arquivos a partir dos secrets (base64) antes do prebuild e os apagam no fim.
// O conteúdo dos arquivos nunca é impresso.
const fs = require('node:fs');
const path = require('node:path');
const { IOSConfig, withInfoPlist, withPlugins } = require('expo/config-plugins');

// os app.plugin.js dos pacotes exportam o plugin em `default` (interop ESM)
const plug = (name) => { const m = require(name); return m && m.default ? m.default : m; };

const exists = (p) => {
  try { return fs.statSync(p).isFile(); } catch { return false; }
};

function resolveConfigFiles(env = process.env, cwd = process.cwd()) {
  const enabled = String(env.FIREBASE_ENABLED || '').trim().toLowerCase() === 'true';
  const android = path.resolve(cwd, env.FIREBASE_ANDROID_CONFIG || '.firebase-config/google-services.json');
  const ios = path.resolve(cwd, env.FIREBASE_IOS_CONFIG || '.firebase-config/GoogleService-Info.plist');
  return {
    enabled,
    androidFile: enabled && exists(android) ? android : null,
    iosFile: enabled && exists(ios) ? ios : null,
  };
}

// Pods do React Native Firebase usados pelo app (@react-native-firebase/app e /auth).
const RNFB_STATIC_PODS = ['RNFBApp', 'RNFBAuth'];

// Plugins do login com Google. SÓ com o plist do iOS E o REVERSED_CLIENT_ID lido: o plugin do google-signin, quando recebe opções,
// exige `iosUrlScheme` (lança "Missing iosUrlScheme" com `{}`), então nunca é chamado com `{}` nem com opções incompletas. Sem o
// plist (Android) devolve lista vazia: o @react-native-firebase/app cuida do google-services e o Android não depende deste plugin.
function googlePlugins(iosFile, load = plug) {
  if (!iosFile) return [];
  const scheme = readReversedClientId(iosFile);
  if (!scheme) {
    console.warn('[withFirebaseOptional] O GoogleService-Info.plist não tem REVERSED_CLIENT_ID: o login com Google no iOS não vai voltar ao app.');
    return [];
  }
  return [
    [load('@react-native-google-signin/google-signin/app.plugin.js'), { iosUrlScheme: scheme }],
    // garantia própria e independente do plugin de terceiros (idempotente; preserva os esquemas existentes)
    (cfg) => withGoogleReversedClientId(cfg, scheme),
  ];
}

const withFirebaseOptional = (config) => {
  const { enabled, androidFile, iosFile } = resolveConfigFiles();
  if (!enabled) return config;
  if (!androidFile && !iosFile) {
    console.warn('[withFirebaseOptional] FIREBASE_ENABLED=true, mas nenhum arquivo de configuração foi encontrado: seguindo SEM Firebase.');
    return config;
  }

  const next = { ...config };
  const plugins = [];
  if (androidFile) next.android = { ...(config.android || {}), googleServicesFile: androidFile };
  if (iosFile) {
    next.ios = { ...(config.ios || {}), googleServicesFile: iosFile, usesAppleSignIn: true };
    // O Firebase no iOS exige frameworks estáticos; só entram quando há o arquivo do iOS.
    // forceStaticLinking: remédio documentado do RNFB com frameworks estáticos (RNFB #8657, Expo #39607): os pods RNFB viram
    // bibliotecas estáticas e deixam de dar "non-modular header inside framework module" com o React Native pré-compilado.
    plugins.push([plug('expo-build-properties/app.plugin.js'), { ios: { useFrameworks: 'static', forceStaticLinking: RNFB_STATIC_PODS } }]);
    plugins.push(plug('expo-apple-authentication/app.plugin.js'));
    plugins.push(require('./withFirebaseIosFix')); // ajustes do Podfile (só com a flag; idempotente)
  }
  plugins.push(plug('@react-native-firebase/app/app.plugin.js'));
  // O plugin do google-signin só serve ao URL scheme do iOS: com opções ele entra no caminho "sem Firebase" e EXIGE `iosUrlScheme`
  // (lança "Missing iosUrlScheme" com `{}`). Por isso só é chamado quando o plist do iOS existe E o REVERSED_CLIENT_ID foi lido;
  // nunca com `{}` nem com opções incompletas. No Android (só google-services.json) ele nem entra: o @react-native-firebase/app já
  // cuida do google-services (classpath, apply plugin e cópia do arquivo) e o login com Google lê a configuração dele.
  // O valor do esquema nunca é impresso.
  plugins.push(...googlePlugins(iosFile));
  return withPlugins(next, plugins);
};

// Acrescenta um URL scheme ao Info.plist SEM duplicar e SEM apagar os que já existem (o do app, o do Expo...). Puro e idempotente.
function addUrlScheme(infoPlist, scheme) {
  if (!scheme) return infoPlist;
  if (IOSConfig.Scheme.hasScheme(scheme, infoPlist)) return infoPlist;
  return IOSConfig.Scheme.appendScheme(scheme, infoPlist);
}

// Garantia independente do plugin do Google: o REVERSED_CLIENT_ID do plist vira URL scheme do app. Sem ele o retorno do login com
// Google não volta ao app. Só entra com FIREBASE_ENABLED=true e plist presente (ver withFirebaseOptional). O valor nunca é impresso.
const withGoogleReversedClientId = (config, scheme) => withInfoPlist(config, (cfg) => {
  cfg.modResults = addUrlScheme(cfg.modResults, scheme);
  return cfg;
});

// REVERSED_CLIENT_ID do GoogleService-Info.plist ('' se ausente ou ilegível). Só leitura; nunca imprime.
function readReversedClientId(file) {
  try {
    const text = require('fs').readFileSync(file, 'utf8');
    return /<key>REVERSED_CLIENT_ID<\/key>\s*<string>([^<]+)<\/string>/.exec(text)?.[1] || '';
  } catch {
    return '';
  }
}

module.exports = withFirebaseOptional;
module.exports.readReversedClientId = readReversedClientId;
module.exports.addUrlScheme = addUrlScheme;
module.exports.googlePlugins = googlePlugins;
module.exports.resolveConfigFiles = resolveConfigFiles;
module.exports.RNFB_STATIC_PODS = RNFB_STATIC_PODS;
