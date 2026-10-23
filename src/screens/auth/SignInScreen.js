import React, { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { COLORS, FONTS } from '../../utils/theme';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { authErrorMessage, isThrottle, validateEmail } from '../../auth/authErrors';
import { createAttemptLimiter } from '../../auth/attemptLimiter';
import { destinationAfterAuth } from '../../auth/authFlow';
import { AuthField, AuthScreen, Divider, LinkButton, Notice, PrimaryButton } from '../../components/auth/AuthParts';
import SocialButtons from './SocialButtons';

export default function SignInScreen({ navigation }) {
  const { provider } = useAuth();
  const { user: appUser } = useApp();
  const limiter = useMemo(() => createAttemptLimiter(), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const hasRealProfile = !!appUser && !appUser.isDemo;

  const go = () => navigation.reset({ index: 0, routes: [{ name: destinationAfterAuth({ hasRealProfile }) }] });

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
      limiter.recordSuccess();
      go();
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
      <SocialButtons onSuccess={go} />
      <LinkButton testID="si-signup" label="Ainda não tenho conta: criar conta" onPress={() => navigation.replace('SignUp')} />
      <LinkButton testID="si-guest" label="Continuar sem conta" onPress={() => navigation.navigate('ProfileSetup')} />
      <Text style={{ fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textAlign: 'center' }}>
        Sem conta, tudo funciona no seu aparelho, como antes.
      </Text>
    </AuthScreen>
  );
}
