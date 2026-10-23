import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { RESET_SENT, authErrorMessage, validateEmail } from '../../auth/authErrors';
import { AuthField, AuthScreen, LinkButton, Notice, PrimaryButton } from '../../components/auth/AuthParts';

export default function ForgotPasswordScreen({ navigation, route }) {
  const { provider } = useAuth();
  const [email, setEmail] = useState(route?.params?.email || '');
  const [emailError, setEmailError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (busy) return;
    const ve = validateEmail(email);
    setEmailError(ve);
    if (ve) return;
    setBusy(true);
    setError('');
    try {
      await provider.sendPasswordReset(email.trim());
      setSent(true);
    } catch (e) {
      // a resposta é a mesma exista ou não a conta; só falhas de rede/limite viram aviso
      const code = String(e?.code || '');
      if (code === 'auth/network-request-failed' || code === 'auth/too-many-requests') setError(authErrorMessage(e, 'reset'));
      else setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen title="Esqueci a senha" subtitle="Informe o e-mail da sua conta para receber o link de nova senha." onBack={() => navigation.goBack()}>
      <AuthField label="E-mail" value={email} onChangeText={setEmail} error={emailError} testID="fp-email"
        keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" autoComplete="email" returnKeyType="done" onSubmitEditing={submit} />
      <Notice kind="success" text={sent ? RESET_SENT : ''} testID="fp-sent" />
      <Notice kind="error" text={error} testID="fp-error" />
      <PrimaryButton testID="fp-submit" label={sent ? 'Enviar de novo' : 'Enviar link'} loading={busy} onPress={submit} />
      <LinkButton testID="fp-back" label="Voltar para entrar" onPress={() => navigation.goBack()} />
    </AuthScreen>
  );
}
