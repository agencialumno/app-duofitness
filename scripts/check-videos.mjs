// Confere os vídeos e capas dos exercícios ANTES do build (falha em segundos, apontando o arquivo).
// Padrão dos arquivos: docs/videos-exercicios.md. Sem arquivos em assets/exercicios/, passa.
//
// ERRO (exit 1, "::error file=...::"):
//   - capa JPEG sem dimensões legíveis (arquivo corrompido: o Metro derrubaria o build);
//   - extensão que não é .mp4 (vídeo) nem .jpg (capa);
//   - nome que não é o id de um exercício de EXERCISE_DB;
//   - formato REAL (assinatura do arquivo) diferente da extensão (ex.: JPEG salvo como .png/.mp4);
//   - tamanho acima do máximo (vídeo 400 KB, capa 80 KB) ou arquivo vazio/truncado;
//   - src/data/exerciseVideos.js fora de sincronia com a pasta (rode `npm run gen:media`).
// AVISO (não falha): duração fora de 3 a 6 s, resolução diferente de 480x480, trilha de áudio, codec que
//   não é H.264, capa que não é quadrada, vídeo sem capa ou capa sem vídeo.
//
// Uso:  node scripts/check-videos.mjs [--root <pasta do app>]
// Só usa módulos do Node: sem dependências (roda antes do npm ci).
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  FORMAT_NAMES, MAP_FILE, MAX_POSTER_BYTES, MAX_VIDEO_BYTES, MEDIA_DIR, VIDEO_MAX_SECONDS, VIDEO_MIN_SECONDS,
  VIDEO_SIZE, collectEntries, detectFormat, inspectMp4, jpegSize, listMediaFiles, readExerciseCatalog, renderMap,
} from './lib/media.mjs';

const args = process.argv.slice(2);
const root = args.includes('--root') ? path.resolve(args[args.indexOf('--root') + 1]) : process.cwd();

let errors = 0;
let warnings = 0;
const esc = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const rel = (f) => `${MEDIA_DIR}/${f}`;
function error(file, msg) { errors++; console.log(`::error file=${file}::${esc(msg)}`); }
function warn(file, msg) { warnings++; console.log(`::warning file=${file}::${esc(msg)}`); }
const kb = (n) => `${n % 1024 === 0 ? n / 1024 : (n / 1024).toFixed(1)} KB (${n} bytes)`;

const catalog = readExerciseCatalog(root);
const files = listMediaFiles(root);
const seen = new Map(); // id -> { video, poster }

for (const f of files) {
  const file = rel(f);
  const ext = path.extname(f).toLowerCase();
  const id = path.basename(f, path.extname(f));
  const full = path.join(root, MEDIA_DIR, f);

  if (!['.mp4', '.jpg'].includes(ext)) {
    const hint = { '.jpeg': 'renomeie para .jpg', '.png': 'a capa deve ser JPEG (.jpg), não PNG', '.webp': 'a capa deve ser JPEG (.jpg)', '.mov': 'converta para MP4 H.264 (.mp4)', '.gif': 'converta para MP4 H.264 (.mp4)' }[ext];
    error(file, `Extensão "${ext || '(nenhuma)'}" não aceita: use .mp4 (vídeo) ou .jpg (capa)${hint ? `; ${hint}` : ''}.`);
    continue;
  }

  if (!catalog.has(id)) {
    const near = [...catalog.keys()].filter((k) => k.includes(id) || id.includes(k)).slice(0, 3);
    error(file, `O nome "${id}" não é o id de nenhum exercício de EXERCISE_DB${near.length ? ` (ids parecidos: ${near.join(', ')})` : ''}. O arquivo deve se chamar <id>${ext}.`);
    continue;
  }

  const buf = readFileSync(full);
  const size = statSync(full).size;
  const real = detectFormat(buf);
  const want = ext === '.mp4' ? 'mp4' : 'jpeg';

  if (size < 1024) { error(file, `Arquivo vazio ou truncado (${size} bytes).`); continue; }
  if (real !== want) {
    error(file, `O arquivo é ${FORMAT_NAMES[real]} de verdade, mas a extensão é "${ext}" (esperado ${FORMAT_NAMES[want]}). A extensão precisa bater com o formato real.`);
    continue;
  }

  const entry = seen.get(id) || { video: false, poster: false };
  if (ext === '.mp4') {
    entry.video = true;
    if (size > MAX_VIDEO_BYTES) error(file, `Vídeo com ${kb(size)}: máximo ${kb(MAX_VIDEO_BYTES)}. Reduza o CRF ou a duração.`);
    const info = inspectMp4(buf);
    if (info.seconds !== null && (info.seconds < VIDEO_MIN_SECONDS - 0.2 || info.seconds > VIDEO_MAX_SECONDS + 0.2)) warn(file, `Duração de ${info.seconds} s: o padrão é de ${VIDEO_MIN_SECONDS} a ${VIDEO_MAX_SECONDS} s.`);
    if (info.width && info.height && (info.width !== VIDEO_SIZE || info.height !== VIDEO_SIZE)) warn(file, `Resolução ${info.width}x${info.height}: o padrão é ${VIDEO_SIZE}x${VIDEO_SIZE} (1:1).`);
    if (info.hasAudio) warn(file, 'O vídeo tem trilha de áudio: o padrão é sem áudio (use -an no ffmpeg).');
    if (info.seconds !== null && !info.h264) warn(file, 'Codec não identificado como H.264 (avc1).');
  } else {
    entry.poster = true;
    if (size > MAX_POSTER_BYTES) error(file, `Capa com ${kb(size)}: máximo ${kb(MAX_POSTER_BYTES)}.`);
    const dim = jpegSize(buf);
    // O Metro lê as dimensões da imagem ao empacotar e derruba o build se não conseguir ("Invalid JPG").
    if (!dim) error(file, 'JPEG inválido ou corrompido: não foi possível ler as dimensões (o Metro recusaria este arquivo no build).');
    else if (dim.width !== dim.height) warn(file, `Capa ${dim.width}x${dim.height} não é quadrada (use ${VIDEO_SIZE}x${VIDEO_SIZE}).`);
  }
  seen.set(id, entry);
}

for (const [id, e] of seen) {
  if (e.video && !e.poster) warn(rel(`${id}.jpg`), `O vídeo ${id}.mp4 está sem capa (${id}.jpg).`);
  if (e.poster && !e.video) warn(rel(`${id}.mp4`), `A capa ${id}.jpg está sem vídeo (${id}.mp4).`);
}

// O mapa gerado precisa refletir exatamente a pasta (senão o Metro pode apontar para arquivo que não existe).
const mapPath = path.join(root, MAP_FILE);
if (!existsSync(mapPath)) {
  error(MAP_FILE, 'Mapa de mídia não encontrado. Rode `npm run gen:media`.');
} else if (errors === 0) {
  const expected = renderMap(collectEntries(root));
  const actual = readFileSync(mapPath, 'utf8').replace(/\r\n/g, '\n');
  if (actual !== expected) error(MAP_FILE, 'O mapa de mídia está fora de sincronia com assets/exercicios/. Rode `npm run gen:media` e commite o resultado.');
}

if (files.length === 0 && errors === 0) console.log('Nenhum vídeo ou capa em assets/exercicios/ ainda: ok (o app mostra "Vídeo em breve").');
else console.log(`${files.length} arquivo(s) de mídia conferidos: ${errors} erro(s), ${warnings} aviso(s).`);
process.exit(errors > 0 ? 1 : 0);
