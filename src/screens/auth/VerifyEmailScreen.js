import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { COLORS, FONTS } from '../../utils/theme';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { authErrorMessage } from '../../auth/authErrors';
import { RESEND_WAIT_SECONDS as RESEND_WAIT, destinationAfterAuth } from '../../auth/authFlow';
import { AuthScreen, LinkButton, Notice, PrimaryButton, SecondaryButton } from '../../components/auth/AuthParts';

export default function VerifyEmailScreen({ navigation }) {
  const { provider, user, refreshUser } = useAuth();
  const { user: appUser } = useApp();
  const [wait, setWait] = useState(RESEND_WAIT); // o e-mail acabou de ser enviado no cadastro
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const hasRealProfile = !!appUser && !appUser.isDemo;

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const cont = () => navigation.reset({ index: 0, routes: [{ name: destinationAfterAuth({ hasRealProfile }) }] });

  const resend = async () => {
    if (wait > 0 || busy) return;
    setBusy(true); setError(''); setInfo('');
    try {
      await provider.sendEmailVerification();
      setInfo('Enviamos o e-mail de verificação de novo. Confira também a caixa de spam.');
      setWait(RESEND_WAIT);
    } catch (e) {
      setError(authErrorMessage(e, 'verify'));
    } finally { setBusy(false); }
  };

  const check = async () => {
    if (busy) return;
    setBusy(true); setError(''); setInfo('');
    try {
      const r = await refreshUser(); // atualiza o estado global (o Perfil vê o mesmo valor)
      if (!r.ok) setError('Não foi possível verificar agora. Confira a conexão e tente de novo.');
      else if (r.user?.emailVerified) setInfo('E-mail verificado. Tudo certo!');
      else setError('Ainda não encontramos a verificação. Abra o link do e-mail e tente de novo.');
    } finally { setBusy(false); }
  };

  return (
    <AuthScreen title="Verifique o seu e-mail" subtitle={`Enviamos um link de confirmação para ${user?.email || 'o seu e-mail'}. Abra o link e volte aqui.`}>
      <Notice kind="info" text="A verificação é necessária para recursos na nuvem e ações sensíveis. Você já pode usar o app enquanto isso." testID="ve-why" />
      <Notice kind="success" text={user?.emailVerified ? 'E-mail verificado.' : ''} testID="ve-verified" />
      <Notice kind="success" text={info} testID="ve-info" />
      <Notice kind="error" text={error} testID="ve-error" />
      <PrimaryButton testID="ve-checked" label="Já verifiquei" loading={busy} onPress={check} />
      <SecondaryButton testID="ve-resend" label={wait > 0 ? `Reenviar e-mail (aguarde ${wait} s)` : 'Reenviar e-mail'} disabled={wait > 0 || busy} onPress={resend} />
      <LinkButton testID="ve-continue" label="Continuar" onPress={cont} />
      <Text style={{ fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textAlign: 'center' }}>Não achou? Veja a caixa de spam ou o endereço digitado.</Text>
    </AuthScreen>
  );
}
