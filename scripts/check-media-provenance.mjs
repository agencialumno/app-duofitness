// Portão de procedência das fotos de referência dos exercícios (assets/exercicios-ref/, vindas do free-exercise-db, origem original NÃO verificada).
// Falha (exit 1) quando, ao mesmo tempo: (1) RELEASE_BUILD=true (build de loja), (2) existem fotos em assets/exercicios-ref/ e (3) o campo
// "CONFIRMADO:" de docs/procedencia-midia.md não é "sim". Em qualquer outro caso passa (exit 0): sem a variável, sem as fotos (build de CI, que não as
// tem) ou com a procedência confirmada. Não imprime caminhos de fotos além da contagem.
//
// Uso: RELEASE_BUILD=true node scripts/check-media-provenance.mjs [--root <pasta do app>]
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIELD = /^\s*CONFIRMADO:\s*(sim|n[ãa]o)\b/im;

export function readConfirmed(docText) {
  const m = FIELD.exec(String(docText ?? ''));
  if (!m) return null; // campo ausente ou ilegível: tratado como "não"
  return m[1].toLowerCase() === 'sim';
}

export function countPhotos(dir) {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) n += countPhotos(p);
    else if (/\.(jpe?g|png|webp)$/i.test(name)) n++;
  }
  return n;
}

export function evaluate({ release, photos, confirmed }) {
  if (!release) return { ok: true, message: 'RELEASE_BUILD não está ligada: procedência das fotos não é exigida neste build.' };
  if (photos === 0) return { ok: true, message: 'Sem fotos de referência neste build: nada a confirmar.' };
  if (confirmed === true) return { ok: true, message: `Procedência confirmada (CONFIRMADO: sim): ${photos} foto(s) liberada(s) para o build de loja.` };
  return {
    ok: false,
    message: `BLOQUEADO: há ${photos} foto(s) em assets/exercicios-ref/ e a procedência NÃO está confirmada (docs/procedencia-midia.md, campo "CONFIRMADO:" = ${confirmed === false ? '"não"' : 'ausente'}). `
      + 'Build de loja não pode levar fotos de origem não verificada. Remova as fotos (node scripts/preparar-fotos-exercicios.mjs --limpar) ou confirme a procedência e mude o campo para "sim".',
  };
}

function main() {
  const i = process.argv.indexOf('--root');
  const root = path.resolve(i > -1 ? process.argv[i + 1] : path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const docFile = path.join(root, 'docs/procedencia-midia.md');
  const confirmed = existsSync(docFile) ? readConfirmed(readFileSync(docFile, 'utf8')) : null;
  const r = evaluate({
    release: String(process.env.RELEASE_BUILD || '').trim().toLowerCase() === 'true',
    photos: countPhotos(path.join(root, 'assets/exercicios-ref')),
    confirmed,
  });
  console.log(`${r.ok ? '' : (process.env.GITHUB_ACTIONS === 'true' ? '::error::' : 'ERRO  ')}${r.message}`);
  process.exit(r.ok ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
