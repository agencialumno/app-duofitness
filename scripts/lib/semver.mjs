// SemVer 2.0.0 (https://semver.org/lang/pt-BR/) para o Duo Fitness: funções puras, sem rede e sem git. Usadas por bump-version.mjs, check-version.mjs e
// pelos testes. Convenção do app em docs/versionamento.md.

// Expressão regular OFICIAL do semver.org (a sugerida na especificação, com grupos nomeados trocados por numerados).
export const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
export const CORE_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
// Prelançamentos que o app usa: "" (versão final), "beta.N" ou "rc.N" (N inteiro >= 1, sem zero à esquerda).
export const PRERELEASE_RE = /^(?:(?:beta|rc)\.[1-9]\d*)?$/;

// Pisos de build por plataforma: a build (github.run_number do workflow) precisa ser MAIOR que o piso. iOS: 31 é a maior já enviada ao TestFlight.
export const BUILD_FLOORS = { ios: 31, android: 0 };
export const MAX_VERSION_CODE = 2100000000; // limite do Google Play

export function parse(name) {
  const m = SEMVER_RE.exec(String(name ?? ''));
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], core: `${m[1]}.${m[2]}.${m[3]}`, prerelease: m[4] ?? '', build: m[5] ?? '' };
}
export const isValid = (name) => SEMVER_RE.test(String(name ?? ''));

// Nome completo: núcleo + (-prelançamento) + (+build). Só o núcleo vai aos campos de versão das lojas.
export function fullName(core, prerelease = '', build = '') {
  return `${core}${prerelease ? `-${prerelease}` : ''}${build !== '' && build != null ? `+${build}` : ''}`;
}
// Nome esperado de uma tag/versão (sem o +build, que não participa da precedência)
export const releaseName = (core, prerelease = '') => fullName(core, prerelease, '');

// Canal de distribuição pelo prelançamento
export function channelOf(prerelease) {
  if (!prerelease) return 'store';
  if (prerelease.startsWith('rc.')) return 'rc';
  if (prerelease.startsWith('beta.')) return 'beta';
  return 'dev';
}

// ---- precedência (item 11 da SemVer) ----
const isNum = (s) => /^\d+$/.test(s);
function cmpIdent(a, b) {
  if (isNum(a) && isNum(b)) return Math.sign(+a - +b);
  if (isNum(a)) return -1; // identificador numérico < alfanumérico
  if (isNum(b)) return 1;
  return a < b ? -1 : a > b ? 1 : 0; // ASCII
}
// -1, 0 ou 1. O +build NÃO conta. Versão final > qualquer prelançamento do mesmo núcleo; alpha < beta < rc (ordem ASCII dos identificadores).
export function compare(a, b) {
  const x = typeof a === 'string' ? parse(a) : a;
  const y = typeof b === 'string' ? parse(b) : b;
  if (!x || !y) throw new Error('versão inválida na comparação');
  for (const k of ['major', 'minor', 'patch']) if (x[k] !== y[k]) return x[k] < y[k] ? -1 : 1;
  if (x.prerelease === y.prerelease) return 0;
  if (!x.prerelease) return 1;
  if (!y.prerelease) return -1;
  const pa = x.prerelease.split('.');
  const pb = y.prerelease.split('.');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if (pa[i] === undefined) return -1; // conjunto menor tem precedência menor
    if (pb[i] === undefined) return 1;
    const c = cmpIdent(pa[i], pb[i]);
    if (c) return c;
  }
  return 0;
}

// ---- bump ----
export const BUMP_KINDS = ['patch', 'minor', 'major', 'beta', 'rc', 'release'];
const preNum = (pre, tag) => { const m = new RegExp(`^${tag}\\.([1-9]\\d*)$`).exec(pre); return m ? +m[1] : 0; };

/**
 * { core, prerelease } -> novo { core, prerelease }.
 *  patch/minor/major: sobem o número, zeram à direita e LIMPAM o prelançamento;
 *  beta: beta.N+1, ou beta.1 se não havia beta; rc: rc.N+1, ou rc.1 (vindo de beta ou de um núcleo ainda não lançado);
 *  release: remove o prelançamento.
 * `released(core)` (opcional) diz se o núcleo já foi lançado (tem tag): uma versão lançada nunca muda, então beta/rc/release sobre ela são recusados.
 * Nunca volta de rc para beta (a precedência cairia).
 */
export function bump(current, kind, { released = () => false } = {}) {
  const p = parse(releaseName(current.core, current.prerelease));
  if (!p) throw new Error(`versão atual inválida: ${releaseName(current.core, current.prerelease)}`);
  if (!PRERELEASE_RE.test(current.prerelease)) throw new Error(`prelançamento fora do padrão ("", beta.N ou rc.N): ${current.prerelease}`);
  if (!BUMP_KINDS.includes(kind)) throw new Error(`tipo inválido: ${kind} (use ${BUMP_KINDS.join(' | ')})`);
  let { major, minor, patch } = p;
  const pre = current.prerelease;
  if (kind === 'patch') return { core: `${major}.${minor}.${patch + 1}`, prerelease: '' };
  if (kind === 'minor') return { core: `${major}.${minor + 1}.0`, prerelease: '' };
  if (kind === 'major') return { core: `${major + 1}.0.0`, prerelease: '' };
  if (kind === 'release') {
    if (!pre) throw new Error(`${p.core} já é uma versão final (sem prelançamento).`);
    return { core: p.core, prerelease: '' };
  }
  if (!pre && released(p.core)) throw new Error(`${p.core} já foi lançada (tem tag): versão lançada não muda. Suba patch, minor ou major antes de abrir um beta/rc.`);
  if (kind === 'beta') {
    if (pre.startsWith('rc.')) throw new Error(`já está em ${pre}: não se volta de rc para beta (a precedência cairia). Use rc, release ou suba patch/minor/major.`);
    return { core: p.core, prerelease: `beta.${preNum(pre, 'beta') + 1}` };
  }
  return { core: p.core, prerelease: `rc.${preNum(pre, 'rc') + 1}` }; // rc
}

// ---- build ----
// RUN_NUMBER (texto ou número) -> inteiro positivo ou null
export function toBuild(v) {
  const n = typeof v === 'number' ? v : /^\d+$/.test(String(v ?? '').trim()) ? Number(String(v).trim()) : NaN;
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
export function checkBuild(platform, build) {
  const problems = [];
  const n = toBuild(build);
  if (n === null) { problems.push(`build "${build}" não é um inteiro positivo`); return problems; }
  if (!(platform in BUILD_FLOORS)) { problems.push(`plataforma desconhecida: ${platform}`); return problems; }
  if (platform === 'android' && n > MAX_VERSION_CODE) problems.push(`versionCode ${n} passa do limite do Google Play (${MAX_VERSION_CODE})`);
  if (n <= BUILD_FLOORS[platform]) problems.push(`build ${n} é menor ou igual ao piso de ${platform} (${BUILD_FLOORS[platform]}): a loja recusaria ou repetiria uma build já enviada`);
  return problems;
}

// ---- tag ----
// "v1.0.0-beta.3" ou "ios-v1.0.0" -> "1.0.0-beta.3" (ou null se o prefixo não for o esperado)
export function stripTagPrefix(tag) {
  const m = /^(?:ios-)?v(.+)$/.exec(String(tag ?? ''));
  return m ? m[1] : null;
}
// Erros da conferência da tag contra o nome esperado (núcleo + prelançamento de versao.json)
export function checkTag(tag, expectedName) {
  const name = stripTagPrefix(tag);
  if (name === null) return [`a tag "${tag}" não começa com v (ou ios-v)`];
  if (!isValid(name)) return [`a tag "${tag}" não é um nome SemVer válido (esperado vMAJOR.MINOR.PATCH ou vMAJOR.MINOR.PATCH-beta.N / -rc.N)`];
  if (parse(name).build) return [`a tag "${tag}" não deve ter +build (a build vem do run_number)`];
  if (name !== expectedName) return [`a tag "${tag}" (${name}) diverge da versão do app (${expectedName} = app.json + versao.json). Atualize a versão (scripts/bump-version.mjs) ou crie a tag certa: v${expectedName}`];
  return [];
}
