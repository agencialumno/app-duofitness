// Confere a versão do app (SemVer 2.0.0) antes do build. Falha (exit 1) com a lista de problemas. Convenção em docs/versionamento.md.
//
// Confere: (1) o nome SemVer (núcleo do app.json + prelançamento do versao.json) pela expressão regular oficial do semver.org; (2) núcleo sem zero à
// esquerda; (3) app.json e package.json iguais; (4) versão curta do iOS só com números e pontos; (5) prelançamento "", beta.N ou rc.N; (6) com
// RUN_NUMBER (ou --build): inteiro positivo, no máximo 2100000000 no Android e MAIOR que o piso da plataforma (iOS 31, Android 0); (7) com --tag: a tag
// bate com o nome esperado (aceita prelançamento: v1.0.0-beta.3); (8) uma tag vX.Y.Z do núcleo atual que já exista não pode apontar para outro núcleo
// nem para outro commit (item 3 da SemVer: versão lançada não muda).
//
// Uso: node scripts/check-version.mjs [--platform ios|android] [--build N] [--tag <ref>] [--root <pasta>]
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_RE, PRERELEASE_RE, checkBuild, checkTag, isValid, parse, releaseName } from './lib/semver.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };

const git = (root, ...a) => { try { return execFileSync('git', a, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };

// Devolve { problems, notes, name }
export function checkVersion({ root, platform, build, tag, gitFn = git }) {
  const problems = [];
  const notes = [];
  const read = (f) => JSON.parse(readFileSync(path.join(root, f), 'utf8'));
  const app = read('app.json');
  const pkg = read('package.json');
  const verFile = path.join(root, 'versao.json');
  if (!existsSync(verFile)) problems.push('versao.json não existe (esperado { "prerelease": "" | "beta.N" | "rc.N" })');
  const ver = existsSync(verFile) ? read('versao.json') : { prerelease: '' };
  const core = app.expo?.version;
  const pre = ver.prerelease ?? '';
  if (typeof core !== 'string' || !CORE_RE.test(core)) problems.push(`app.json expo.version "${core}" não é MAJOR.MINOR.PATCH sem zero à esquerda`);
  if (typeof pre !== 'string' || !PRERELEASE_RE.test(pre)) problems.push(`versao.json prerelease "${pre}" fora do padrão ("", beta.N ou rc.N, N >= 1)`);
  const name = releaseName(String(core), String(pre));
  if (!isValid(name)) problems.push(`"${name}" não é um nome SemVer válido (expressão regular oficial do semver.org)`);
  if (pkg.version !== core) problems.push(`package.json (${pkg.version}) e app.json (${core}) divergem: use scripts/bump-version.mjs`);
  if (!/^\d+(\.\d+){0,2}$/.test(String(core))) problems.push(`a versão curta do iOS só pode ter números e pontos (app.json: ${core})`);

  if (build !== undefined && build !== '' && build !== null) {
    if (!platform) problems.push('informe --platform ios|android para conferir a build');
    else problems.push(...checkBuild(platform, build));
  }
  if (tag) problems.push(...checkTag(tag, name));

  // item 3 da SemVer: versão lançada não muda
  if (parse(name)) {
    const t = `v${core}`;
    if (gitFn(root, 'rev-parse', '--git-dir') === null) notes.push('sem git aqui: conferência de tags pulada');
    else if (gitFn(root, 'tag', '-l', t) === t) {
      const tagCommit = gitFn(root, 'rev-list', '-n', '1', t);
      const head = gitFn(root, 'rev-parse', 'HEAD');
      let tagCore = null;
      try { tagCore = JSON.parse(gitFn(root, 'show', `${t}:app.json`) ?? 'null')?.expo?.version ?? null; } catch { tagCore = null; }
      if (tagCore !== null && tagCore !== core) problems.push(`a tag ${t} aponta para um app.json com versão ${tagCore}, não ${core}: versão lançada não muda`);
      else if (tagCommit && head && tagCommit !== head) problems.push(`a tag ${t} já existe em outro commit: ${core} já foi lançada e não pode mudar. Suba a versão (patch, minor ou major) com scripts/bump-version.mjs`);
    } else if (!tag) notes.push(`tag v${core} ainda não existe (versão não lançada)`);
  }
  return { problems, notes, name };
}

function main() {
  const root = path.resolve(arg('--root', path.join(here, '..')));
  const platform = arg('--platform');
  const build = arg('--build', process.env.RUN_NUMBER);
  const tag = arg('--tag', '');
  const r = checkVersion({ root, platform, build, tag });
  const onGithub = process.env.GITHUB_ACTIONS === 'true';
  for (const p of r.problems) console.log(`${onGithub ? '::error::' : 'ERRO  '}${p}`);
  if (r.problems.length) { console.log(`\ncheck-version: ${r.problems.length} problema(s).`); process.exit(1); }
  console.log(`check-version: ${r.name} ok${platform && build ? ` (${platform}, build ${build})` : ''}${tag ? `, tag ${tag} confere` : ''}.`);
  for (const n of r.notes) console.log(`  nota: ${n}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
