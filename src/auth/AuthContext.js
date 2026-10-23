// Estado da conta para as telas. As telas só falam com a interface do provedor (authInterface.js).
// Com a flag desligada o provedor é o NullAuthProvider: user sempre null, nada muda no app.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { AUTH_ENABLED } from '../data/authConfig';
import { createAuthProvider } from './createAuthProvider';
import { assertAuthProvider } from './authInterface';
import loadNativeProvider from './loadNativeProvider';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  // fora do provedor (ex.: telas isoladas em teste): convidado
  return ctx || { enabled: false, ready: true, user: null, provider: null, capabilities: { email: false, google: false, apple: false } };
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

  const [user, setUser] = useState(() => provider.getCurrentUser());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const off = provider.onAuthStateChanged((u) => { setUser(u); setReady(true); });
    return off;
  }, [provider]);

  const value = useMemo(
    () => ({ enabled, ready, user, provider, capabilities: provider.capabilities }),
    [enabled, ready, user, provider],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
