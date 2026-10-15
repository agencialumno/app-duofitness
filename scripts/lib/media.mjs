// Utilitários de mídia dos exercícios (vídeo e capa). Só módulos do Node: sem dependências.
// Usado por scripts/gen-exercise-media.mjs e scripts/check-videos.mjs.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export const MEDIA_DIR = 'assets/exercicios';
export const MAP_FILE = 'src/data/exerciseVideos.js';

// Limites do padrão (ver docs/videos-exercicios.md)
export const MAX_VIDEO_BYTES = 400 * 1024;
export const MAX_POSTER_BYTES = 80 * 1024;
export const VIDEO_SIZE = 480;
export const VIDEO_MIN_SECONDS = 3;
export const VIDEO_MAX_SECONDS = 6;

// ---------- Ids do catálogo ----------

// Lê id e nome de cada exercício direto do texto de src/utils/workoutGenerator.js (sem importar o módulo,
// para rodar em segundos no CI antes do npm ci). Um teste confere que bate com o EXERCISE_DB real.
export function readExerciseCatalog(root = '.') {
  const src = readFileSync(path.join(root, 'src/utils/workoutGenerator.js'), 'utf8');
  const re = /\{\s*id:\s*'([a-z0-9_]+)',\s*name:\s*'((?:[^'\\]|\\.)*)'/g;
  const out = new Map();
  let m;
  while ((m = re.exec(src))) out.set(m[1], m[2].replace(/\\(.)/g, '$1'));
  return out; // Map id -> nome
}

// ---------- Formato real do arquivo (assinatura) ----------

export function detectFormat(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 12 && buf.subarray(4, 8).toString('latin1') === 'ftyp') return 'mp4';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (buf.length >= 6 && buf.subarray(0, 3).toString('latin1') === 'GIF') return 'gif';
  return 'desconhecido';
}

export const FORMAT_NAMES = { jpeg: 'JPEG', png: 'PNG', mp4: 'MP4', webp: 'WebP', gif: 'GIF', desconhecido: 'formato desconhecido' };

// ---------- MP4: duração, resolução, codec e áudio ----------

function* boxes(buf, start = 0, end = buf.length) {
  let off = start;
  while (off + 8 <= end) {
    let size = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString('latin1');
    let header = 8;
    if (size === 1) { if (off + 16 > end) return; size = Number(buf.readBigUInt64BE(off + 8)); header = 16; }
    else if (size === 0) size = end - off;
    if (size < header || off + size > end) return;
    yield { type, start: off + header, end: off + size };
    off += size;
  }
}

function find(buf, parent, ...path_) {
  let range = parent;
  for (const t of path_) {
    let found = null;
    for (const b of boxes(buf, range.start, range.end)) if (b.type === t) { found = b; break; }
    if (!found) return null;
    range = found;
  }
  return range;
}

// { seconds, width, height, hasAudio, h264 } (campos podem faltar se o arquivo for atípico)
export function inspectMp4(buf) {
  const info = { seconds: null, width: null, height: null, hasAudio: false, h264: false };
  const top = { start: 0, end: buf.length };
  const moov = find(buf, top, 'moov');
  if (!moov) return info;
  const mvhd = find(buf, moov, 'mvhd');
  if (mvhd) {
    const v = buf[mvhd.start];
    const timescale = v === 1 ? buf.readUInt32BE(mvhd.start + 20) : buf.readUInt32BE(mvhd.start + 12);
    const duration = v === 1 ? Number(buf.readBigUInt64BE(mvhd.start + 24)) : buf.readUInt32BE(mvhd.start + 16);
    if (timescale > 0) info.seconds = Math.round((duration / timescale) * 100) / 100;
  }
  for (const trak of boxes(buf, moov.start, moov.end)) {
    if (trak.type !== 'trak') continue;
    const hdlr = find(buf, trak, 'mdia', 'hdlr');
    const handler = hdlr ? buf.subarray(hdlr.start + 8, hdlr.start + 12).toString('latin1') : '';
    if (handler === 'soun') info.hasAudio = true;
    if (handler === 'vide') {
      const tkhd = find(buf, trak, 'tkhd');
      if (tkhd) {
        const v = buf[tkhd.start];
        const wOff = tkhd.start + (v === 1 ? 88 : 76);
        if (wOff + 8 <= tkhd.end) {
          info.width = Math.round(buf.readUInt32BE(wOff) / 65536);
          info.height = Math.round(buf.readUInt32BE(wOff + 4) / 65536);
        }
      }
      const stsd = find(buf, trak, 'mdia', 'minf', 'stbl', 'stsd');
      if (stsd && buf.subarray(stsd.start, stsd.end).includes(Buffer.from('avc1'))) info.h264 = true;
    }
  }
  return info;
}

// ---------- JPEG: dimensões ----------

export function jpegSize(buf) {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    if ((marker >= 0xc0 && marker <= 0xcf) && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

// ---------- Arquivos da pasta ----------

// Lista os arquivos de mídia (ignora ocultos, README e .gitkeep).
export function listMediaFiles(root = '.') {
  const dir = path.join(root, MEDIA_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => !f.startsWith('.') && !/^readme(\.md)?$/i.test(f) && statSync(path.join(dir, f)).isFile())
    .sort();
}

// ---------- Mapa gerado (src/data/exerciseVideos.js) ----------

export const MAP_HEADER = `// GERADO por scripts/gen-exercise-media.mjs (npm run gen:media). Não edite à mão.
// Mapa do id do exercício (EXERCISE_DB) para a mídia de demonstração. Cada require é estático (exigência do
// Metro) e só existe para arquivos que estão em assets/exercicios/; sem arquivos, o mapa fica vazio e o app
// mostra o placeholder "Vídeo em breve". Padrão dos arquivos em docs/videos-exercicios.md.
`;

const q = (s) => JSON.stringify(s);

// entries: [{ id, video: bool, poster: bool, duracaoSeg: number|null, alt: string }]
export function renderMap(entries) {
  const body = entries.length === 0
    ? ''
    : entries.map((e) => {
      const parts = [
        `video: ${e.video ? `require('../../assets/exercicios/${e.id}.mp4')` : 'null'}`,
        `poster: ${e.poster ? `require('../../assets/exercicios/${e.id}.jpg')` : 'null'}`,
        `duracaoSeg: ${e.duracaoSeg ?? 'null'}`,
        `alt: ${q(e.alt)}`,
      ];
      return `  ${q(e.id)}: { ${parts.join(', ')} },\n`;
    }).join('');
  return `${MAP_HEADER}
export const EXERCISE_MEDIA = {
${body}};

// Mídia de um exercício ({ video, poster, duracaoSeg, alt }) ou null quando ainda não há arquivo.
export function getExerciseMedia(id) {
  return EXERCISE_MEDIA[id] || null;
}
`;
}

// Lê assets/exercicios/ e devolve as entradas do mapa (só vídeo e/ou capa válidos pelo nome).
export function collectEntries(root = '.') {
  const catalog = readExerciseCatalog(root);
  const files = listMediaFiles(root);
  const byId = new Map();
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    const id = path.basename(f, path.extname(f));
    if (!catalog.has(id) || !['.mp4', '.jpg'].includes(ext)) continue;
    const e = byId.get(id) || { id, video: false, poster: false, duracaoSeg: null, alt: `Vídeo de demonstração de ${catalog.get(id)}` };
    if (ext === '.mp4') {
      e.video = true;
      const info = inspectMp4(readFileSync(path.join(root, MEDIA_DIR, f)));
      e.duracaoSeg = info.seconds === null ? null : Math.round(info.seconds);
    } else e.poster = true;
    byId.set(id, e);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}
