// Estrutura dos vídeos dos exercícios: mapa gerado (src/data/exerciseVideos.js), gerador de mapa e lista
// de gravação (docs/videos-exercicios.md). O padrão dos arquivos está em docs/videos-exercicios.md.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import { EXERCISE_MEDIA, getExerciseMedia } from '../../src/data/exerciseVideos.js';
// @ts-expect-error módulo JS do app, sem tipos
import { EXERCISE_DB, generateWorkoutPlan } from '../../src/utils/workoutGenerator.js';
// @ts-expect-error módulo JS do app, sem tipos
import { COMBOS } from '../../src/data/combosEquipment.js';
// @ts-expect-error módulo JS do app, sem tipos
import { isExerciseVideosEnabled } from '../../src/data/exerciseVideosConfig.js';
// @ts-expect-error módulo JS sem tipos
import * as M from '../../scripts/lib/media.mjs';
// @ts-expect-error módulo JS sem tipos
import * as R from '../../scripts/lib/recording-list.mjs';

const REPO = path.resolve(__dirname, '../..');
const allIds: string[] = Object.values(EXERCISE_DB as Record<string, { id: string }[]>).flat().map((e) => e.id);

describe('mapa de mídia (gerado)', () => {
  it('hoje está vazio: nenhum vídeo gravado ainda', () => {
    expect(Object.keys(EXERCISE_MEDIA)).toEqual([]);
    expect(getExerciseMedia('squat')).toBeNull();
    expect(getExerciseMedia('nao_existe')).toBeNull();
    expect(getExerciseMedia(undefined)).toBeNull();
  });

  it('todo id do mapa existe em EXERCISE_DB (vale para quando houver arquivos)', () => {
    for (const id of Object.keys(EXERCISE_MEDIA)) expect(allIds, id).toContain(id);
  });

  it('cada entrada tem video, poster, duracaoSeg e alt, e só aponta para o que existe', () => {
    for (const [id, m] of Object.entries(EXERCISE_MEDIA as Record<string, Record<string, unknown>>)) {
      expect(Object.keys(m).sort(), id).toEqual(['alt', 'duracaoSeg', 'poster', 'video']);
      expect(String(m.alt)).toMatch(/^Vídeo de demonstração de /);
    }
  });

  it('o arquivo do mapa está em dia com a pasta assets/exercicios (gen:media não muda nada)', () => {
    const expected = M.renderMap(M.collectEntries(REPO));
    expect(readFileSync(path.join(REPO, 'src/data/exerciseVideos.js'), 'utf8').replace(/\r\n/g, '\n')).toBe(expected);
  });

  it('a pasta de mídia existe (com .gitkeep) para o repositório guardar o diretório vazio', () => {
    expect(existsSync(path.join(REPO, 'assets/exercicios'))).toBe(true);
  });
});

describe('catálogo lido do texto do gerador', () => {
  it('ids e nomes batem exatamente com o EXERCISE_DB real', () => {
    const catalog: Map<string, string> = M.readExerciseCatalog(REPO);
    expect([...catalog.keys()].sort()).toEqual([...allIds].sort());
    const real = new Map(Object.values(EXERCISE_DB as Record<string, { id: string; name: string }[]>).flat().map((e) => [e.id, e.name]));
    for (const [id, name] of catalog) expect(name, id).toBe(real.get(id));
    expect(allIds.length).toBe(59);
  });
});

describe('gerador do mapa (com fixtures)', () => {
  function fixture(files: Record<string, string | Buffer>) {
    const root = mkdtempSync(path.join(os.tmpdir(), 'duo-media-'));
    mkdirSync(path.join(root, 'src/utils'), { recursive: true });
    mkdirSync(path.join(root, 'assets/exercicios'), { recursive: true });
    writeFileSync(path.join(root, 'src/utils/workoutGenerator.js'), "export const EXERCISE_DB = { legs: [\n  { id: 'squat', name: 'Agachamento Livre', x: 1 },\n  { id: 'lunge', name: 'Avanço (Passada)', x: 1 },\n  { id: 'plank', name: 'Prancha d\\'água', x: 1 },\n] };\n");
    for (const [name, content] of Object.entries(files)) writeFileSync(path.join(root, 'assets/exercicios', name), content);
    return root;
  }

  it('sem arquivos o mapa é vazio e válido', () => {
    const root = fixture({});
    const out = M.renderMap(M.collectEntries(root));
    expect(out).toContain('export const EXERCISE_MEDIA = {\n};');
    expect(out).not.toContain('require(');
  });

  it('só gera require para arquivos que existem (vídeo e/ou capa), nunca para os ausentes', () => {
    const root = fixture({ 'squat.mp4': Buffer.alloc(20), 'squat.jpg': Buffer.alloc(20), 'lunge.jpg': Buffer.alloc(20) });
    const out = M.renderMap(M.collectEntries(root));
    expect(out).toContain("\"squat\": { video: require('../../assets/exercicios/squat.mp4'), poster: require('../../assets/exercicios/squat.jpg')");
    expect(out).toContain("\"lunge\": { video: null, poster: require('../../assets/exercicios/lunge.jpg')");
    expect(out).not.toContain('plank');
    expect(out).not.toContain('lunge.mp4');
    expect((out.match(/require\(/g) || []).length).toBe(3);
  });

  it('ignora arquivos com nome que não é id, extensão estranha e ocultos', () => {
    const root = fixture({ 'foguete.mp4': Buffer.alloc(8), 'squat.png': Buffer.alloc(8), '.DS_Store': Buffer.alloc(8), 'README.md': 'x' });
    expect(M.collectEntries(root)).toEqual([]);
  });

  it('alt vem do nome do exercício (com aspas escapadas)', () => {
    const root = fixture({ 'plank.jpg': Buffer.alloc(8) });
    expect(M.collectEntries(root)[0].alt).toBe("Vídeo de demonstração de Prancha d'água");
  });
});

describe('lista de gravação', () => {
  const rows = R.buildRecordingRows({ EXERCISE_DB, generateWorkoutPlan, COMBOS });

  it('cobre todos os ids de EXERCISE_DB, sem repetir, ordenada do mais usado ao menos usado', () => {
    expect(rows.map((r: { id: string }) => r.id).sort()).toEqual([...allIds].sort());
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1].total).toBeGreaterThanOrEqual(rows[i].total);
    for (const r of rows) expect(r.total).toBe(r.A + r.B + r.C);
  });

  it('traz equipamento e os combos em que aparece (UNO a ELITE)', () => {
    const plank = rows.find((r: { id: string }) => r.id === 'plank');
    expect(plank.combos).toEqual(['UNO', 'DUO', 'TRIPLE', 'PRIME', 'ELITE']);
    const hip = rows.find((r: { equipment: string }) => r.equipment === 'hip_machine');
    expect(hip.combos).toEqual(['ELITE']);
    const ids = new Set(rows.map((r: { equipment: string }) => r.equipment));
    expect(ids.has('bodyweight')).toBe(true);
  });

  it('o documento tem a lista e ela está em dia (rode npm run gen:media se este teste falhar)', () => {
    const doc = readFileSync(path.join(REPO, 'docs/videos-exercicios.md'), 'utf8').replace(/\r\n/g, '\n');
    const have = new Set(M.collectEntries(REPO).filter((e: { video: boolean; poster: boolean }) => e.video && e.poster).map((e: { id: string }) => e.id));
    const fresh = R.replaceList(doc, R.renderRecordingList(rows, have));
    expect(fresh).toBe(doc);
    for (const id of allIds) expect(doc, id).toContain(`\`${id}\``);
  });

  it('o documento descreve o padrão: MP4 H.264, 480x480, sem áudio, 3 a 6 s, 150 a 400 KB, capa até 80 KB', () => {
    const doc = readFileSync(path.join(REPO, 'docs/videos-exercicios.md'), 'utf8');
    for (const t of ['H.264', '480x480', 'sem áudio', '3 a 6 s', '150 a 400 KB', '80 KB', 'npm run gen:media', 'JPEG']) expect(doc).toContain(t);
  });
});

describe('flag EXPO_PUBLIC_EXERCISE_VIDEOS e acessibilidade', () => {
  it('ligada por padrão; só "false" (ou "0") desliga', () => {
    for (const v of [undefined, null, '', 'true', '1', 'sim', 'TRUE', ' true ']) expect(isExerciseVideosEnabled(v), String(v)).toBe(true);
    for (const v of ['false', 'FALSE', ' False ', '0']) expect(isExerciseVideosEnabled(v), v).toBe(false);
  });
  it('com a flag desligada a área inteira (título e conteúdo) sai da tela do exercício', () => {
    const src = readFileSync(path.join(REPO, 'src/screens/ExerciseDetailScreen.js'), 'utf8');
    expect(src).toMatch(/EXERCISE_VIDEOS_ENABLED && \(/);
    const block = src.slice(src.indexOf('EXERCISE_VIDEOS_ENABLED && ('));
    expect(block.slice(0, block.indexOf(')}'))).toContain('Como fazer');
    // o passo a passo e a dica continuam como estavam
    expect(src).toContain('Como executar');
    expect(src).toContain('Dica do personal');
  });
  it('texto lido pelo leitor de tela, selo e Reduzir movimento', () => {
    const src = readFileSync(path.join(REPO, 'src/components/ExerciseMedia.js'), 'utf8');
    expect(src).toContain('Vídeo de demonstração de ${name}');
    expect(src).toMatch(/em breve`/);
    expect(src).toContain('Vídeo em breve');
    expect(src).toMatch(/aspectRatio: 1/);
    expect(src).toMatch(/isReduceMotionEnabled/);
    expect(src).toMatch(/autoplay: !reduceMotion/);
    expect(src).toMatch(/accessibilityLabel=\{label\}/);
  });
  it('a flag aparece no .env.example como opcional', () => {
    const env = readFileSync(path.join(REPO, '.env.example'), 'utf8');
    expect(env).toMatch(/EXPO_PUBLIC_EXERCISE_VIDEOS/);
  });
});
