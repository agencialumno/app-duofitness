// "Continuar com Google" (iOS e Android) e "Continuar com Apple" (SÓ iOS, pelo Platform.OS). Só aparecem quando o
// provedor de conta sabe fazer o login social (capabilities).
import React, { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { COLORS } from '../../utils/theme';
import { useAuth } from '../../auth/AuthContext';
import { authErrorDetail, authErrorMessage } from '../../auth/authErrors';
import { showApple } from '../../auth/socialSupport';
import { Notice, SocialButton } from '../../components/auth/AuthParts';

export default function SocialButtons({ onSuccess, disabled }) {
  const { provider, capabilities } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState('');

  const run = async (fn) => {
    if (busy || !provider) return;
    setBusy(true);
    setError('');
    setDetail('');
    try {
      const u = await fn();
      onSuccess?.(u);
    } catch (e) {
      const msg = authErrorMessage(e, 'social'); // cancelar não é erro (vazio)
      if (msg) { setError(msg); setDetail(authErrorDetail(e)); }
    } finally {
      setBusy(false);
    }
  };

  const google = !!capabilities?.google;
  const apple = showApple(capabilities, Platform.OS);
  if (!google && !apple) return null;
  return (
    <View style={{ gap: 12 }}>
      {google ? <SocialButton provider="google" testID="btn-google" label="Continuar com Google" disabled={disabled || busy} onPress={() => run(() => provider.signInWithGoogle())} /> : null}
      {apple ? <SocialButton provider="apple" testID="btn-apple" label="Continuar com a Apple" disabled={disabled || busy} onPress={() => run(() => provider.signInWithApple())} /> : null}
      <Notice kind="error" text={error} testID="social-error" />
      {error && detail ? <Text testID="social-error-detail" selectable style={{ fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' }}>{detail}</Text> : null}
    </View>
  );
}
