// Escolhe o provedor de conta. Flag desligada = NullAuthProvider (convidado), sem tocar em nada.
// O provedor falso só existe na WEB e só pela URL (?duoFakeAuth=1), como o ?duoForceError: nenhum build de iOS/Android
// consegue ser colocado nesse modo. O provedor real (Firebase) entra na branch conta-firebase, por `loadNative`.
import NullAuthProvider from './NullAuthProvider';
import FakeAuthProvider from './FakeAuthProvider';

export function wantsFakeAuth(platformOS, search) {
  return platformOS === 'web' && /[?&]duoFakeAuth=1\b/.test(String(search || ''));
}

export function createAuthProvider({ enabled, platformOS, search, loadNative } = {}) {
  if (!enabled) return new NullAuthProvider({ reason: 'disabled' });
  if (wantsFakeAuth(platformOS, search)) return new FakeAuthProvider();
  if (platformOS !== 'web' && typeof loadNative === 'function') {
    try {
      const native = loadNative();
      if (native) return native;
    } catch (e) {
      console.error('Provedor de conta indisponível:', e);
    }
  }
  return new NullAuthProvider({ reason: 'unavailable' });
}
