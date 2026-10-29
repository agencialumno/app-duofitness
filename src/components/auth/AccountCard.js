// Cartão "Conta" do Perfil (e-mail e verificação) e a seção "Conta" no fim do Perfil (Sair da conta e Excluir minha conta).
// Sair da conta guarda um snapshot dos dados da conta neste aparelho e limpa os ativos; entrar de novo restaura (accountSnapshot.js).
// Excluir a conta apaga a conta online, o snapshot do uid e os dados ativos.
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { COLORS, FONTS, RADIUS, SPACING } from '../../utils/theme';
import { useAuth } from '../../auth/AuthContext';
import { authErrorMessage } from '../../auth/authErrors';
import { RESEND_WAIT_SECONDS, canConfirmDelete, verificationView } from '../../auth/authFlow';
import { AuthField, ConfirmModal, LinkButton, Notice, SecondaryButton } from './AuthParts';

export default function AccountCard() {
  const { enabled, user, provider, checking, checkFailed, checkedUid, refreshUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [wait, setWait] = useState(0); // intervalo entre reenvios do e-mail de verificação

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  if (!enabled || !user) return null;

  const providers = user.providers || [];
  const methods = providers.map((p) => (p === 'password' ? 'e-mail e senha' : p === 'google.com' ? 'Google' : p === 'apple.com' ? 'Apple' : p)).join(', ');
  const view = verificationView({ user, checking, failed: checkFailed, checkedOnce: checkedUid === user.uid });

  const resend = async () => {
    if (wait > 0) return;
    setBusy(true); setError(''); setInfo('');
    try { await provider.sendEmailVerification(); setInfo('E-mail de verificação enviado. Confira também a caixa de spam.'); setWait(RESEND_WAIT_SECONDS); }
    catch (e) { setError(authErrorMessage(e, 'verify')); }
    finally { setBusy(false); }
  };
  const refresh = async () => {
    setBusy(true); setError(''); setInfo('');
    try {
      // o resultado entra no estado global (AuthContext): Perfil e qualquer recurso leem o mesmo valor
      const r = await refreshUser();
      if (!r.ok) setError('Não foi possível verificar agora. Confira a conexão e tente de novo.');
      else if (r.user?.emailVerified) setInfo('E-mail verificado.');
      else setError('Ainda não encontramos a verificação. Abra o link do e-mail e tente de novo.');
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.card} testID="account-card">
      <Text style={styles.title}>Conta</Text>
      <View style={styles.row}>
        <Ionicons name="mail-outline" size={18} color={COLORS.white} />
        <Text style={styles.email} testID="account-email">{user.email}</Text>
      </View>
      <Text style={styles.text}>Entrada por {methods || 'conta'}.</Text>
      <View style={styles.row} accessible accessibilityLabel={view.text} accessibilityLiveRegion="polite" testID="account-verified-row">
        <Ionicons name={view.icon} size={18} color={view.tone === 'ok' ? COLORS.success : view.tone === 'warn' ? COLORS.warning : COLORS.textSecondary} />
        <Text style={styles.text} testID="account-verified" data-kind={view.kind}>{view.text}</Text>
      </View>
      {view.note ? <Text style={styles.text} testID="account-verified-note">{view.note}</Text> : null}
      {view.canAct ? (
        <View style={styles.actions}>
          {view.kind === 'unverified' ? (
            <SecondaryButton testID="account-resend" label={wait > 0 ? `Reenviar e-mail de verificação (aguarde ${wait} s)` : 'Reenviar e-mail de verificação'} onPress={resend} disabled={busy || wait > 0} />
          ) : null}
          <SecondaryButton testID="account-refresh" label="Já verifiquei" onPress={refresh} disabled={busy} />
        </View>
      ) : null}
      <Notice kind="success" text={info} testID="account-info" />
      <Notice kind="error" text={error} testID="account-error" />
    </View>
  );
}

// Seção "Conta" no FIM do Perfil, discreta: "Sair da conta" (sem Alert) e, abaixo, o link pequeno "Excluir minha conta" (a Apple exige
// o caminho de exclusão, diretriz 5.1.1(v)). Mantém a janela de confirmação, o reautenticar e a revogação do token da Apple.
export function AccountActions() {
  const { enabled, user } = useAuth();
  const { signOutAccount, deleteAccountAndData } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [askDelete, setAskDelete] = useState(false);
  const [typed, setTyped] = useState('');
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  if (!enabled || !user) return null;
  const providers = user.providers || [];

  const signOut = async () => {
    setBusy(true); setError('');
    try { await signOutAccount(); } catch (e) { setError(authErrorMessage(e, 'general')); setBusy(false); }
  };
  const closeDelete = () => { setAskDelete(false); setTyped(''); setPassword(''); setDeleteError(''); };
  const doDelete = async () => {
    setBusy(true); setDeleteError('');
    try {
      await deleteAccountAndData({ password });
      closeDelete();
    } catch (e) {
      setDeleteError(authErrorMessage(e, 'delete'));
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.section} testID="account-actions">
      <Text style={styles.sectionTitle}>Conta</Text>
      <Text style={styles.text}>Ao sair, os seus treinos e dados ficam guardados neste aparelho e voltam quando você entrar de novo com esta conta.</Text>
      <Notice kind="error" text={error} testID="account-error-actions" />
      <SecondaryButton testID="account-signout" label="Sair da conta" onPress={signOut} disabled={busy} />
      <TouchableOpacity
        testID="account-delete"
        style={styles.deleteLink}
        onPress={() => setAskDelete(true)}
        accessibilityRole="button"
        accessibilityLabel="Excluir minha conta"
        accessibilityHint="Abre a confirmação para excluir a conta para sempre"
      >
        <Text style={styles.deleteText}>Excluir minha conta</Text>
      </TouchableOpacity>

      <ConfirmModal
        visible={askDelete}
        danger
        title="Excluir conta"
        confirmLabel="Excluir conta para sempre"
        confirmDisabled={!canConfirmDelete({ providers, password, typed })}
        busy={busy}
        onConfirm={doDelete}
        onCancel={closeDelete}
      >
        <Text style={styles.text}>
          Isso exclui a sua conta e os dados dela guardados neste aparelho, e não pode ser desfeito.
        </Text>
        {providers.includes('password') ? (
          <AuthField label="Confirme a sua senha" secure value={password} onChangeText={setPassword} testID="del-password"
            textContentType="password" autoComplete="current-password" autoCapitalize="none" autoCorrect={false} />
        ) : null}
        <AuthField label={'Digite EXCLUIR para confirmar'} value={typed} onChangeText={setTyped} testID="del-typed" autoCapitalize="characters" autoCorrect={false} />
        <Notice kind="error" text={deleteError} testID="del-error" />
      </ConfirmModal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.md },
  title: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  email: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.white, fontWeight: '600' },
  text: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20, flexShrink: 1 },
  actions: { gap: SPACING.sm },
  section: { gap: SPACING.sm, marginTop: SPACING.sm },
  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  // link de texto pequeno, cor neutra, sem ícone: discreto, mas com área de toque de 44 pt e que cresce com o texto
  deleteLink: { minHeight: 44, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: SPACING.md },
  deleteText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textDecorationLine: 'underline', textAlign: 'center' },
});
