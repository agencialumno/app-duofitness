// Confere os PNGs (e JPEGs) usados pelo app ANTES do build nativo. O AAPT2 (empacotador de recursos do
// Android) recusa arquivos fora do padrão, e esse erro só aparecia no meio do Gradle.
//
// Quais arquivos: todo *.png em assets/, os .png citados no app.json e os .png importados ou
// requeridos em src/ e App.js. Um arquivo referenciado que não existe também é erro.
//
// ERRO (falha, exit 1):  assinatura PNG inválida (ex.: JPEG com extensão .png), chunk
//   truncado, CRC inválido, IEND ausente, entrelaçamento (Adam7), dados da imagem corrompidos
//   ou incompletos, arquivo referenciado que não existe.
// AVISO (não falha):     bits por canal diferente de 8.
//
// JPEG (.jpg/.jpeg): o conteúdo precisa ser JPEG de verdade (SOI FFD8FF, quadro SOF legível, EOI no fim);
// um PNG com extensão .jpg também é erro. Mesmo critério de "referenciado e ausente".
//
// Uso:  node scripts/check-pngs.mjs [--root <pasta do app>]
// Só usa módulos do Node: sem dependências.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// canais por tipo de cor: 0 cinza, 2 RGB, 3 paleta, 4 cinza+alfa, 6 RGBA
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const COLOR_NAMES = { 0: 'cinza', 2: 'RGB', 3: 'paleta', 4: 'cinza+alfa', 6: 'RGBA' };

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function sniffFormat(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'JPEG';
  if (buf.length >= 4 && buf.subarray(0, 4).toString('latin1') === 'GIF8') return 'GIF';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'WebP';
  if (buf.length >= 2 && buf.subarray(0, 2).toString('latin1') === 'BM') return 'BMP';
  return null;
}

/** @returns {{ errors: string[], warnings: string[], info: string }} */
export function inspectPng(buf) {
  const errors = [];
  const warnings = [];

  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    const fmt = sniffFormat(buf);
    errors.push(
      fmt
        ? `não é um PNG: o conteúdo é ${fmt} com extensão .png (regrave o arquivo como PNG de verdade)`
        : 'não é um PNG: assinatura inválida (arquivo vazio, corrompido ou de outro formato)',
    );
    return { errors, warnings, info: '' };
  }

  let offset = 8;
  let ihdr = null;
  let sawIend = false;
  let firstChunk = true;
  const idat = [];

  while (offset < buf.length) {
    if (offset + 12 > buf.length) {
      errors.push('arquivo truncado: chunk incompleto no fim do arquivo');
      break;
    }
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('latin1', offset + 4, offset + 8);
    const end = offset + 8 + length + 4;
    if (end > buf.length) {
      errors.push(`arquivo truncado: o chunk ${type} termina depois do fim do arquivo`);
      break;
    }
    const data = buf.subarray(offset + 8, offset + 8 + length);
    const expectedCrc = buf.readUInt32BE(offset + 8 + length);
    const actualCrc = crc32(buf.subarray(offset + 4, offset + 8 + length));
    if (actualCrc !== expectedCrc) errors.push(`CRC inválido no chunk ${type}`);

    if (firstChunk) {
      if (type !== 'IHDR' || length !== 13) {
        errors.push('o primeiro chunk não é um IHDR válido');
        break;
      }
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        depth: data[8],
        color: data[9],
        interlace: data[12],
      };
      firstChunk = false;
    }
    if (type === 'IDAT') idat.push(data);
    if (type === 'IEND') {
      sawIend = true;
      break;
    }
    offset = end;
  }

  if (!ihdr) {
    if (errors.length === 0) errors.push('IHDR ausente');
    return { errors, warnings, info: '' };
  }
  if (!sawIend && !errors.some((e) => e.startsWith('arquivo truncado'))) {
    errors.push('arquivo truncado: IEND ausente');
  }
  if (idat.length === 0) errors.push('sem dados de imagem (IDAT ausente)');

  const channels = CHANNELS[ihdr.color];
  if (!channels) errors.push(`tipo de cor inválido (${ihdr.color})`);
  if (ihdr.width === 0 || ihdr.height === 0) errors.push('dimensões inválidas (0)');

  if (ihdr.depth !== 8) {
    warnings.push(`${ihdr.depth} bits por canal (o esperado é 8); regrave com 8 bits por canal`);
  }
  if (ihdr.interlace !== 0) {
    errors.push('PNG entrelaçado (Adam7); regrave sem entrelaçamento');
  }

  // Dados da imagem: descomprime e confere o tamanho (pega arquivo cortado ou com dados ruins
  // que o CRC dos chunks não acusa). Em PNG entrelaçado o tamanho é outro, então pulamos.
  if (idat.length > 0 && channels && ihdr.interlace === 0 && ihdr.width > 0 && ihdr.height > 0) {
    try {
      const raw = inflateSync(Buffer.concat(idat));
      const rowBytes = Math.ceil((ihdr.width * channels * ihdr.depth) / 8);
      const expected = ihdr.height * (rowBytes + 1);
      if (raw.length !== expected) {
        errors.push(`dados da imagem ${raw.length < expected ? 'incompletos' : 'com bytes a mais'} (${raw.length} de ${expected} bytes)`);
      }
    } catch {
      errors.push('dados da imagem corrompidos (falha ao descomprimir)');
    }
  }

  const info = `${ihdr.width}x${ihdr.height}, ${ihdr.depth} bits, ${COLOR_NAMES[ihdr.color] ?? `tipo ${ihdr.color}`}, ${ihdr.interlace === 0 ? 'sem entrelaçamento' : 'entrelaçado'}`;
  return { errors, warnings, info };
}

/** @returns {{ errors: string[], warnings: string[], info: string }} */
export function inspectJpeg(buf) {
  const errors = [];
  const warnings = [];
  if (buf.length < 4 || !(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)) {
    if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
      errors.push('não é um JPEG: o conteúdo é PNG com extensão .jpg (regrave como JPEG de verdade)');
    } else {
      const fmt = sniffFormat(buf);
      errors.push(fmt ? `não é um JPEG: o conteúdo é ${fmt} com extensão .jpg` : 'não é um JPEG: assinatura inválida (arquivo vazio, corrompido ou de outro formato)');
    }
    return { errors, warnings, info: '' };
  }
  if (!(buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9)) errors.push('arquivo truncado: marcador de fim (EOI) ausente');
  // procura o quadro SOF (SOF0..SOF15, exceto DHT/JPG/DAC) para ler dimensões e o tipo (baseline/progressivo)
  let off = 2;
  let sof = null;
  while (off + 4 <= buf.length) {
    if (buf[off] !== 0xff) { off++; continue; }
    const m = buf[off + 1];
    if (m === 0xff) { off++; continue; }
    if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { off += 2; continue; }
    if (m === 0xd9 || m === 0xda) break;
    const len = buf.readUInt16BE(off + 2);
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      if (off + 9 <= buf.length) sof = { progressive: m === 0xc2, bits: buf[off + 4], height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7) };
      break;
    }
    off += 2 + len;
  }
  if (!sof) {
    errors.push('quadro de imagem (SOF) ausente ou ilegível');
    return { errors, warnings, info: '' };
  }
  if (sof.width === 0 || sof.height === 0) errors.push('dimensões inválidas (0)');
  if (sof.progressive) warnings.push('JPEG progressivo (o esperado é baseline); regrave sem a opção progressivo');
  return { errors, warnings, info: `${sof.width}x${sof.height}, JPEG ${sof.progressive ? 'progressivo' : 'baseline'}` };
}

// ---- descoberta dos arquivos ------------------------------------------------

function walk(dir, accept, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, accept, out);
    else if (accept(name)) out.push(full);
  }
  return out;
}

function collectStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectStrings(v, out));
  return out;
}

const isPng = (name) => /\.(png|jpe?g)$/i.test(name);

/** Mapa caminho absoluto -> de onde veio (para a mensagem de arquivo ausente). */
function discover(root) {
  const found = new Map(); // abs -> origem
  const add = (abs, origin) => {
    if (!found.has(abs)) found.set(abs, origin);
  };

  for (const f of walk(path.join(root, 'assets'), isPng)) add(f, 'assets/');

  const appJsonPath = path.join(root, 'app.json');
  if (existsSync(appJsonPath)) {
    try {
      const json = JSON.parse(readFileSync(appJsonPath, 'utf8'));
      for (const s of collectStrings(json)) {
        if (isPng(s)) add(path.resolve(root, s), 'app.json');
      }
    } catch {
      // app.json inválido é problema de outra checagem (expo-doctor)
    }
  }

  const sources = [...walk(path.join(root, 'src'), (n) => /\.(jsx?|tsx?)$/.test(n))];
  if (existsSync(path.join(root, 'App.js'))) sources.push(path.join(root, 'App.js'));
  const importRe = /(?:require\(\s*|\bfrom\s+|\bimport\s+)['"]([^'"]+\.(?:png|jpe?g))['"]/gi;
  for (const file of sources) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(importRe)) {
      const rel = path.relative(root, file).split(path.sep).join('/');
      add(path.resolve(path.dirname(file), m[1]), rel);
    }
  }
  return found;
}

// ---- saída ------------------------------------------------------------------

const onGithub = process.env.GITHUB_ACTIONS === 'true';

function report(level, file, message) {
  if (onGithub) console.log(`::${level} file=${file}::${message}`);
  else console.log(`${level === 'error' ? 'ERRO ' : 'AVISO'}  ${file}: ${message}`);
}

function main() {
  const rootArg = process.argv.indexOf('--root');
  const root = path.resolve(rootArg > -1 ? process.argv[rootArg + 1] : process.cwd());
  const files = discover(root);

  if (files.size === 0) {
    console.log('Nenhum PNG encontrado (assets/, app.json, src/).');
    return 0;
  }

  let failed = 0;
  let warned = 0;
  const rel = (abs) => path.relative(root, abs).split(path.sep).join('/');

  for (const [abs, origin] of [...files].sort((a, b) => a[0].localeCompare(b[0]))) {
    const name = rel(abs);
    if (!existsSync(abs)) {
      report('error', name, `arquivo referenciado em ${origin} não existe`);
      failed++;
      continue;
    }
    const buf = readFileSync(abs);
    const { errors, warnings, info } = /\.jpe?g$/i.test(abs) ? inspectJpeg(buf) : inspectPng(buf);
    for (const e of errors) report('error', name, e);
    for (const w of warnings) report('warning', name, w);
    if (errors.length > 0) failed++;
    else {
      warned += warnings.length > 0 ? 1 : 0;
      console.log(`ok     ${name} (${info})`);
    }
  }

  console.log(`\n${files.size} PNG(s) conferidos: ${failed} com erro, ${warned} com aviso.`);
  return failed > 0 ? 1 : 0;
}

// Só roda como script (o import por outro arquivo não dispara a checagem).
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exit(main());
}
