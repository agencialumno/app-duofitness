// Stub do expo-video: player falso que registra o que o app faz com ele.
import { useRef } from './react';

// status inicial dos players criados (os testes trocam para 'loading' para simular carregamento)
export const playerDefaults = { status: 'readyToPlay' };

export class FakePlayer {
  source: any;
  loop = false;
  muted = false;
  audioMixingMode = 'auto';
  showNowPlayingNotification = true;
  staysActiveInBackground = true;
  status = playerDefaults.status;
  playing = false;
  calls: string[] = [];
  listeners: Record<string, Set<(p: any) => void>> = {};
  released = false;
  constructor(source: any) { this.source = source; }
  play() {
    this.calls.push('play');
    if (!this.playing) { this.playing = true; this.emit('playingChange', { isPlaying: true, oldIsPlaying: false }); }
  }
  pause() {
    this.calls.push('pause');
    if (this.playing) { this.playing = false; this.emit('playingChange', { isPlaying: false, oldIsPlaying: true }); }
  }
  release() { this.released = true; }
  addListener(evt: string, cb: (p: any) => void) {
    (this.listeners[evt] ||= new Set()).add(cb);
    return { remove: () => this.listeners[evt]?.delete(cb) };
  }
  emit(evt: string, payload: any) { [...(this.listeners[evt] || [])].forEach((f) => f(payload)); }
  count(c: string) { return this.calls.filter((x) => x === c).length; }
}

export const players: FakePlayer[] = [];

export function useVideoPlayer(source: any, setup?: (p: FakePlayer) => void) {
  const ref: { current: FakePlayer | null } = useRef(null);
  if (!ref.current) {
    ref.current = new FakePlayer(source);
    players.push(ref.current);
    setup?.(ref.current);
  }
  return ref.current;
}
export const VideoView = 'VideoView';
