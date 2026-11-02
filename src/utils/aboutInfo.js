// Texto da tela "Sobre" (puro). Todos veem "Versão {versão} ({build})". Nos canais de teste (dev, beta, rc) aparecem também o nome SemVer completo
// (núcleo + -prelançamento + +build), a branch e o commit curto. Sem as variáveis da build (build local) ou no canal store, só a versão.
export const TEST_CHANNELS = ['dev', 'beta', 'rc'];
export const CHANNEL_LABEL = { dev: 'desenvolvimento', beta: 'beta', rc: 'candidata a lançamento', store: 'loja' };

const clean = (v) => (v === null || v === undefined ? '' : String(v).trim());

export function buildAboutInfo({ version, build, channel, branch, sha, prerelease } = {}) {
  const v = clean(version);
  const b = clean(build);
  if (!v) {
    return { available: false, versionLine: 'Versão não disponível neste ambiente', details: [], a11y: 'Sobre o app. Versão não disponível neste ambiente.', showDetails: false };
  }
  const versionLine = b ? `Versão ${v} (${b})` : `Versão ${v}`;
  const ch = clean(channel).toLowerCase();
  const showDetails = TEST_CHANNELS.includes(ch);
  const pre = clean(prerelease);
  const fullName = `${v}${pre ? `-${pre}` : ''}${b ? `+${b}` : ''}`;
  const details = [];
  if (showDetails) {
    details.push({ id: 'canal', label: 'Canal', value: CHANNEL_LABEL[ch] });
    details.push({ id: 'semver', label: 'Nome completo', value: fullName });
    if (clean(branch)) details.push({ id: 'branch', label: 'Branch', value: clean(branch) });
    if (clean(sha)) details.push({ id: 'commit', label: 'Commit', value: clean(sha) });
  }
  const a11y = `Sobre o app. ${versionLine}.${showDetails ? ` ${details.map((d) => `${d.label}: ${d.value}`).join('. ')}.` : ''}`;
  return { available: true, versionLine, details, a11y, showDetails, fullName };
}
