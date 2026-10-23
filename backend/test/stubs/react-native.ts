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
