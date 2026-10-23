// scripts/check-videos.mjs: roda como processo externo contra pastas de fixture (MP4 e JPEG sintéticos).
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS sem tipos
import * as M from '../../scripts/lib/media.mjs';

const REPO = path.resolve(__dirname, '../..');
const SCRIPT = path.join(REPO, 'scripts/check-videos.mjs');
const KB = 1024;

// ---------- Fixtures ----------

function box(type: string, ...parts: Buffer[]): Buffer {
  const body = Buffer.concat(parts);
  const head = Buffer.alloc(8);
  head.writeUInt32BE(8 + body.length, 0);
  head.write(type, 4, 'latin1');
  return Buffer.concat([head, body]);
}
const u32 = (n: number) => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return b; };

// MP4 mínimo, mas com a estrutura que o script lê (ftyp, moov/mvhd, trak/tkhd/mdia/hdlr/minf/stbl/stsd).
function mp4(opts: { seconds?: number; width?: number; height?: number; audio?: boolean; avc?: boolean; size?: number } = {}): Buffer {
  const { seconds = 4, width = 480, height = 480, audio = false, avc = true, size = 180 * KB } = opts;
  const mvhd = box('mvhd', Buffer.concat([u32(0), u32(0), u32(0), u32(1000), u32(Math.round(seconds * 1000)), Buffer.alloc(80)]));
  const tkhd = box('tkhd', Buffer.concat([u32(0), u32(0), u32(0), u32(1), u32(0), u32(0), Buffer.alloc(8 + 8 + 36 - 8 - 8 + 8 - 8), Buffer.alloc(0)]));
  // tkhd v0: version/flags(4) creation(4) mod(4) id(4) reserved(4) duration(4) reserved(8) layer(2) alt(2) vol(2) res(2) matrix(36) w(4) h(4)
  const tk = Buffer.alloc(4 + 4 + 4 + 4 + 4 + 4 + 8 + 2 + 2 + 2 + 2 + 36 + 4 + 4);
  tk.writeUInt32BE(width * 65536, tk.length - 8);
  tk.writeUInt32BE(height * 65536, tk.length - 4);
  void tkhd;
  const hdlr = (h: string) => box('hdlr', Buffer.concat([u32(0), u32(0), Buffer.from(h, 'latin1'), Buffer.alloc(12)]));
  const stsd = box('stsd', Buffer.concat([u32(0), u32(1), box(avc ? 'avc1' : 'hvc1', Buffer.alloc(78))]));
  const videoTrak = box('trak', box('tkhd', tk), box('mdia', hdlr('vide'), box('minf', box('stbl', stsd))));
  const audioTrak = box('trak', box('tkhd', Buffer.alloc(84)), box('mdia', hdlr('soun'), box('minf', box('stbl', box('stsd', Buffer.concat([u32(0), u32(1), box('mp4a', Buffer.alloc(28))]))))));
  const moov = box('moov', mvhd, videoTrak, ...(audio ? [audioTrak] : []));
  const ftyp = box('ftyp', Buffer.from('isom\u0000\u0000\u0002\u0000isomiso2avc1mp41', 'latin1'));
  const used = ftyp.length + moov.length + 8;
  const mdat = box('mdat', Buffer.alloc(Math.max(size - used, 0), 7));
  return Buffer.concat([ftyp, moov, mdat]);
}

// JPEG mínimo com SOI, um comentário para dar tamanho, SOF0 com as dimensões e EOI.
function jpeg(opts: { width?: number; height?: number; size?: number } = {}): Buffer {
  const { width = 480, height = 480, size = 30 * KB } = opts;
  const sof = Buffer.alloc(19);
  sof.writeUInt16BE(0xffc0, 0); sof.writeUInt16BE(17, 2); sof[4] = 8; sof.writeUInt16BE(height, 5); sof.writeUInt16BE(width, 7); sof[9] = 3;
  // comentários (COM) encadeados para chegar ao tamanho pedido (cada um leva até 65 KB)
  const coms: Buffer[] = [];
  let left = Math.max(size - 2 - sof.length - 2, 0);
  while (left > 0) {
    const n = Math.min(left, 60000);
    const c = Buffer.alloc(n, 0x20);
    if (n >= 4) { c.writeUInt16BE(0xfffe, 0); c.writeUInt16BE(n - 2, 2); }
    coms.push(c);
    left -= n;
  }
  return Buffer.concat([Buffer.from([0xff, 0xd8]), ...coms, sof, Buffer.from([0xff, 0xd9])]);
}

const GENERATOR = "export const EXERCISE_DB = { legs: [\n  { id: 'squat', name: 'Agachamento Livre', x: 1 },\n  { id: 'lunge', name: 'Avanço', x: 1 },\n  { id: 'squat_jump', name: 'Agachamento com Salto', x: 1 },\n] };\n";

function fixture(files: Record<string, Buffer | string> = {}, { syncMap = true }: { syncMap?: boolean } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'duo-videos-'));
  mkdirSync(path.join(root, 'src/utils'), { recursive: true });
  mkdirSync(path.join(root, 'src/data'), { recursive: true });
  mkdirSync(path.join(root, 'assets/exercicios'), { recursive: true });
  writeFileSync(path.join(root, 'src/utils/workoutGenerator.js'), GENERATOR);
  for (const [n, c] of Object.entries(files)) writeFileSync(path.join(root, 'assets/exercicios', n), c);
  writeFileSync(path.join(root, 'src/data/exerciseVideos.js'), syncMap ? M.renderMap(M.collectEntries(root)) : M.renderMap([]));
  return root;
}

function run(root: string) {
  const r = spawnSync(process.execPath, [SCRIPT, '--root', root], { encoding: 'utf8' });
  const out = `${r.stdout}${r.stderr}`;
  return { code: r.status, out, errors: out.split('\n').filter((l) => l.startsWith('::error')), warnings: out.split('\n').filter((l) => l.startsWith('::warning')) };
}

// ---------- Casos ----------

describe('check-videos.mjs', () => {
  it('pasta sem arquivos: passa', () => {
    const r = run(fixture());
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/Nenhum vídeo/);
  });

  it('o repositório de verdade passa hoje (sem arquivos e com o mapa em dia)', () => {
    const r = spawnSync(process.execPath, [SCRIPT], { cwd: REPO, encoding: 'utf8' });
    expect(r.status, r.stdout + r.stderr).toBe(0);
  });

  it('vídeo e capa corretos: passa, sem erros nem avisos', () => {
    const r = run(fixture({ 'squat.mp4': mp4(), 'squat.jpg': jpeg() }));
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/2 arquivo\(s\) de mídia conferidos: 0 erro\(s\), 0 aviso\(s\)/);
  });

  it('a duração é lida do MP4 e vai para o mapa (arredondada)', () => {
    const root = fixture({ 'squat.mp4': mp4({ seconds: 4.4 }), 'squat.jpg': jpeg() });
    expect(M.collectEntries(root)[0].duracaoSeg).toBe(4);
    expect(readFileSync(path.join(root, 'src/data/exerciseVideos.js'), 'utf8')).toContain('duracaoSeg: 4');
  });

  describe('extensão e formato real', () => {
    it('JPEG salvo como .png: erro apontando o arquivo', () => {
      const r = run(fixture({ 'squat.png': jpeg() }));
      expect(r.code).toBe(1);
      expect(r.errors[0]).toMatch(/^::error file=assets\/exercicios\/squat\.png::/);
      expect(r.errors[0]).toMatch(/Extensão "\.png" não aceita/);
    });
    it.each(['.jpeg', '.mov', '.webp', '.gif', '.txt'])('extensão %s é recusada', (ext) => {
      const r = run(fixture({ [`squat${ext}`]: jpeg() }));
      expect(r.code).toBe(1);
      expect(r.errors[0]).toContain(`squat${ext}`);
    });
    it('JPEG com extensão .mp4: erro dizendo o formato real', () => {
      const r = run(fixture({ 'squat.mp4': jpeg() }, { syncMap: false }));
      expect(r.code).toBe(1);
      expect(r.errors[0]).toMatch(/assets\/exercicios\/squat\.mp4::.*JPEG de verdade.*"\.mp4".*MP4/);
    });
    it('MP4 com extensão .jpg: erro dizendo o formato real', () => {
      const r = run(fixture({ 'squat.jpg': mp4() }, { syncMap: false }));
      expect(r.code).toBe(1);
      expect(r.errors[0]).toMatch(/squat\.jpg::.*MP4 de verdade.*"\.jpg".*JPEG/);
    });
    it('PNG com extensão .jpg: erro', () => {
      const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(2000)]);
      const r = run(fixture({ 'squat.jpg': png }, { syncMap: false }));
      expect(r.errors[0]).toMatch(/PNG de verdade/);
    });
    it('JPEG corrompido (sem dimensões legíveis, o Metro recusaria): erro', () => {
      const broken = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(3000)]);
      const r = run(fixture({ 'squat.jpg': broken }, { syncMap: false }));
      expect(r.code).toBe(1);
      expect(r.errors[0]).toMatch(/squat\.jpg::JPEG inválido ou corrompido/);
    });
    it('arquivo vazio ou truncado: erro', () => {
      const r = run(fixture({ 'squat.jpg': Buffer.from([0xff, 0xd8, 0xff]) }, { syncMap: false }));
      expect(r.code).toBe(1);
      expect(r.errors[0]).toMatch(/vazio ou truncado/);
    });
  });

  describe('nome igual a um id existente', () => {
    it('nome que não é id: erro com o arquivo e sugestão de ids parecidos', () => {
      const r = run(fixture({ 'squa.mp4': mp4() }, { syncMap: false }));
      expect(r.code).toBe(1);
      expect(r.errors[0]).toMatch(/^::error file=assets\/exercicios\/squa\.mp4::O nome "squa" não é o id/);
      expect(r.errors[0]).toMatch(/ids parecidos: squat/);
    });
    it('maiúsculas e prefixos não valem (o id é exato)', () => {
      expect(run(fixture({ 'Squat.mp4': mp4() }, { syncMap: false })).code).toBe(1);
      expect(run(fixture({ 'video_squat.jpg': jpeg() }, { syncMap: false })).code).toBe(1);
    });
    it('ids com sublinhado e parecidos funcionam', () => {
      expect(run(fixture({ 'squat_jump.mp4': mp4(), 'squat_jump.jpg': jpeg() })).code).toBe(0);
    });
  });

  describe('tamanho máximo', () => {
    it('vídeo no limite (400 KB) passa; acima falha', () => {
      expect(run(fixture({ 'squat.mp4': mp4({ size: 400 * KB }), 'squat.jpg': jpeg() })).code).toBe(0);
      const r = run(fixture({ 'squat.mp4': mp4({ size: 401 * KB }), 'squat.jpg': jpeg() }));
      expect(r.code).toBe(1);
      expect(r.errors[0]).toMatch(/squat\.mp4::Vídeo com 401 KB \(410624 bytes\): máximo 400 KB/);
    });
    it('capa no limite (80 KB) passa; acima falha', () => {
      expect(run(fixture({ 'squat.mp4': mp4(), 'squat.jpg': jpeg({ size: 80 * KB }) })).code).toBe(0);
      const r = run(fixture({ 'squat.mp4': mp4(), 'squat.jpg': jpeg({ size: 81 * KB }) }));
      expect(r.code).toBe(1);
      expect(r.errors[0]).toMatch(/squat\.jpg::Capa com 81 KB \(82944 bytes\): máximo 80 KB/);
    });
  });

  describe('avisos (não falham)', () => {
    it('áudio, duração, resolução, codec e capa não quadrada', () => {
      const r = run(fixture({
        'squat.mp4': mp4({ seconds: 12, width: 720, height: 720, audio: true, avc: false }),
        'squat.jpg': jpeg({ width: 640, height: 480 }),
      }));
      expect(r.code).toBe(0);
      const w = r.warnings.join('\n');
      expect(w).toMatch(/Duração de 12 s/);
      expect(w).toMatch(/Resolução 720x720/);
      expect(w).toMatch(/trilha de áudio/);
      expect(w).toMatch(/H\.264/);
      expect(w).toMatch(/não é quadrada/);
    });
    it('vídeo sem capa e capa sem vídeo', () => {
      const a = run(fixture({ 'squat.mp4': mp4() }));
      expect(a.code).toBe(0);
      expect(a.warnings.join()).toMatch(/sem capa \(squat\.jpg\)/);
      const b = run(fixture({ 'lunge.jpg': jpeg() }));
      expect(b.warnings.join()).toMatch(/sem vídeo \(lunge\.mp4\)/);
    });
  });

  describe('mapa gerado em dia', () => {
    it('arquivo na pasta e mapa vazio: erro pedindo npm run gen:media', () => {
      const r = run(fixture({ 'squat.mp4': mp4(), 'squat.jpg': jpeg() }, { syncMap: false }));
      expect(r.code).toBe(1);
      expect(r.errors[0]).toMatch(/^::error file=src\/data\/exerciseVideos\.js::.*fora de sincronia.*npm run gen:media/);
    });
    it('mapa aponta para arquivo que não existe mais: erro', () => {
      const root = fixture({ 'squat.mp4': mp4(), 'squat.jpg': jpeg() });
      writeFileSync(path.join(root, 'assets/exercicios/squat.mp4'), '');
      require('node:fs').rmSync(path.join(root, 'assets/exercicios/squat.mp4'));
      const r = run(root);
      expect(r.code).toBe(1);
      expect(r.errors.join()).toMatch(/fora de sincronia/);
    });
    it('mapa com final de linha CRLF (Windows) continua valendo', () => {
      const root = fixture({ 'squat.mp4': mp4(), 'squat.jpg': jpeg() });
      const f = path.join(root, 'src/data/exerciseVideos.js');
      writeFileSync(f, readFileSync(f, 'utf8').replace(/\n/g, '\r\n'));
      expect(run(root).code).toBe(0);
    });
    it('sem o arquivo do mapa: erro', () => {
      const root = fixture();
      require('node:fs').rmSync(path.join(root, 'src/data/exerciseVideos.js'));
      expect(run(root).errors[0]).toMatch(/Mapa de mídia não encontrado/);
    });
  });

  it('vários erros aparecem todos (um por arquivo), não só o primeiro', () => {
    const r = run(fixture({ 'foguete.mp4': mp4(), 'squat.png': jpeg(), 'lunge.jpg': mp4() }, { syncMap: false }));
    expect(r.code).toBe(1);
    expect(r.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('ignora README, .gitkeep e arquivos ocultos na pasta', () => {
    const r = run(fixture({ 'README.md': 'x', '.gitkeep': '', '.DS_Store': 'x' }));
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/Nenhum vídeo/);
  });
});

describe('integração com o CI', () => {
  const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
  it('ci.yml (job app) roda antes do npm ci; android.yml e ios.yml rodam logo depois da checagem de PNGs', () => {
    const ci = read('.github/workflows/ci.yml');
    expect(ci.indexOf('scripts/check-videos.mjs')).toBeGreaterThan(ci.indexOf('scripts/check-pngs.mjs'));
    expect(ci.indexOf('scripts/check-videos.mjs')).toBeLessThan(ci.indexOf('run: npm ci'));
    for (const f of ['android.yml', 'ios.yml']) {
      const y = read(`.github/workflows/${f}`);
      const v = y.indexOf('scripts/check-videos.mjs');
      expect(v, f).toBeGreaterThan(y.indexOf('scripts/check-pngs.mjs'));
      expect(v, f).toBeLessThan(y.indexOf('run: npm ci'));
    }
  });
  it('package.json tem gen:media e check:videos e só o expo-video como biblioteca de vídeo', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.scripts['gen:media']).toBe('node scripts/gen-exercise-media.mjs');
    expect(pkg.scripts['check:videos']).toBe('node scripts/check-videos.mjs');
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(deps.filter((d) => /video|expo-av|player/i.test(d))).toEqual(['expo-video']);
  });
});
