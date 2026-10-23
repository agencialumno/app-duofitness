// Cartão "Conta" do Perfil. Só aparece com a flag de contas ligada e fora do Modo Demo (o demo nunca usa conta nem rede).
// Sair da conta NÃO apaga os dados locais (ainda não há sincronização). Excluir a conta apaga só a conta online.
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../../utils/theme';
import { useAuth } from '../../auth/AuthContext';
import { authErrorMessage } from '../../auth/authErrors';
import { canConfirmDelete } from '../../auth/authFlow';
import { AuthField, ConfirmModal, LinkButton, Notice, SecondaryButton } from './AuthParts';

export default function AccountCard() {
  const { enabled, user, provider } = useAuth();
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [askDelete, setAskDelete] = useState(false);
  const [typed, setTyped] = useState('');
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  if (!enabled) return null;

  if (!user) {
    return (
      <View style={styles.card} testID="account-card">
        <Text style={styles.title}>Conta</Text>
        <Text style={styles.text}>Você está usando o app sem conta. Tudo fica neste aparelho.</Text>
      </View>
    );
  }

  const providers = user.providers || [];
  const methods = providers.map((p) => (p === 'password' ? 'e-mail e senha' : p === 'google.com' ? 'Google' : p === 'apple.com' ? 'Apple' : p)).join(', ');

  const resend = async () => {
    setBusy(true); setError(''); setInfo('');
    try { await provider.sendEmailVerification(); setInfo('E-mail de verificação enviado. Confira também a caixa de spam.'); }
    catch (e) { setError(authErrorMessage(e, 'verify')); }
    finally { setBusy(false); }
  };
  const refresh = async () => {
    setBusy(true); setError(''); setInfo('');
    try {
      const u = await provider.reloadUser();
      if (u?.emailVerified) setInfo('E-mail verificado.'); else setError('Ainda não encontramos a verificação.');
    } catch (e) { setError(authErrorMessage(e, 'verify')); }
    finally { setBusy(false); }
  };
  const signOut = async () => {
    setBusy(true); setError(''); setInfo('');
    try { await provider.signOut(); } catch (e) { setError(authErrorMessage(e, 'general')); } finally { setBusy(false); }
  };
  const closeDelete = () => { setAskDelete(false); setTyped(''); setPassword(''); setDeleteError(''); };
  const doDelete = async () => {
    setBusy(true); setDeleteError('');
    try {
      await provider.deleteAccount({ password });
      closeDelete();
    } catch (e) {
      setDeleteError(authErrorMessage(e, 'delete'));
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
      <View style={styles.row} accessible accessibilityLabel={user.emailVerified ? 'E-mail verificado' : 'E-mail ainda não verificado'}>
        <Ionicons name={user.emailVerified ? 'checkmark-circle' : 'alert-circle-outline'} size={18} color={user.emailVerified ? COLORS.success : COLORS.warning} />
        <Text style={styles.text} testID="account-verified">{user.emailVerified ? 'E-mail verificado' : 'E-mail ainda não verificado'}</Text>
      </View>
      {!user.emailVerified ? (
        <View style={styles.actions}>
          <SecondaryButton testID="account-resend" label="Reenviar e-mail de verificação" onPress={resend} disabled={busy} />
          <SecondaryButton testID="account-refresh" label="Já verifiquei" onPress={refresh} disabled={busy} />
        </View>
      ) : null}
      <Notice kind="success" text={info} testID="account-info" />
      <Notice kind="error" text={error} testID="account-error" />
      <Text style={styles.text}>Sair da conta não apaga os seus treinos: eles continuam neste aparelho.</Text>
      <SecondaryButton testID="account-signout" label="Sair da conta" onPress={signOut} disabled={busy} />
      <LinkButton testID="account-delete" danger label="Excluir conta" onPress={() => setAskDelete(true)} />

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
          Isso exclui a sua conta online e não pode ser desfeito. Os treinos guardados neste aparelho não são apagados.
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
});
