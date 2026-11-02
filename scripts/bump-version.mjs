// Sobe a versão do app (SemVer 2.0.0). Fonte única: app.json (núcleo MAJOR.MINOR.PATCH em expo.version) + versao.json (prelançamento).
// Atualiza app.json, package.json (só o núcleo) e versao.json, e escreve a entrada no CHANGELOG.md (Keep a Changelog, português).
// NÃO faz commit nem tag: imprime os comandos git sugeridos. Convenção em docs/versionamento.md.
//
// Uso: node scripts/bump-version.mjs <patch | minor | major | beta | rc | release> [--dry-run] [--root <pasta>] [--date AAAA-MM-DD]
//   patch/minor/major  sobem o número, zeram à direita e limpam o prelançamento (1.4.2-rc.2 + minor = 1.5.0)
//   beta               beta.N+1 (ou beta.1)       rc  rc.N+1 (ou rc.1)       release  remove o prelançamento
// Recusa beta/rc/release sobre um núcleo que já tem tag vX.Y.Z (versão lançada não muda) e voltar de rc para beta.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUMP_KINDS, bump, releaseName } from './lib/semver.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const root = path.resolve(arg('--root', path.join(here, '..')));
const dry = process.argv.includes('--dry-run');

const readJson = (f) => JSON.parse(readFileSync(path.join(root, f), 'utf8'));
// grava preservando o fim de linha e a indentação do arquivo
function writeJson(f, obj) {
  const p = path.join(root, f);
  const old = existsSync(p) ? readFileSync(p, 'utf8') : '';
  const nl = old.includes('\r\n') ? '\r\n' : '\n';
  writeFileSync(p, `${JSON.stringify(obj, null, 2)}\n`.replace(/\n/g, nl), 'utf8');
}

const UNRELEASED = '## [Não lançado]';
// Move o conteúdo de "[Não lançado]" para a nova versão e deixa "[Não lançado]" vazio. Puro (texto -> texto).
export function updateChangelog(text, name, date) {
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const t = text.replace(/\r\n/g, '\n');
  const start = t.indexOf(UNRELEASED);
  if (start === -1) throw new Error('CHANGELOG.md não tem a seção "## [Não lançado]".');
  const bodyStart = start + UNRELEASED.length;
  const next = t.indexOf('\n## ', bodyStart);
  const end = next === -1 ? t.length : next + 1;
  const body = t.slice(bodyStart, next === -1 ? t.length : next).trim();
  const entry = `## [${name}] - ${date}\n\n${body || '- Sem mudanças registradas.'}\n\n`;
  const out = `${t.slice(0, start)}${UNRELEASED}\n\n${entry}${t.slice(end)}`;
  return out.replace(/\n/g, nl);
}

function tagExists(core) {
  try { return execFileSync('git', ['tag', '-l', `v${core}`], { cwd: root, encoding: 'utf8' }).trim() === `v${core}`; } catch { return false; }
}

function main() {
  const kind = process.argv[2];
  if (!kind || kind.startsWith('--')) { console.error(`Uso: node scripts/bump-version.mjs <${BUMP_KINDS.join(' | ')}> [--dry-run]`); process.exit(2); }
  const app = readJson('app.json');
  const pkg = readJson('package.json');
  const ver = existsSync(path.join(root, 'versao.json')) ? readJson('versao.json') : { prerelease: '' };
  const current = { core: app.expo.version, prerelease: ver.prerelease ?? '' };
  let next;
  try { next = bump(current, kind, { released: tagExists }); } catch (e) { console.error(`ERRO: ${e.message}`); process.exit(1); }
  const from = releaseName(current.core, current.prerelease);
  const to = releaseName(next.core, next.prerelease);
  const date = arg('--date', new Date().toISOString().slice(0, 10));
  console.log(`${from}  ->  ${to}${dry ? '  (simulação: nada foi gravado)' : ''}`);
  if (dry) return;
  app.expo.version = next.core;
  pkg.version = next.core;
  writeJson('app.json', app);
  writeJson('package.json', pkg);
  writeJson('versao.json', { prerelease: next.prerelease });
  const log = path.join(root, 'CHANGELOG.md');
  if (existsSync(log)) writeFileSync(log, updateChangelog(readFileSync(log, 'utf8'), to, date), 'utf8');
  else console.warn('AVISO: CHANGELOG.md não existe; nada foi escrito nele.');
  console.log('\nGravado em app.json, package.json, versao.json e CHANGELOG.md. Revise e rode: node scripts/check-version.mjs');
  console.log('\nComandos sugeridos (nada foi executado):');
  console.log(`  git add app.json package.json versao.json CHANGELOG.md`);
  console.log(`  git commit -m "chore(versão): ${to}"`);
  console.log(`  git tag v${to}        # dispara o android.yml (a tag precisa bater com ${to})`);
  console.log(`  git tag ios-v${to}    # dispara o ios.yml`);
  console.log('  git push --follow-tags   # só quando você decidir publicar');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
