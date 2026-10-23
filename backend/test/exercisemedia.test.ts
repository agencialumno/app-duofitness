// Player de vídeo dos exercícios (ExerciseMedia + ExerciseVideoPlayer) com stub do expo-video:
// autoplay, pausa por foco e segundo plano, Reduzir movimento, botão pausar/tocar, falha, liberação e
// configuração (quadrado, cover, loop, mudo, sem controles nativos e sem Picture-in-Picture).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// @ts-expect-error módulo JS do app, sem tipos
import ExerciseMedia from '../../src/components/ExerciseMedia.js';
// @ts-expect-error módulo JS do app, sem tipos
import { getTestVideoSource, parseTestVideo } from '../../src/utils/mediaTestFlag.js';
import { AccessibilityInfo, AppState, Platform } from './stubs/react-native';
import { nav } from './stubs/navigation';
import { FakePlayer, players } from './stubs/expo-video';
import { byLabel, byTestId, findAll, mount, textsOf } from './stubs/mini-render';

const REPO = path.resolve(__dirname, '../..');

// mapa de mídia controlado pelo teste (o real está vazio hoje)
const media = vi.hoisted(() => ({ map: {} as Record<string, unknown> }));
vi.mock('../../src/data/exerciseVideos.js', () => ({ getExerciseMedia: (id: string) => (media.map as Record<string, unknown>)[id] || null }));

const SQUAT = { id: 'squat', name: 'Agachamento Livre' };
const VIDEO = { video: 11, poster: 12, duracaoSeg: 4, alt: 'Vídeo de demonstração de Agachamento Livre' };
const NOPOSTER = { video: 11, poster: null, duracaoSeg: 4, alt: 'Vídeo de demonstração de Agachamento Livre' };

const PAUSE = 'Pausar vídeo de demonstração de Agachamento Livre';
const PLAY = 'Tocar vídeo de demonstração de Agachamento Livre';

beforeEach(() => {
  media.map = {};
  players.length = 0;
  AppState.currentState = 'active';
  AccessibilityInfo.__reduce = false;
  nav.focused = true;
  Platform.OS = 'ios';
});
afterEach(() => vi.unstubAllGlobals());

async function open(m: unknown, props: Record<string, unknown> = {}) {
  if (m) media.map = { squat: m };
  const r = mount(ExerciseMedia as never, { exercise: SQUAT, ...props });
  await r.flush();
  return r;
}
const player = (): FakePlayer => players[players.length - 1]!;
const press = (r: { tree: unknown }, label: string) => (byLabel(r.tree, label) as { props: { onPress: () => void } }).props.onPress();

describe('sem vídeo no mapa: comportamento atual (capa ou placeholder)', () => {
  it('sem capa nem vídeo: placeholder com o selo "Vídeo em breve" e texto para o leitor de tela', async () => {
    const r = await open(null);
    expect(byTestId(r.tree, 'exercise-media-placeholder')).toBeTruthy();
    expect(textsOf(r.tree)).toContain('Vídeo em breve');
    expect((byTestId(r.tree, 'exercise-media') as { props: { accessibilityLabel: string } }).props.accessibilityLabel).toBe('Vídeo de demonstração de Agachamento Livre em breve');
    expect(players).toHaveLength(0); // nenhum player criado sem vídeo
    r.unmount();
  });
  it('com capa e sem vídeo: mostra a capa, sem player', async () => {
    const r = await open({ video: null, poster: 12, duracaoSeg: null, alt: 'Vídeo de demonstração de Agachamento Livre' });
    expect(findAll(r.tree, (n) => n.type === 'Image')).toHaveLength(1);
    expect(byTestId(r.tree, 'exercise-media-placeholder')).toBeUndefined();
    expect(players).toHaveLength(0);
    r.unmount();
  });
});

describe('com vídeo no mapa', () => {
  it('quadrado 1:1, cover, mudo, em loop, sem controles nativos, sem Picture-in-Picture e sem interromper a música', async () => {
    const r = await open(VIDEO);
    const view = findAll(r.tree, (n) => n.type === 'VideoView')[0];
    expect(view).toBeTruthy();
    expect(view.props.player).toBe(player());
    expect(view.props.contentFit).toBe('cover');
    expect(view.props.nativeControls).toBe(false);
    expect(view.props.allowsPictureInPicture).toBe(false);
    expect(view.props.allowsFullscreen).toBe(false);
    expect(player().source).toBe(11);
    expect(player().loop).toBe(true);
    expect(player().muted).toBe(true);
    expect(player().audioMixingMode).toBe('mixWithOthers');
    expect(player().showNowPlayingNotification).toBe(false);
    expect(player().staysActiveInBackground).toBe(false);
    r.unmount();
  });

  it('o quadrado fixo vem do ExerciseMedia (aspectRatio 1) e o vídeo fica escondido do leitor de tela', async () => {
    const src = readFileSync(path.join(REPO, 'src/components/ExerciseMedia.js'), 'utf8');
    expect(src).toMatch(/aspectRatio: 1/);
    const r = await open(VIDEO);
    const view = findAll(r.tree, (n) => n.type === 'VideoView')[0];
    expect(view.props.accessibilityElementsHidden).toBe(true);
    expect(view.props.importantForAccessibility).toBe('no-hide-descendants');
    r.unmount();
  });

  it('autoplay ao abrir a tela; botão com rótulo "Pausar vídeo de demonstração de ..."', async () => {
    const r = await open(VIDEO);
    expect(player().count('play')).toBe(1);
    expect(player().playing).toBe(true);
    expect(byLabel(r.tree, PAUSE)).toBeTruthy();
    expect(byLabel(r.tree, PLAY)).toBeUndefined();
    r.unmount();
  });

  it('botão pausar e tocar: alterna o player e o rótulo', async () => {
    const r = await open(VIDEO);
    press(r, PAUSE);
    expect(player().playing).toBe(false);
    expect(byLabel(r.tree, PLAY)).toBeTruthy();
    press(r, PLAY);
    expect(player().playing).toBe(true);
    expect(byLabel(r.tree, PAUSE)).toBeTruthy();
    // o botão é acessível: papel de botão e área de 44x44
    const btn = byLabel(r.tree, PAUSE) as { props: { accessibilityRole: string; style: { width: number; height: number } } };
    expect(btn.props.accessibilityRole).toBe('button');
    expect(btn.props.style.width).toBeGreaterThanOrEqual(44);
    expect(btn.props.style.height).toBeGreaterThanOrEqual(44);
    r.unmount();
  });

  it('a capa fica por cima enquanto não toca e some ao tocar; sem capa usa o fundo escuro com ícone', async () => {
    const r = await open(VIDEO);
    expect(byTestId(r.tree, 'exercise-video-cover')).toBeUndefined(); // tocando: sem capa por cima
    press(r, PAUSE);
    const cover = byTestId(r.tree, 'exercise-video-cover');
    expect(cover).toBeTruthy();
    expect(findAll(cover, (n) => n.type === 'Image')).toHaveLength(1);
    r.unmount();
    const r2 = await open(NOPOSTER);
    press(r2, PAUSE);
    const cover2 = byTestId(r2.tree, 'exercise-video-cover');
    expect(findAll(cover2, (n) => n.type === 'Image')).toHaveLength(0);
    expect(findAll(cover2, (n) => n.type === 'Ionicons')).toHaveLength(1);
    r2.unmount();
  });

  it('pausa ao perder o foco da tela e volta a tocar ao recuperar', async () => {
    const r = await open(VIDEO);
    expect(player().playing).toBe(true);
    nav.set(false);
    expect(player().playing).toBe(false);
    nav.set(true);
    expect(player().playing).toBe(true);
    r.unmount();
  });

  it('pausa no segundo plano e volta ao voltar para o app', async () => {
    const r = await open(VIDEO);
    AppState.__set('background');
    expect(player().playing).toBe(false);
    AppState.__set('inactive');
    expect(player().playing).toBe(false);
    AppState.__set('active');
    expect(player().playing).toBe(true);
    r.unmount();
  });

  it('quem pausou à mão continua pausado ao voltar o foco (respeita a escolha)', async () => {
    const r = await open(VIDEO);
    press(r, PAUSE);
    nav.set(false);
    nav.set(true);
    expect(player().playing).toBe(false);
    r.unmount();
  });

  it('começa em segundo plano ou sem foco: não toca', async () => {
    AppState.currentState = 'background';
    const r = await open(VIDEO);
    expect(player().playing).toBe(false);
    r.unmount();
    players.length = 0;
    AppState.currentState = 'active';
    nav.focused = false;
    const r2 = await open(VIDEO);
    expect(player().playing).toBe(false);
    r2.unmount();
  });

  it('ao sair da tela: para o player e solta os ouvintes (nada fica pendurado)', async () => {
    const r = await open(VIDEO);
    const p = player();
    const pauses = p.count('pause');
    r.unmount();
    expect(p.count('pause')).toBeGreaterThan(pauses);
    expect(p.playing).toBe(false);
    expect(AppState.__count()).toBe(0);
    expect(nav.count()).toBe(0);
    expect(Object.values(p.listeners).every((s) => s.size === 0)).toBe(true);
  });
});

describe('Reduzir movimento', () => {
  it('ligado: mostra a capa e NÃO toca sozinho; toca só ao toque do usuário', async () => {
    AccessibilityInfo.__reduce = true;
    const r = await open(VIDEO);
    expect(player().playing).toBe(false);
    expect(player().count('play')).toBe(0);
    expect(byTestId(r.tree, 'exercise-video-cover')).toBeTruthy();
    expect(byLabel(r.tree, PLAY)).toBeTruthy();
    press(r, PLAY);
    expect(player().playing).toBe(true);
    expect(byTestId(r.tree, 'exercise-video-cover')).toBeUndefined();
    r.unmount();
  });

  it('não começa a tocar antes de o sistema responder (sem "toca e para logo depois")', async () => {
    AccessibilityInfo.__reduce = true;
    const r = mount(ExerciseMedia as never, { exercise: SQUAT });
    media.map = { squat: VIDEO };
    // sem flush: o sistema ainda não respondeu
    expect(players.every((p) => p.count('play') === 0)).toBe(true);
    await r.flush();
    expect(players.every((p) => p.count('play') === 0)).toBe(true);
    r.unmount();
  });

  it('se a pessoa liga Reduzir movimento com o vídeo tocando, ele para', async () => {
    const r = await open(VIDEO);
    expect(player().playing).toBe(true);
    AccessibilityInfo.__set(true);
    expect(player().playing).toBe(false);
    r.unmount();
  });

  it('desligado: autoplay normal', async () => {
    AccessibilityInfo.__reduce = false;
    const r = await open(VIDEO);
    expect(player().playing).toBe(true);
    r.unmount();
  });
});

describe('falha ao carregar o vídeo', () => {
  it('volta à capa (ou ao placeholder), sem erro na tela e sem selo "em breve"', async () => {
    const r = await open(VIDEO);
    player().emit('statusChange', { status: 'error', error: { message: 'arquivo inválido' } });
    expect(findAll(r.tree, (n) => n.type === 'VideoView')).toHaveLength(0);
    expect(byTestId(r.tree, 'exercise-media-video')).toBeUndefined();
    const fallback = byTestId(r.tree, 'exercise-media') as { props: { accessibilityLabel: string } };
    expect(fallback).toBeTruthy();
    expect(fallback.props.accessibilityLabel).toBe('Vídeo de demonstração de Agachamento Livre indisponível no momento');
    expect(findAll(r.tree, (n) => n.type === 'Image')).toHaveLength(1); // a capa
    const all = textsOf(r.tree).join(' ');
    expect(all).not.toMatch(/erro|falha|arquivo inválido/i);
    expect(all).not.toContain('Vídeo em breve');
    r.unmount();
  });

  it('sem capa, a falha cai no placeholder', async () => {
    const r = await open(NOPOSTER);
    player().emit('statusChange', { status: 'error' });
    expect(byTestId(r.tree, 'exercise-media-placeholder')).toBeTruthy();
    r.unmount();
  });

  it('status "error" já no início também cai no fallback', async () => {
    media.map = { squat: VIDEO };
    const orig = Object.getOwnPropertyDescriptor(FakePlayer.prototype, 'status');
    void orig;
    // o stub cria o player com status 'idle'; simula erro imediato pelo evento antes do primeiro flush
    const r = mount(ExerciseMedia as never, { exercise: SQUAT });
    player().emit('statusChange', { status: 'error' });
    await r.flush();
    expect(findAll(r.tree, (n) => n.type === 'VideoView')).toHaveLength(0);
    r.unmount();
  });
});

describe('componente injetável (renderVideo)', () => {
  it('recebe { media, exercise, autoplay, onFail } e substitui o player', async () => {
    const calls: Record<string, unknown>[] = [];
    const r = await open(VIDEO, { renderVideo: (a: Record<string, unknown>) => { calls.push(a); return { type: 'FakeVideo', props: { testID: 'fake' }, children: [] }; } });
    expect(byTestId(r.tree, 'fake')).toBeTruthy();
    expect(players).toHaveLength(0); // não criou player do expo-video
    expect(calls[calls.length - 1]!.autoplay).toBe(true);
    expect(calls[calls.length - 1]!.media).toBe(VIDEO);
    expect(typeof calls[calls.length - 1]!.onFail).toBe('function');
    (calls[calls.length - 1]!.onFail as () => void)();
    expect(byTestId(r.tree, 'fake')).toBeUndefined();
    expect(byTestId(r.tree, 'exercise-media')).toBeTruthy();
    r.unmount();
  });

  it('autoplay chega falso ao componente injetado com Reduzir movimento', async () => {
    AccessibilityInfo.__reduce = true;
    let last: Record<string, unknown> = {};
    const r = await open(VIDEO, { renderVideo: (a: Record<string, unknown>) => { last = a; return { type: 'FakeVideo', props: {}, children: [] }; } });
    expect(last.autoplay).toBe(false);
    r.unmount();
  });
});

describe('flag de teste da web (?duoTestVideo=1)', () => {
  it('só liga na web, com o parâmetro e com um endereço de vídeo', () => {
    expect(parseTestVideo('?duoTestVideo=1')).toBe(true);
    expect(parseTestVideo('?a=1&duoTestVideo=1')).toBe(true);
    expect(parseTestVideo('?duoTestVideo=0')).toBe(false);
    expect(parseTestVideo('')).toBe(false);
    expect(getTestVideoSource({ platformOS: 'web', search: '?duoTestVideo=1', uri: 'blob:x' })).toEqual({ uri: 'blob:x' });
    expect(getTestVideoSource({ platformOS: 'web', search: '?duoTestVideo=1' })).toBeNull();
    expect(getTestVideoSource({ platformOS: 'web', search: '', uri: 'blob:x' })).toBeNull();
    for (const os of ['ios', 'android', undefined]) expect(getTestVideoSource({ platformOS: os, search: '?duoTestVideo=1', uri: 'blob:x' })).toBeNull();
  });

  it('na web, com a flag e o vídeo de teste, o player real (stub) é usado mesmo com o mapa vazio', async () => {
    Platform.OS = 'web';
    vi.stubGlobal('window', { location: { search: '?duoTestVideo=1' }, __duoTestVideoUri: 'blob:teste' });
    const r = await open(null);
    expect(findAll(r.tree, (n) => n.type === 'VideoView')).toHaveLength(1);
    expect(player().source).toEqual({ uri: 'blob:teste' });
    expect(player().playing).toBe(true);
    r.unmount();
  });

  it('no iOS/Android a flag é ignorada (placeholder normal)', async () => {
    vi.stubGlobal('window', { location: { search: '?duoTestVideo=1' }, __duoTestVideoUri: 'blob:teste' });
    const r = await open(null);
    expect(findAll(r.tree, (n) => n.type === 'VideoView')).toHaveLength(0);
    expect(byTestId(r.tree, 'exercise-media-placeholder')).toBeTruthy();
    r.unmount();
  });
});

describe('fiação', () => {
  const read = (f: string) => readFileSync(path.join(REPO, f), 'utf8');
  it('o player não ativa controles nativos, Picture-in-Picture nem reprodução em segundo plano', () => {
    const src = read('src/components/ExerciseVideoPlayer.js');
    expect(src).toMatch(/nativeControls=\{false\}/);
    expect(src).toMatch(/allowsPictureInPicture=\{false\}/);
    expect(src).toMatch(/staysActiveInBackground = false/);
    expect(src).not.toMatch(/nativeControls=\{true\}|allowsPictureInPicture=\{true\}|staysActiveInBackground = true/);
  });
  it('a flag EXPO_PUBLIC_EXERCISE_VIDEOS continua mandando: a área inteira sai quando desligada', () => {
    const detail = read('src/screens/ExerciseDetailScreen.js');
    expect(detail).toMatch(/EXERCISE_VIDEOS_ENABLED && \(/);
    expect(detail).toContain('<ExerciseMedia exercise={ex} />');
  });
  it('ExerciseDetailScreen não foi alterado em relação ao passo a passo e à dica', () => {
    const detail = read('src/screens/ExerciseDetailScreen.js');
    expect(detail).toContain('Como executar');
    expect(detail).toContain('Dica do personal');
  });
});
