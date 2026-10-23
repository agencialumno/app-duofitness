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
const { withPlugins } = require('expo/config-plugins');

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
    plugins.push([plug('expo-build-properties/app.plugin.js'), { ios: { useFrameworks: 'static' } }]);
    plugins.push(plug('expo-apple-authentication/app.plugin.js'));
  }
  plugins.push(plug('@react-native-firebase/app/app.plugin.js'));
  plugins.push(plug('@react-native-google-signin/google-signin/app.plugin.js')); // lê o arquivo (URL scheme do iOS, Android)
  return withPlugins(next, plugins);
};

module.exports = withFirebaseOptional;
module.exports.resolveConfigFiles = resolveConfigFiles;
