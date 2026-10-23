import React, { useMemo, useState } from 'react';
import { Linking, Text, View, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING } from '../../utils/theme';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { authErrorMessage } from '../../auth/authErrors';
import { destinationAfterAuth, validateSignUp } from '../../auth/authFlow';
import { PRIVACY_URL, TERMS_URL } from '../../data/authConfig';
import {
  AuthField, AuthScreen, CheckRow, Divider, LinkButton, Notice, PasswordChecklist, PrimaryButton, StrengthBar,
} from '../../components/auth/AuthParts';
import SocialButtons from './SocialButtons';

export default function SignUpScreen({ navigation }) {
  const { provider } = useAuth();
  const { user: appUser } = useApp();
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState({});
  const [isAdult, setIsAdult] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [legalNote, setLegalNote] = useState('');

  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const touch = (k) => () => setTouched((t) => ({ ...t, [k]: true }));
  const v = useMemo(() => validateSignUp({ ...f, isAdult, accepted }, touched), [f, isAdult, accepted, touched]);
  const hasRealProfile = !!appUser && !appUser.isDemo;

  const openLegal = (url) => {
    if (url) { Linking.openURL(url).catch(() => setLegalNote('Não foi possível abrir o documento agora.')); return; }
    setLegalNote('Este documento está em revisão e será publicado em breve.');
  };

  const submit = async () => {
    if (!v.canSubmit || busy) return;
    setBusy(true);
    setError('');
    try {
      await provider.signUpWithEmail({ email: f.email.trim(), password: f.password, name: f.name.trim() });
      provider.sendEmailVerification().catch(() => {}); // o reenvio fica na próxima tela
      navigation.reset({ index: 0, routes: [{ name: 'VerifyEmail' }] });
    } catch (e) {
      setError(authErrorMessage(e, 'signUp'));
    } finally {
      setBusy(false);
    }
  };

  const afterSocial = () => navigation.reset({ index: 0, routes: [{ name: destinationAfterAuth({ hasRealProfile }) }] });

  return (
    <AuthScreen title="Criar conta" subtitle="Sua conta guarda o acesso ao app. Os seus treinos continuam no aparelho." onBack={() => navigation.goBack()}>
      <AuthField label="Nome" value={f.name} onChangeText={set('name')} onBlur={touch('name')} error={v.errors.name} testID="su-name"
        textContentType="name" autoComplete="name" autoCapitalize="words" returnKeyType="next" />
      <AuthField label="E-mail" value={f.email} onChangeText={set('email')} onBlur={touch('email')} error={v.errors.email} testID="su-email"
        keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" autoComplete="email" returnKeyType="next" />
      <AuthField label="Senha" secure value={f.password} onChangeText={set('password')} onBlur={touch('password')} testID="su-password"
        textContentType="newPassword" autoComplete="new-password" autoCapitalize="none" autoCorrect={false}
        passwordRules="minlength: 10; required: lower; required: upper; required: digit; required: special;" />
      <StrengthBar strength={v.password.strength} />
      <PasswordChecklist rules={v.password.rules} started={f.password.length > 0} />
      <AuthField label="Confirmar senha" secure value={f.confirm} onChangeText={set('confirm')} onBlur={touch('confirm')} error={v.errors.confirm} testID="su-confirm"
        textContentType="newPassword" autoComplete="new-password" autoCapitalize="none" autoCorrect={false} />

      <CheckRow testID="su-adult" checked={isAdult} onToggle={() => setIsAdult((x) => !x)} label="Tenho 18 anos ou mais" />
      {!isAdult && touched.confirm ? (
        <Notice kind="info" testID="su-adult-note" text="A conta é só para maiores de 18 anos. Se você é menor, use o app sem conta: o treino funciona igual, só no seu aparelho." />
      ) : null}
      <CheckRow testID="su-terms" checked={accepted} onToggle={() => setAccepted((x) => !x)} label="Li e aceito os Termos de Uso e a Política de Privacidade">
        <Text style={styles.checkText}>Li e aceito os Termos de Uso e a Política de Privacidade.</Text>
      </CheckRow>
      <View style={styles.legalLinks}>
        <LinkButton label="Ler os Termos de Uso" onPress={() => openLegal(TERMS_URL)} testID="su-terms-link" />
        <LinkButton label="Ler a Política de Privacidade" onPress={() => openLegal(PRIVACY_URL)} testID="su-privacy-link" />
      </View>
      <Notice kind="info" text={legalNote} testID="su-legal-note" />

      <Notice kind="error" text={error} testID="su-error" />
      <PrimaryButton testID="su-submit" label="Criar conta" disabled={!v.canSubmit} loading={busy} onPress={submit} />
      {!v.canSubmit ? <Text style={styles.why} accessibilityLiveRegion="polite">Complete os campos, os requisitos da senha e as duas confirmações para criar a conta.</Text> : null}

      <Divider />
      <SocialButtons disabled={!isAdult || !accepted} onSuccess={afterSocial} />
      {!isAdult || !accepted ? <Text style={styles.why}>Para entrar com Google ou Apple, confirme que tem 18 anos ou mais e aceite os termos.</Text> : null}
      <LinkButton testID="su-signin" label="Já tenho conta: entrar" onPress={() => navigation.replace('SignIn')} />
      <LinkButton testID="su-guest" label="Continuar sem conta" onPress={() => navigation.navigate('ProfileSetup')} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  checkText: { fontSize: FONTS.sizes.sm, color: COLORS.white, lineHeight: 20 },
  legalLinks: { marginTop: -SPACING.xs },
  why: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center' },
});
