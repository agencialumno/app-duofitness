// Config plugin local: correções do Podfile para o React Native Firebase (RNFB) com frameworks estáticos no iOS.
// Só é aplicado por plugins/withFirebaseOptional.js (FIREBASE_ENABLED=true E arquivo do iOS presente) e, por garantia,
// não faz nada sem FIREBASE_ENABLED=true: o Podfile dos builds normais fica EXATAMENTE como o template do Expo.
//
// Problema (Expo SDK 54, RN 0.81, Xcode 26): com use_frameworks static, o pod RNFBApp vira um framework e o archive falha com
// "include of non-modular header inside framework module 'RNFBApp...' (RCTConvert.h, RCTBridgeModule.h...)
// [-Werror,-Wnon-modular-include-in-framework-module]", porque o React Native pré-compilado (React-Core-prebuilt) não é modular.
//
// Remédio DOCUMENTADO (RNFB #8657 e Expo #39607): expo-build-properties com forceStaticLinking (feito em withFirebaseOptional.js).
// Este plugin acrescenta, no Podfile gerado:
//  1) $RNFirebaseAsStaticFramework = true (o podspec do RNFB lê essa variável: s.static_framework);
//  2) no post_install, nos pods RNFB*: CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES e
//     -Wno-non-modular-include-in-framework-module, para o aviso não virar erro (cinto e suspensório; a Expo desaconselha usar
//     isso em TODOS os pods, por isso fica restrito aos pods RNFB).
// Idempotente (marcadores). Se o template do Podfile mudar e os trechos âncora sumirem, FALHA com mensagem clara.
const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');

const MARK_VAR = '# [withFirebaseIosFix] variável';
const MARK_POST = '# [withFirebaseIosFix] post_install';

const VAR_BLOCK = `${MARK_VAR}: o podspec do RNFB lê $RNFirebaseAsStaticFramework (frameworks estáticos)
$RNFirebaseAsStaticFramework = true
`;

const POST_BLOCK = `    ${MARK_POST}: RNFB com frameworks estáticos e React Native pré-compilado (includes não modulares)
    installer.pods_project.targets.each do |target|
      next unless target.name.start_with?('RNFB')
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        cflags = [config.build_settings['OTHER_CFLAGS']].flatten.compact
        cflags = ['$(inherited)'] if cflags.empty?
        cflags << '-Wno-non-modular-include-in-framework-module' unless cflags.include?('-Wno-non-modular-include-in-framework-module')
        config.build_settings['OTHER_CFLAGS'] = cflags
      end
    end
`;

const ANCHOR_TARGET = /^prepare_react_native_project!\s*$/m;
const ANCHOR_POST = /^(\s*)post_install do \|installer\|\s*$/m;

class PodfileTemplateError extends Error {}

// Devolve o texto do Podfile com as correções (idempotente). Lança PodfileTemplateError se o template mudou.
function patchPodfile(text) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  let out = text.replace(/\r\n/g, '\n');

  if (!out.includes(MARK_VAR)) {
    if (!ANCHOR_TARGET.test(out)) {
      throw new PodfileTemplateError('[withFirebaseIosFix] não encontrei "prepare_react_native_project!" no Podfile gerado: o template do Expo mudou. Atualize plugins/withFirebaseIosFix.js (e confira o remédio do RNFB para a nova versão do SDK).');
    }
    out = out.replace(ANCHOR_TARGET, (m) => `${VAR_BLOCK}\n${m}`);
  }

  if (!out.includes(MARK_POST)) {
    if (!ANCHOR_POST.test(out)) {
      throw new PodfileTemplateError('[withFirebaseIosFix] não encontrei "post_install do |installer|" no Podfile gerado: o template do Expo mudou. Atualize plugins/withFirebaseIosFix.js.');
    }
    out = out.replace(ANCHOR_POST, (m) => `${m}\n${POST_BLOCK.replace(/\n$/, '')}`);
  }
  return out.replace(/\n/g, eol);
}

const enabled = () => String(process.env.FIREBASE_ENABLED || '').trim().toLowerCase() === 'true';

const withFirebaseIosFix = (config) => {
  if (!enabled()) return config;
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfile)) throw new PodfileTemplateError(`[withFirebaseIosFix] Podfile não encontrado em ${podfile}`);
      fs.writeFileSync(podfile, patchPodfile(fs.readFileSync(podfile, 'utf8')));
      return cfg;
    },
  ]);
};

module.exports = withFirebaseIosFix;
module.exports.patchPodfile = patchPodfile;
module.exports.PodfileTemplateError = PodfileTemplateError;
module.exports.MARK_VAR = MARK_VAR;
module.exports.MARK_POST = MARK_POST;
