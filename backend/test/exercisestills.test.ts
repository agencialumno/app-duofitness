// Fotos de referência dos exercícios (posição inicial e final): mapa só com confiança alta, componente (com fotos, sem fotos, reduzir movimento, tela fora
// de foco, segundo plano), prioridade da mídia (vídeo > fotos > visual atual) e a garantia de que as fotos nunca entram no git.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import * as MAP from '../../src/data/exerciseStills.js';
// @ts-expect-error módulo JS do app, sem tipos
import { getExerciseStills } from '../../src/data/exerciseStillsLoader.js';
// @ts-expect-error módulo JS do app, sem tipos
import ExerciseStills, { FADE_MS, HOLD_MS } from '../../src/components/ExerciseStills.js';
// @ts-expect-error módulo JS do app, sem tipos
import ExerciseMedia from '../../src/components/ExerciseMedia.js';
import { AccessibilityInfo, AppState, animLog } from './stubs/react-native';
import { nav } from './stubs/navigation';
import { byTestId, mount, textsOf } from './stubs/mini-render';

// o mapa de vídeos do app é gerado (hoje vazio): aqui é controlado pelo teste
const media = vi.hoisted(() => ({ map: {} as Record<string, unknown> }));
vi.mock('../../src/data/exerciseVideos.js', () => ({ getExerciseMedia: (id: string) => media.map[id] ?? null }));

const REPO = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
const A = { uri: 'mock://0' };
const B = { uri: 'mock://1' };
const PUSHUP = { id: 'pushup', name: 'Flexão de Braço' };
const IMAGES = { pushup: [A, B] };

const mounted: { unmount: () => void }[] = [];
afterEach(() => { while (mounted.length) mounted.pop()!.unmount(); }); // componentes de um teste não podem reagir a eventos do próximo
beforeEach(() => {
  animLog.started = 0; animLog.stopped = 0; animLog.running = 0; animLog.timings.length = 0;
  nav.set(true);
  AppState.__set('active');
  AccessibilityInfo.__set(false);
  media.map = {};
});

describe('mapa: só confiança alta', () => {
  const rows = read('docs/musculos-exercicios.md').split('\n').filter((l) => l.startsWith('| `')).map((l) => l.split('|').map((x) => x.trim()));
  const conf = (id: string) => rows.find((c) => c[1] === `\`${id}\``)?.[9];
  it('todo id do mapa tem confiança "alta" no documento, e nenhum de média ou sem correspondência está no mapa', () => {
    const ids = Object.keys(MAP.EXERCISE_STILLS);
    expect(ids.length).toBeGreaterThan(20);
    for (const id of ids) expect(conf(id), id).toBe('alta');
    const naoAlta = rows.filter((c) => c[9] !== 'alta').map((c) => c[1]!.replace(/`/g, ''));
    expect(naoAlta.length).toBeGreaterThan(10);
    for (const id of naoAlta) expect(ids, id).not.toContain(id);
  });
  it('todas as linhas "alta" do documento estão no mapa (nenhuma foi esquecida)', () => {
    const alta = rows.filter((c) => c[9] === 'alta').map((c) => c[1]!.replace(/`/g, ''));
    expect(Object.keys(MAP.EXERCISE_STILLS).sort()).toEqual(alta.sort());
  });
  it('cada entrada tem exatamente 2 nomes de arquivo (0.jpg e 1.jpg) e só o mapa, sem imagem nem instrução, é versionado', () => {
    for (const [id, files] of Object.entries(MAP.EXERCISE_STILLS) as [string, string[]][]) {
      expect(files, id).toHaveLength(2);
      expect(files[0], id).toMatch(/\/0\.jpg$/);
      expect(files[1], id).toMatch(/\/1\.jpg$/);
    }
    expect(read('src/data/exerciseStills.js')).not.toMatch(/require\(|instructions|images\//);
    expect(MAP.getStillFiles('plank')).toHaveLength(2);
    expect(MAP.getStillFiles('burpee')).toBeNull();
  });
});

describe('carregador', () => {
  it('só devolve o par quando o id está no mapa E as duas imagens existem', () => {
    expect(getExerciseStills('pushup', IMAGES)).toEqual([A, B]);
    expect(getExerciseStills('pushup', {})).toBeNull(); // sem fotos (build de CI)
    expect(getExerciseStills('pushup', { pushup: [A] })).toBeNull();
    expect(getExerciseStills('pushup', { pushup: [A, null] })).toBeNull();
    expect(getExerciseStills('burpee', { burpee: [A, B] })).toBeNull(); // fora do mapa (sem confiança alta)
    expect(getExerciseStills(undefined, IMAGES)).toBeNull();
  });
  it('sem o arquivo gerado o carregamento não lança e devolve null', () => {
    expect(() => getExerciseStills('pushup')).not.toThrow();
    expect(getExerciseStills('pushup')).toBeNull(); // no teste (ESM) o require opcional falha em silêncio
  });
});

describe('componente ExerciseStills', () => {
  const open = async (props: Record<string, unknown> = {}) => {
    const r = mount(ExerciseStills as never, { exercise: PUSHUP, images: [A, B], ...props });
    mounted.push(r);
    await r.flush();
    return r;
  };
  it('COM fotos: as duas poses empilhadas, caixa 3:2 com contain, legenda "Imagens ilustrativas" e o loop de fade cruzado em andamento', async () => {
    const r = await open();
    expect(byTestId(r.tree, 'exercise-still-start')).toBeTruthy();
    expect(byTestId(r.tree, 'exercise-still-end')).toBeTruthy();
    expect((byTestId(r.tree, 'exercise-still-start') as any).props.resizeMode).toBe('contain');
    expect(textsOf(r.tree)).toContain('Imagens ilustrativas');
    expect(animLog.running).toBe(1);
    // ~1,2 s parado por pose, fade de 0,4 s, para as duas direções
    expect(HOLD_MS).toBe(1200);
    expect(animLog.timings.map((t) => [t.toValue, t.duration])).toEqual([[1, FADE_MS], [0, FADE_MS]]);
    const box = byTestId(r.tree, 'exercise-stills-image') as any;
    expect(box.props.accessibilityRole).toBe('image');
    expect(box.props.accessibilityLabel).toBe('Demonstração do exercício Flexão de Braço, alternando entre a posição inicial e a posição final');
    expect(byTestId(r.tree, 'exercise-stills-toggle') ?? null).toBeNull(); // sem botão fora do modo "reduzir movimento"
  });
  it('SEM fotos: não desenha nada e não inicia animação', async () => {
    for (const images of [undefined, [], [A], [A, null]]) {
      const r = await open({ images });
      expect(byTestId(r.tree, 'exercise-stills') ?? null).toBeNull();
    }
    expect(animLog.started).toBe(0);
  });
  it('REDUZIR MOVIMENTO: foto inicial fixa, sem animação, e o botão alterna a posição à mão (44 pt, com rótulos em português)', async () => {
    AccessibilityInfo.__set(true);
    const r = await open();
    expect(animLog.running).toBe(0);
    expect((byTestId(r.tree, 'exercise-stills-image') as any).props.accessibilityLabel).toBe('Posição inicial do exercício Flexão de Braço');
    const btn = byTestId(r.tree, 'exercise-stills-toggle') as any;
    expect(btn.props.accessibilityLabel).toBe('Ver posição final');
    expect(btn.props.accessibilityRole).toBe('button');
    btn.props.onPress();
    await r.flush();
    expect((byTestId(r.tree, 'exercise-stills-image') as any).props.accessibilityLabel).toBe('Posição final do exercício Flexão de Braço');
    expect((byTestId(r.tree, 'exercise-stills-toggle') as any).props.accessibilityLabel).toBe('Ver posição inicial');
    expect(textsOf(r.tree)).toContain('Ver posição inicial');
    expect(animLog.running).toBe(0);
    expect(read('src/components/ExerciseStills.js')).toMatch(/toggle: \{ minHeight: 44, minWidth: 44/);
  });
  it('mudar "reduzir movimento" com a tela aberta para a animação; desligar volta a animar', async () => {
    const r = await open();
    expect(animLog.running).toBe(1);
    AccessibilityInfo.__set(true);
    await r.flush();
    expect(animLog.running).toBe(0);
    expect(byTestId(r.tree, 'exercise-stills-toggle')).toBeTruthy();
    AccessibilityInfo.__set(false);
    await r.flush();
    expect(animLog.running).toBe(1);
  });
  it('TELA FORA DE FOCO: a animação pára; ao voltar, recomeça', async () => {
    const r = await open();
    expect(animLog.running).toBe(1);
    nav.set(false);
    await r.flush();
    expect(animLog.running).toBe(0);
    nav.set(true);
    await r.flush();
    expect(animLog.running).toBe(1);
  });
  it('SEGUNDO PLANO: a animação pára e volta com o app ativo; ao sair da tela, nada fica rodando', async () => {
    const r = await open();
    AppState.__set('background');
    await r.flush();
    expect(animLog.running).toBe(0);
    AppState.__set('active');
    await r.flush();
    expect(animLog.running).toBe(1);
    r.unmount();
    expect(animLog.running).toBe(0);
    expect(AppState.__count()).toBe(0); // ouvinte do app removido
  });
  it('só a opacidade anima, com o driver nativo (CPU e bateria baixas)', () => {
    const src = read('src/components/ExerciseStills.js');
    expect(src).toContain('useNativeDriver: true');
    expect(src).not.toMatch(/setInterval|setTimeout|requestAnimationFrame/);
    expect(src).toContain('opacity: fade');
  });
});

describe('prioridade da mídia no detalhe: vídeo > fotos > visual atual', () => {
  const open = async (props: Record<string, unknown> = {}) => {
    const r = mount(ExerciseMedia as never, { exercise: PUSHUP, ...props });
    mounted.push(r);
    await r.flush();
    return r;
  };
  it('com vídeo próprio: o vídeo (as fotos nem aparecem)', async () => {
    media.map = { pushup: { video: 1, poster: null, duracaoSeg: 5, alt: 'Vídeo de Flexão' } };
    const r = await open({ stillImages: IMAGES, renderVideo: () => 'VIDEO' });
    expect(byTestId(r.tree, 'exercise-media-video')).toBeTruthy();
    expect(byTestId(r.tree, 'exercise-stills') ?? null).toBeNull();
  });
  it('sem vídeo e com as duas fotos: as fotos', async () => {
    const r = await open({ stillImages: IMAGES });
    expect(byTestId(r.tree, 'exercise-stills')).toBeTruthy();
    expect(byTestId(r.tree, 'exercise-media-placeholder') ?? null).toBeNull();
  });
  it('sem vídeo e SEM fotos (build de CI): o visual de hoje, o placeholder "Vídeo em breve", sem erro e sem espaço em branco', async () => {
    const r = await open({ stillImages: {} });
    expect(byTestId(r.tree, 'exercise-stills') ?? null).toBeNull();
    expect(byTestId(r.tree, 'exercise-media-placeholder')).toBeTruthy();
    expect(textsOf(r.tree)).toContain('Vídeo em breve');
  });
  it('exercício fora do mapa (sem confiança alta) com fotos no arquivo: o visual de hoje', async () => {
    const r = await open({ exercise: { id: 'burpee', name: 'Burpee' }, stillImages: { burpee: [A, B] } });
    expect(byTestId(r.tree, 'exercise-stills') ?? null).toBeNull();
    expect(byTestId(r.tree, 'exercise-media-placeholder')).toBeTruthy();
  });
  it('vídeo que falha ao carregar: cai nas fotos, se houver', async () => {
    media.map = { pushup: { video: 1, poster: null, duracaoSeg: 5, alt: 'x' } };
    let fail: () => void = () => {};
    const r = await open({ stillImages: IMAGES, renderVideo: ({ onFail }: { onFail: () => void }) => { fail = onFail; return 'VIDEO'; } });
    expect(byTestId(r.tree, 'exercise-media-video')).toBeTruthy();
    fail();
    await r.flush();
    expect(byTestId(r.tree, 'exercise-stills')).toBeTruthy();
  });
});

describe('as fotos nunca entram no git', () => {
  const git = (...a: string[]) => spawnSync('git', a, { cwd: REPO, encoding: 'utf8' });
  it('assets/exercicios-ref/ e o arquivo gerado estão no .gitignore e nenhum arquivo dessa pasta é versionado', () => {
    const gi = read('.gitignore');
    expect(gi).toContain('assets/exercicios-ref/');
    expect(gi).toContain('src/data/exerciseStillsImages.generated.js');
    expect(git('check-ignore', 'assets/exercicios-ref/pushup/0.jpg').stdout.trim()).toBe('assets/exercicios-ref/pushup/0.jpg');
    expect(git('check-ignore', 'src/data/exerciseStillsImages.generated.js').stdout.trim()).toBe('src/data/exerciseStillsImages.generated.js');
    expect(git('ls-files', 'assets/exercicios-ref', 'src/data/exerciseStillsImages.generated.js').stdout.trim()).toBe('');
  });
});
