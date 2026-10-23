// "Continuar com Google" (iOS e Android) e "Continuar com Apple" (SÓ iOS, pelo Platform.OS). Só aparecem quando o
// provedor de conta sabe fazer o login social (capabilities).
import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { authErrorMessage } from '../../auth/authErrors';
import { showApple } from '../../auth/socialSupport';
import { Notice, SecondaryButton } from '../../components/auth/AuthParts';

export default function SocialButtons({ onSuccess, disabled }) {
  const { provider, capabilities } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    if (busy || !provider) return;
    setBusy(true);
    setError('');
    try {
      const u = await fn();
      onSuccess?.(u);
    } catch (e) {
      const msg = authErrorMessage(e, 'social'); // cancelar não é erro (vazio)
      if (msg) setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const google = !!capabilities?.google;
  const apple = showApple(capabilities, Platform.OS);
  if (!google && !apple) return null;
  return (
    <View style={{ gap: 12 }}>
      {google ? <SecondaryButton testID="btn-google" icon="logo-google" label="Continuar com Google" disabled={disabled || busy} onPress={() => run(() => provider.signInWithGoogle())} /> : null}
      {apple ? <SecondaryButton testID="btn-apple" icon="logo-apple" label="Continuar com Apple" disabled={disabled || busy} onPress={() => run(() => provider.signInWithApple())} /> : null}
      <Notice kind="error" text={error} testID="social-error" />
    </View>
  );
}
