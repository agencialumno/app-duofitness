// Texto da tela "Sobre" (puro). Todos veem só "Versão {versão}". Os detalhes (canal, build, nome SemVer completo, branch e commit curto) aparecem de saída
// nos canais de teste (dev, beta, rc); em build de loja (store ou sem a variável) ficam ocultos e só 7 toques seguidos no texto da versão os revelam (suporte).
export const TEST_CHANNELS = ['dev', 'beta', 'rc'];
export const CHANNEL_LABEL = { dev: 'desenvolvimento', beta: 'beta', rc: 'candidata a lançamento', store: 'loja' };

const clean = (v) => (v === null || v === undefined ? '' : String(v).trim());

export function buildAboutInfo({ version, build, channel, branch, sha, prerelease } = {}) {
  const v = clean(version);
  const b = clean(build);
  if (!v) {
    return { available: false, versionLine: 'Versão não disponível neste ambiente', details: [], a11y: 'Versão não disponível neste ambiente', a11yFor: () => 'Versão não disponível neste ambiente', showDetails: false };
  }
  const versionLine = `Versão ${v}`;
  const ch = clean(channel).toLowerCase();
  const showDetails = TEST_CHANNELS.includes(ch); // visíveis de saída
  const pre = clean(prerelease);
  const fullName = `${v}${pre ? `-${pre}` : ''}${b ? `+${b}` : ''}`;
  const details = [];
  details.push({ id: 'canal', label: 'Canal', value: CHANNEL_LABEL[ch] ?? CHANNEL_LABEL.store });
  if (b) details.push({ id: 'build', label: 'Build', value: b });
  details.push({ id: 'semver', label: 'Nome completo', value: fullName });
  if (clean(branch)) details.push({ id: 'branch', label: 'Branch', value: clean(branch) });
  if (clean(sha)) details.push({ id: 'commit', label: 'Commit', value: clean(sha) });
  // rótulo de leitor de tela: com os detalhes ocultos continua só "Versão X.Y.Z" (nada sobre o gesto dos 7 toques)
  const a11yFor = (visible) => (visible ? `${versionLine}. ${details.map((d) => `${d.label}: ${d.value}`).join('. ')}.` : versionLine);
  return { available: true, versionLine, details, a11y: a11yFor(showDetails), a11yFor, showDetails, fullName };
}
