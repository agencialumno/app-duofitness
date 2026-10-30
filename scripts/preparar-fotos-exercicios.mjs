// Prepara as fotos de referência (posição inicial e final) dos exercícios do app, a partir do banco free-exercise-db (Unlicense) que fica FORA do
// repositório. Copia SÓ as fotos dos exercícios mapeados em src/data/exerciseStills.js (confiança "alta" em docs/musculos-exercicios.md), nunca a pasta
// inteira do banco, para assets/exercicios-ref/<id>/0.jpg e 1.jpg (pasta no .gitignore: as fotos NÃO vão para o git; procedência em
// docs/procedencia-midia.md). Redimensiona (lado maior de 720 px), JPEG qualidade 80 (baixa até caber em 80 KB), sem metadados.
// Também grava src/data/exerciseStillsImages.generated.js (no .gitignore) com os require() estáticos do que existe; sem ele o app usa o visual atual.
//
// NÃO roda sem a variável FREE_EXERCISE_DB_DIR (pasta raiz do banco, a que tem "exercises/" e "dist/").
// Uso:
//   FREE_EXERCISE_DB_DIR="D:\\...\\free-exercise-db-main" node scripts/preparar-fotos-exercicios.mjs            copia e prepara as fotos
//   FREE_EXERCISE_DB_DIR=... node scripts/preparar-fotos-exercicios.mjs --gerar-mapa                              reescreve src/data/exerciseStills.js
//        a partir das linhas de confiança "alta" de docs/musculos-exercicios.md (só o mapeamento é commitado)
//   node scripts/preparar-fotos-exercicios.mjs --limpar                                                           apaga as fotos e o arquivo gerado
// Requer ImageMagick (magick) ou ffmpeg no PATH para redimensionar.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
export const OUT_DIR = path.join(root, 'assets/exercicios-ref');
export const GENERATED = path.join(root, 'src/data/exerciseStillsImages.generated.js');
const MAP_FILE = path.join(root, 'src/data/exerciseStills.js');
const DOC = path.join(root, 'docs/musculos-exercicios.md');
export const MAX_SIDE = 720;
export const TARGET_BYTES = 80 * 1024;
const QUALITIES = [80, 72, 64, 56, 48];

// ---- mapa: id do app -> [foto inicial, foto final] relativas a exercises/ do banco ----
export async function readMap() {
  const mod = await import(pathToFileURL(MAP_FILE).href);
  return mod.EXERCISE_STILLS;
}

// Linhas "alta" da tabela do doc: [{ id, bankName }]
export function readAltaRows(docText) {
  const rows = [];
  for (const line of docText.split('\n')) {
    if (!line.startsWith('| `')) continue;
    const c = line.split('|').map((x) => x.trim());
    // | id | Nome | Equip | Principal | EN | Sec | Nível | Banco | Confiança | Revisar |
    if (c.length >= 11 && c[9] === 'alta') rows.push({ id: c[1].replace(/`/g, ''), bankName: c[8] });
  }
  return rows;
}

export function buildMapSource(entries, generatedAt) {
  const lines = entries.map((e) => `  ${e.id}: ['${e.dir}/0.jpg', '${e.dir}/1.jpg'],`);
  return `// Mapa do id do exercício do app -> as duas fotos de referência (posição inicial e final) do banco free-exercise-db (Unlicense),
// relativas à pasta exercises/ do banco. SÓ exercícios com correspondência de confiança "alta" em docs/musculos-exercicios.md; os de confiança
// média ou sem correspondência ficam de fora. GERADO por: node scripts/preparar-fotos-exercicios.mjs --gerar-mapa (${generatedAt}).
// As fotos em si NÃO estão no git (assets/exercicios-ref/ está no .gitignore): veja docs/procedencia-midia.md.
export const EXERCISE_STILLS = {
${lines.join('\n')}
};

// Nomes das duas fotos de um exercício ou null.
export function getStillFiles(id) {
  return EXERCISE_STILLS[id] || null;
}
`;
}

// ---- redimensionar ----
function have(cmd, args) {
  try { execFileSync(cmd, args, { stdio: 'ignore' }); return true; } catch { return false; }
}
function encode(tool, src, dst, q) {
  if (tool === 'magick') {
    execFileSync('magick', [src, '-auto-orient', '-resize', `${MAX_SIDE}x${MAX_SIDE}>`, '-strip', '-interlace', 'none', '-sampling-factor', '4:2:0', '-quality', String(q), dst], { stdio: 'ignore' });
  } else {
    const scale = `scale='if(gt(iw,ih),min(${MAX_SIDE},iw),-2)':'if(gt(iw,ih),-2,min(${MAX_SIDE},ih))'`;
    const qv = Math.max(2, Math.round(31 - (q / 100) * 29));
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-vf', scale, '-map_metadata', '-1', '-q:v', String(qv), '-frames:v', '1', dst], { stdio: 'ignore' });
  }
}

async function main() {
  if (process.argv.includes('--limpar')) {
    rmSync(OUT_DIR, { recursive: true, force: true });
    rmSync(GENERATED, { force: true });
    console.log('Fotos de referência e arquivo gerado apagados.');
    return;
  }
  const dbDir = process.env.FREE_EXERCISE_DB_DIR;
  if (!dbDir) {
    console.error('ERRO: defina FREE_EXERCISE_DB_DIR (pasta do banco free-exercise-db, fora do repositório). Nada foi feito.');
    process.exit(1);
  }
  const exDir = path.join(dbDir, 'exercises');
  if (!existsSync(exDir)) { console.error(`ERRO: não achei ${exDir}.`); process.exit(1); }

  if (process.argv.includes('--gerar-mapa')) {
    const db = JSON.parse(readFileSync(path.join(dbDir, 'dist/exercises.json'), 'utf8'));
    const byName = new Map(db.map((e) => [e.name, e.id]));
    const entries = [];
    const skipped = [];
    for (const r of readAltaRows(readFileSync(DOC, 'utf8'))) {
      const dir = byName.get(r.bankName);
      const ok = dir && existsSync(path.join(exDir, dir, '0.jpg')) && existsSync(path.join(exDir, dir, '1.jpg'));
      if (ok) entries.push({ id: r.id, dir }); else skipped.push(`${r.id} (${r.bankName})`);
    }
    writeFileSync(MAP_FILE, buildMapSource(entries, new Date().toISOString().slice(0, 10)), 'utf8');
    console.log(`Mapa: ${entries.length} exercícios com duas fotos. Sem as duas fotos no banco: ${skipped.join(', ') || 'nenhum'}.`);
    return;
  }

  const tool = have('magick', ['-version']) ? 'magick' : have('ffmpeg', ['-version']) ? 'ffmpeg' : null;
  if (!tool) { console.error('ERRO: instale o ImageMagick (magick) ou o ffmpeg para redimensionar as fotos.'); process.exit(1); }
  const map = await readMap();
  mkdirSync(OUT_DIR, { recursive: true });
  const done = [];
  let big = 0;
  for (const [id, files] of Object.entries(map)) {
    const dest = path.join(OUT_DIR, id);
    mkdirSync(dest, { recursive: true });
    let ok = true;
    files.forEach((rel, i) => {
      const src = path.join(exDir, rel);
      const dst = path.join(dest, `${i}.jpg`);
      if (!existsSync(src)) { console.warn(`AVISO ${id}: ${rel} não existe no banco`); ok = false; return; }
      let size = 0;
      for (const q of QUALITIES) {
        encode(tool, src, dst, q);
        size = statSync(dst).size;
        if (size <= TARGET_BYTES) break;
      }
      if (size > TARGET_BYTES) { big++; console.warn(`AVISO ${id}/${i}.jpg: ${Math.round(size / 1024)} KB (acima de 80 KB)`); }
    });
    if (ok) done.push(id);
  }
  const body = done.map((id) => `  ${id}: [require('../../assets/exercicios-ref/${id}/0.jpg'), require('../../assets/exercicios-ref/${id}/1.jpg')],`).join('\n');
  writeFileSync(GENERATED, `// GERADO por scripts/preparar-fotos-exercicios.mjs. NÃO versionado (.gitignore). require() estático só do que existe em assets/exercicios-ref/.\nexport const STILL_IMAGES = {\n${body}\n};\n`, 'utf8');
  console.log(`${done.length} exercícios preparados em assets/exercicios-ref/ com ${tool} (${big} foto(s) acima de 80 KB). Arquivo gerado: src/data/exerciseStillsImages.generated.js.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
