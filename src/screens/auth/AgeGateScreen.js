import React, { useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, SPACING } from '../../utils/theme';
import { useApp } from '../../context/AppContext';
import { PRIVACY_URL } from '../../data/authConfig';
import { GUARDIAN_CONSENT_TEXT, MIN_ACCOUNT_AGE } from '../../config/account';
import { buildAgeInfo, canContinueAge, evaluateAge } from '../../utils/accountAge';
import { AuthField, AuthScreen, CheckRow, LinkButton, Notice, PrimaryButton } from '../../components/auth/AuthParts';

// Etapa de idade: aparece logo depois do primeiro login de uma conta NOVA (e-mail, Google ou Apple), antes de qualquer coleta de dados e
// do onboarding. A idade fica só no aparelho. Abaixo de MIN_ACCOUNT_AGE: mensagem clara, a conta recém-criada é excluída e a pessoa
// volta às boas-vindas (nada é guardado). De MIN_ACCOUNT_AGE a 17: exige a autorização do responsável. 18 ou mais: segue.
export default function AgeGateScreen() {
  const { saveAge, rejectUnderage } = useApp();
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const result = useMemo(() => evaluateAge(text), [text]);
  const canGo = canContinueAge(result, guardian);

  const openPrivacy = () => {
    if (PRIVACY_URL) { Linking.openURL(PRIVACY_URL).catch(() => setNote('Não foi possível abrir a Política de Privacidade agora.')); return; }
    setNote('A Política de Privacidade está em revisão e será publicada em breve.');
  };

  const submit = async () => {
    if (busy) return;
    setTouched(true);
    if (result.status === 'blocked') {
      setBusy(true);
      try { await rejectUnderage(); } finally { setBusy(false); }
      return;
    }
    if (!canGo) return;
    setBusy(true);
    try { await saveAge(buildAgeInfo(result, guardian)); } finally { setBusy(false); }
  };

  const invalid = touched && text.trim().length > 0 && result.status === 'invalid';
  const blocked = result.status === 'blocked';

  return (
    <AuthScreen title="Qual é a sua idade?" subtitle={`A idade ajuda a adaptar o app para você e fica só neste aparelho. A conta é para pessoas a partir de ${MIN_ACCOUNT_AGE} anos.`}>
      <AuthField
        label="Idade (em anos)"
        value={text}
        onChangeText={setText}
        onBlur={() => setTouched(true)}
        error={invalid ? result.message : ''}
        testID="age-input"
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={3}
        returnKeyType="done"
        onSubmitEditing={submit}
        autoCorrect={false}
      />

      {blocked ? <Notice kind="info" testID="age-blocked" text={result.message} /> : null}

      {result.status === 'guardian' ? (
        <>
          <Notice kind="info" text="Para usar o app com menos de 18 anos, o treino é só de hábitos (sem peso nem metas) e precisamos da autorização do seu responsável." testID="age-minor-note" />
          <CheckRow testID="age-guardian" checked={guardian} onToggle={() => setGuardian((x) => !x)} label={GUARDIAN_CONSENT_TEXT}>
            <Text style={styles.checkText}>{GUARDIAN_CONSENT_TEXT}.</Text>
          </CheckRow>
          <LinkButton testID="age-privacy" label="Ler a Política de Privacidade" onPress={openPrivacy} />
          <Notice kind="info" text={note} testID="age-note" />
        </>
      ) : null}

      <PrimaryButton
        testID="age-submit"
        label={blocked ? 'Entendi' : 'Continuar'}
        disabled={blocked ? false : !canGo}
        loading={busy}
        onPress={submit}
      />
      {!blocked && !canGo ? (
        <View accessibilityLiveRegion="polite">
          <Text style={styles.why}>{result.status === 'guardian' ? 'Marque a autorização do responsável para continuar.' : 'Informe a sua idade para continuar.'}</Text>
        </View>
      ) : null}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  checkText: { fontSize: FONTS.sizes.sm, color: COLORS.white, lineHeight: 20 },
  why: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs },
});
