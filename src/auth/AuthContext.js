// Estado da conta para as telas. As telas só falam com a interface do provedor (authInterface.js).
// Com a flag desligada o provedor é o NullAuthProvider: user sempre null, nada muda no app.
// O estado de verificação do e-mail (user, checking, checkFailed, checkedUid) vem de verificationController.js: a única fonte.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { AUTH_ENABLED } from '../data/authConfig';
import { createAuthProvider } from './createAuthProvider';
import { assertAuthProvider } from './authInterface';
import loadNativeProvider from './loadNativeProvider';
import { createVerificationController } from './verificationController';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  // fora do provedor (ex.: telas isoladas em teste): convidado
  return ctx || {
    enabled: false, ready: true, user: null, provider: null, capabilities: { email: false, google: false, apple: false },
    checking: false, checkFailed: false, checkedUid: null, refreshUser: async () => ({ ok: false, user: null }),
  };
}

export function AuthStateProvider({ children, provider: injected, enabled = AUTH_ENABLED }) {
  const provider = useMemo(() => {
    const p = injected || createAuthProvider({
      enabled,
      loadNative: loadNativeProvider,
      platformOS: Platform.OS,
      search: typeof window !== 'undefined' && window.location ? window.location.search : '',
    });
    return assertAuthProvider(p);
  }, [injected, enabled]);

  const controller = useMemo(() => createVerificationController(provider), [provider]);
  const [snap, setSnap] = useState(() => controller.getState());

  useEffect(() => {
    const off = controller.subscribe(setSnap);
    controller.start();
    // volta do segundo plano: o link do e-mail costuma ser aberto em outro app
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') controller.onAppActive(); });
    return () => { sub?.remove?.(); controller.stop(); off(); };
  }, [controller]);

  const value = useMemo(
    () => ({
      enabled, ready: snap.ready, user: snap.user, provider, capabilities: provider.capabilities,
      checking: snap.checking, checkFailed: snap.failed, checkedUid: snap.checkedUid, refreshUser: controller.refresh,
    }),
    [enabled, snap, provider, controller],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
