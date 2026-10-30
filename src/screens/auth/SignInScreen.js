import LegalLinks from '../../components/LegalLinks';
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { authErrorMessage, isThrottle, validateEmail } from '../../auth/authErrors';
import { createAttemptLimiter } from '../../auth/attemptLimiter';
import { AuthField, AuthScreen, Divider, LinkButton, Notice, PrimaryButton } from '../../components/auth/AuthParts';
import SocialButtons from './SocialButtons';

export default function SignInScreen({ navigation }) {
  const { provider } = useAuth();
  const limiter = useMemo(() => createAttemptLimiter(), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (busy) return;
    const ve = validateEmail(email);
    setEmailError(ve);
    if (ve) return;
    if (!password) { setError('Informe a sua senha.'); return; }
    if (!limiter.canTry()) {
      setError(`Aguarde ${limiter.remainingSeconds()} segundos antes de tentar de novo.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await provider.signInWithEmail({ email: email.trim(), password });
      limiter.recordSuccess(); // o portão do app leva à etapa seguinte sozinho
    } catch (e) {
      limiter.recordFailure();
      if (isThrottle(e)) limiter.lock(60000);
      setError(authErrorMessage(e, 'signIn'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthScreen title="Entrar" subtitle="Use o e-mail e a senha da sua conta Duo Fitness." onBack={() => navigation.goBack()}>
      <AuthField label="E-mail" value={email} onChangeText={setEmail} error={emailError} testID="si-email"
        keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="username" autoComplete="email" returnKeyType="next" />
      <AuthField label="Senha" secure value={password} onChangeText={setPassword} testID="si-password"
        textContentType="password" autoComplete="current-password" autoCapitalize="none" autoCorrect={false} returnKeyType="done" onSubmitEditing={submit} />
      <Notice kind="error" text={error} testID="si-error" />
      <PrimaryButton testID="si-submit" label="Entrar" loading={busy} onPress={submit} />
      <LinkButton testID="si-forgot" label="Esqueci a senha" onPress={() => navigation.navigate('ForgotPassword', { email })} />
      <Divider />
      <SocialButtons />
      <LinkButton testID="si-signup" label="Ainda não tenho conta: criar conta" onPress={() => navigation.replace('SignUp')} />
      <LegalLinks testIDPrefix="si" />
    </AuthScreen>
  );
}
