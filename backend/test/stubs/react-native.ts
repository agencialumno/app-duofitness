// Stub mínimo do react-native para testes em Node.
export const View = 'View';
export const Text = 'Text';
export const ScrollView = 'ScrollView';
export const TouchableOpacity = 'TouchableOpacity';
export const Image = 'Image';
export const StyleSheet = {
  create: (s: any) => s,
  hairlineWidth: 1,
  absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
};
export const Platform = { OS: 'ios' as string };
export const alerts: { title: string; message: string; buttons: any[] }[] = [];
export const Alert = { alert: (title: string, message: string, buttons: any[]) => { alerts.push({ title, message, buttons }); } };

// AppState controlável pelo teste
type Listener = (s: string) => void;
const appListeners = new Set<Listener>();
export const AppState = {
  currentState: 'active',
  addEventListener: (_t: string, fn: Listener) => { appListeners.add(fn); return { remove: () => appListeners.delete(fn) }; },
  __set(s: string) { AppState.currentState = s; [...appListeners].forEach((f) => f(s)); },
  __count: () => appListeners.size,
};

// AccessibilityInfo controlável pelo teste ("Reduzir movimento")
const motionListeners = new Set<(v: boolean) => void>();
export const AccessibilityInfo = {
  __reduce: false,
  isReduceMotionEnabled: () => Promise.resolve(AccessibilityInfo.__reduce),
  addEventListener: (_t: string, fn: (v: boolean) => void) => { motionListeners.add(fn); return { remove: () => motionListeners.delete(fn) }; },
  setAccessibilityFocus: () => {},
  __set(v: boolean) { AccessibilityInfo.__reduce = v; [...motionListeners].forEach((f) => f(v)); },
  __count: () => motionListeners.size,
};


// Linking falso: registra o que foi aberto (os testes dos links legais conferem a URL).
export const Linking = {
  opened: [] as string[],
  fail: false,
  openURL: async (url: string) => {
    if (Linking.fail) throw new Error('falha simulada');
    Linking.opened.push(url);
  },
};


// Animated falso: registra as animações iniciadas e paradas (os testes conferem que o loop só roda com foco, app ativo e sem "reduzir movimento").
export const animLog = { started: 0, stopped: 0, running: 0, timings: [] as { toValue: number; duration: number; easing?: unknown }[] };
class AnimValue {
  value: number;
  constructor(v: number) { this.value = v; }
  setValue(v: number) { this.value = v; }
}
const anim = (kind: string, cfg?: any) => ({
  kind, cfg,
  start() { animLog.started++; animLog.running++; },
  stop() { animLog.stopped++; animLog.running = Math.max(0, animLog.running - 1); },
});
export const Animated = {
  Value: AnimValue,
  Image: 'AnimatedImage',
  View: 'AnimatedView',
  timing: (_v: unknown, cfg: any) => { animLog.timings.push({ toValue: cfg.toValue, duration: cfg.duration, easing: cfg.easing }); return anim('timing', cfg); },
  delay: (ms: number) => anim('delay', { ms }),
  sequence: (list: unknown[]) => anim('sequence', { list }),
  loop: (a: unknown) => { const inner: any = a; const loop: any = anim('loop', { a: inner }); loop.start = () => { animLog.started++; animLog.running++; }; return loop; },
};
export const Easing = { inOut: (f: unknown) => f, ease: 'ease' };
