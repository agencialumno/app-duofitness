// Identificação da build, injetada pelos workflows (ios.yml e android.yml) como EXPO_PUBLIC_BUILD_*. Em build local as variáveis não existem e a tela
// "Sobre" mostra só a versão. Cada leitura precisa ser `process.env.EXPO_PUBLIC_...` literal (o Metro troca na hora do bundle).
// Canais: dev | beta | rc | store (docs/versionamento.md).
const clean = (v) => String(v ?? '').trim();
export const BUILD_INFO = {
  channel: clean(process.env.EXPO_PUBLIC_BUILD_CHANNEL),
  branch: clean(process.env.EXPO_PUBLIC_BUILD_BRANCH),
  sha: clean(process.env.EXPO_PUBLIC_BUILD_SHA),
  prerelease: clean(process.env.EXPO_PUBLIC_BUILD_PRERELEASE),
};
