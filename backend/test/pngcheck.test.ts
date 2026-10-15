// scripts/check-pngs.mjs (na raiz do app) rodado como processo externo, com fixtures geradas
// em diretório temporário. Nada do backend é importado pelo script.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const SCRIPT = path.resolve(__dirname, '../../scripts/check-pngs.mjs');
const REPO_ROOT = path.resolve(__dirname, '../..');

// ---- gerador de PNG de teste ------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

interface PngOpts {
  width?: number;
  height?: number;
  depth?: number;
  color?: number;
  interlace?: number;
  rows?: number; // linhas realmente gravadas (para simular dados incompletos)
}
function makePng(o: PngOpts = {}): Buffer {
  const { width = 4, height = 3, depth = 8, color = 6, interlace = 0 } = o;
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[color] ?? 4;
  const rowBytes = Math.ceil((width * channels * depth) / 8);
  const rows = o.rows ?? height;
  const raw = Buffer.alloc(rows * (rowBytes + 1), 7);
  for (let r = 0; r < rows; r++) raw[r * (rowBytes + 1)] = 0; // filtro 0
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = depth;
  ihdr[9] = color;
  ihdr[12] = interlace;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- projeto fake -----------------------------------------------------------
let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'check-pngs-'));
  mkdirSync(path.join(dir, 'assets'));
  mkdirSync(path.join(dir, 'src'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const put = (rel: string, data: Buffer | string) => {
  const full = path.join(dir, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, data);
};

function run(root = dir, env: Record<string, string> = {}) {
  const r = spawnSync(process.execPath, [SCRIPT, '--root', root], {
    encoding: 'utf8',
    env: { ...process.env, GITHUB_ACTIONS: 'true', ...env },
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

describe('check-pngs.mjs', () => {
  it('PNGs de 8 bits, sem entrelaçamento e com CRC certo passam', () => {
    put('assets/icon.png', makePng());
    put('assets/outro.png', makePng({ color: 2 }));
    const r = run();
    expect(r.code).toBe(0);
    expect(r.out).toContain('ok     assets/icon.png (4x3, 8 bits, RGBA, sem entrelaçamento)');
    expect(r.out).toContain('2 PNG(s) conferidos: 0 com erro, 0 com aviso.');
  });

  it('JPEG com extensão .png: erro com o caminho e o formato (o caso do logo.png)', () => {
    put('assets/logo.png', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1]));
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error file=assets/logo.png::não é um PNG: o conteúdo é JPEG');
  });

  it('CRC inválido: erro com o caminho e o chunk', () => {
    const png = makePng();
    // altera um byte dentro do IDAT, sem recalcular o CRC
    const idat = png.indexOf(Buffer.from('IDAT', 'latin1'));
    png[idat + 6] = (png[idat + 6]! ^ 0xff) & 0xff;
    put('assets/ruim.png', png);
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error file=assets/ruim.png::CRC inválido no chunk IDAT');
  });

  it('entrelaçado (Adam7): erro', () => {
    put('assets/inter.png', makePng({ interlace: 1 }));
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error file=assets/inter.png::PNG entrelaçado');
  });

  it('16 bits por canal: só AVISO, não falha', () => {
    put('assets/fundo.png', makePng({ depth: 16 }));
    const r = run();
    expect(r.code).toBe(0);
    expect(r.out).toContain('::warning file=assets/fundo.png::16 bits por canal');
    expect(r.out).not.toContain('::error');
  });

  it('arquivo truncado: erro', () => {
    const png = makePng();
    put('assets/cortado.png', png.subarray(0, png.length - 20));
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/::error file=assets\/cortado\.png::arquivo truncado/);
  });

  it('dados da imagem incompletos (CRC certo, faltam linhas): erro', () => {
    put('assets/curto.png', makePng({ height: 10, rows: 4 }));
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error file=assets/curto.png::dados da imagem incompletos');
  });

  it('arquivo vazio e arquivo de texto: erro', () => {
    put('assets/vazio.png', Buffer.alloc(0));
    put('assets/texto.png', 'isto não é uma imagem');
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('file=assets/vazio.png');
    expect(r.out).toContain('file=assets/texto.png');
  });

  it('lista TODOS os arquivos com problema, não só o primeiro', () => {
    put('assets/a.png', makePng({ interlace: 1 }));
    put('assets/b.png', Buffer.from('xx'));
    put('assets/c.png', makePng());
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('file=assets/a.png');
    expect(r.out).toContain('file=assets/b.png');
    expect(r.out).toContain('ok     assets/c.png');
    expect(r.out).toContain('3 PNG(s) conferidos: 2 com erro');
  });

  it('referenciado no app.json e inexistente: erro; existente e válido: passa', () => {
    put('app.json', JSON.stringify({ expo: { icon: './assets/icon.png', splash: { image: './assets/falta.png' }, android: { adaptiveIcon: { foregroundImage: './fora/fg.png' } } } }));
    put('assets/icon.png', makePng());
    put('fora/fg.png', makePng());
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error file=assets/falta.png::arquivo referenciado em app.json não existe');
    expect(r.out).toContain('ok     fora/fg.png');
  });

  it('require/import de .png em src/ e App.js: confere o arquivo e a existência', () => {
    put('App.js', "import logo from './assets/app-logo.png';\n");
    put('src/tela.js', "const a = require('../assets/logo.png');\nconst b = require('../assets/sumiu.png');\n");
    put('assets/app-logo.png', makePng());
    put('assets/logo.png', Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    const r = run();
    expect(r.code).toBe(1);
    expect(r.out).toContain('::error file=assets/logo.png::não é um PNG');
    expect(r.out).toContain('::error file=assets/sumiu.png::arquivo referenciado em src/tela.js não existe');
    expect(r.out).toContain('ok     assets/app-logo.png');
  });

  it('fora do GitHub a saída é legível (ERRO / AVISO) e o código de saída continua valendo', () => {
    put('assets/x.png', Buffer.from('xx'));
    put('assets/y.png', makePng({ depth: 16 }));
    const r = run(dir, { GITHUB_ACTIONS: '' });
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/ERRO\s+assets\/x\.png:/);
    expect(r.out).toMatch(/AVISO\s+assets\/y\.png:/);
  });

  it('os PNGs reais do repositório passam', () => {
    const r = run(REPO_ROOT);
    expect(r.out).not.toContain('::error');
    expect(r.code).toBe(0);
    for (const f of ['icon', 'adaptive-icon', 'splash', 'logo']) expect(r.out).toContain(`assets/${f}.png`);
  });
});
