// Peças visuais das telas de conta. Regras de acessibilidade: nada depende só de cor (ícone + texto), alvos de toque
// de pelo menos 44 pt, fonte dinâmica (minHeight em vez de height), contraste mínimo 4,5:1 (sem COLORS.textMuted em texto útil)
// e o campo focado sempre visível com o teclado aberto.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../../utils/theme';
import { metCount } from '../../utils/passwordPolicy';

const FocusScroll = createContext(() => {});

// Tela de conta: área segura, teclado que empurra o conteúdo e rolagem até o campo focado.
export function AuthScreen({ children, onBack, title, subtitle }) {
  const insets = useSafeAreaInsets();
  const ref = useRef(null);
  const scrollTo = useCallback((y) => { ref.current?.scrollTo({ y: Math.max(0, y - SPACING.lg), animated: true }); }, []);
  return (
    // Fundo escuro em TODAS as camadas (KeyboardAvoidingView, ScrollView e conteúdo): a área atrás do teclado e o bounce ao puxar a
    // tela mostravam o fundo claro do tema padrão. testID "auth-screen" é conferido pelo smoke (cor de fundo computada).
    <KeyboardAvoidingView testID="auth-screen" style={styles.screen} behavior="padding" keyboardVerticalOffset={0}>
      <ScrollView
        ref={ref}
        style={styles.screen}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.screenContent, { paddingTop: insets.top + SPACING.md, paddingBottom: insets.bottom + SPACING.xl }]}
      >
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
        ) : null}
        {title ? <Text style={styles.title} accessibilityRole="header">{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <FocusScroll.Provider value={scrollTo}>
          <View style={styles.form}>{children}</View>
        </FocusScroll.Provider>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function AuthField({ label, error, hint, secure, value, onChangeText, onBlur, inputRef, testID, ...rest }) {
  const scrollTo = useContext(FocusScroll);
  const [shown, setShown] = useState(false);
  const y = useRef(0);
  const isSecure = !!secure && !shown;
  return (
    <View style={styles.field} onLayout={(e) => { y.current = e.nativeEvent.layout.y; }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        <TextInput
          ref={inputRef}
          testID={testID}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          onFocus={() => scrollTo(y.current)}
          secureTextEntry={isSecure}
          keyboardAppearance="dark"
          selectionColor={COLORS.primary}
          placeholderTextColor={COLORS.textSecondary}
          accessibilityLabel={label}
          accessibilityHint={hint}
          {...rest}
        />
        {secure ? (
          <TouchableOpacity
            onPress={() => setShown((s) => !s)}
            style={styles.eye}
            accessibilityRole="button"
            accessibilityLabel={shown ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <Ionicons name={shown ? 'eye-off-outline' : 'eye-outline'} size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={16} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled, loading, testID }) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={disabled || loading ? undefined : onPress}
      disabled={!!(disabled || loading)}
      aria-disabled={!!(disabled || loading)}
      activeOpacity={0.85}
      style={[styles.btn, (disabled || loading) && styles.btnDisabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
    >
      {loading ? <ActivityIndicator color={COLORS.black} /> : <Text style={styles.btnText}>{label}</Text>}
    </TouchableOpacity>
  );
}

export function SecondaryButton({ label, onPress, icon, disabled, testID }) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={disabled ? undefined : onPress}
      disabled={!!disabled}
      aria-disabled={!!disabled}
      activeOpacity={0.8}
      style={[styles.btn2, disabled && styles.btnDisabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
    >
      {icon ? <Ionicons name={icon} size={20} color={COLORS.white} /> : null}
      <Text style={styles.btn2Text}>{label}</Text>
    </TouchableOpacity>
  );
}

// Botões de login social para FUNDO ESCURO.
//  - Apple (diretrizes de aparência da Apple para Sign in with Apple): sobre fundo escuro usa-se o botão BRANCO (fundo branco,
//    logo e texto pretos), cantos arredondados, altura mínima de 44 pt e o texto "Continuar com a Apple".
//  - Google (tema escuro do botão do Google): fundo #131314, contorno #8E918F e texto #E3E3E3. O "G" aqui é o ícone monocromático
//    do Ionicons; antes de publicar na loja, trocar pelo "G" oficial colorido do kit de marca do Google.
export const SOCIAL_STYLES = {
  apple: { bg: '#FFFFFF', fg: '#000000', border: '#FFFFFF' },
  google: { bg: '#131314', fg: '#E3E3E3', border: '#8E918F' },
};

export function SocialButton({ provider, label, onPress, disabled, testID }) {
  const v = SOCIAL_STYLES[provider];
  return (
    <TouchableOpacity
      testID={testID}
      onPress={disabled ? undefined : onPress}
      disabled={!!disabled}
      aria-disabled={!!disabled}
      activeOpacity={0.8}
      style={[styles.social, { backgroundColor: v.bg, borderColor: v.border }, disabled && styles.btnDisabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Ionicons name={provider === 'apple' ? 'logo-apple' : 'logo-google'} size={20} color={v.fg} />
      <Text style={[styles.socialText, { color: v.fg }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function LinkButton({ label, onPress, testID, danger }) {
  return (
    <TouchableOpacity testID={testID} onPress={onPress} style={styles.link} accessibilityRole="link" accessibilityLabel={label}>
      <Text style={[styles.linkText, danger && { color: COLORS.error }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Mensagem de erro/aviso geral do formulário (ícone + texto, anunciada ao leitor de tela).
export function Notice({ kind = 'error', text, testID }) {
  if (!text) return null;
  const color = kind === 'error' ? COLORS.error : kind === 'success' ? COLORS.success : COLORS.primary;
  const icon = kind === 'error' ? 'alert-circle' : kind === 'success' ? 'checkmark-circle' : 'information-circle';
  return (
    <View testID={testID} style={[styles.notice, { borderColor: color }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}

export function CheckRow({ checked, label, onToggle, testID, children }) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onToggle}
      activeOpacity={0.8}
      style={styles.checkRow}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!checked }}
      accessibilityLabel={label}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Ionicons name="checkmark" size={18} color={COLORS.black} /> : null}
      </View>
      <View style={styles.flex}>{children || <Text style={styles.checkText}>{label}</Text>}</View>
    </TouchableOpacity>
  );
}

// Checklist em tempo real: cada requisito mostra ícone (check/círculo) E texto ("atendido"/"pendente" para o leitor de tela).
// O resumo "N de 7 requisitos" é anunciado só quando o número muda, com pausa de 800 ms (não repete a cada tecla).
export function PasswordChecklist({ rules, started }) {
  const done = metCount(rules);
  const last = useRef(null);
  useEffect(() => {
    if (!started) return undefined;
    const t = setTimeout(() => {
      if (last.current === done) return;
      last.current = done;
      const msg = done === rules.length ? 'Todos os requisitos da senha foram atendidos.' : `${done} de ${rules.length} requisitos da senha atendidos.`;
      AccessibilityInfo.announceForAccessibility?.(msg);
    }, 800);
    return () => clearTimeout(t);
  }, [done, started, rules.length]);
  return (
    <View style={styles.checklist} testID="password-checklist" accessibilityLabel="Requisitos da senha">
      <Text style={styles.checkTitle} accessibilityLiveRegion="polite">{`Requisitos da senha (${done} de ${rules.length})`}</Text>
      {rules.map((r) => (
        <View key={r.id} style={styles.ruleRow} accessible accessibilityLabel={`${r.label}: ${r.ok ? 'atendido' : 'pendente'}`} testID={`rule-${r.id}`}>
          <Ionicons name={r.ok ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={r.ok ? COLORS.success : COLORS.textSecondary} />
          <Text style={[styles.ruleText, r.ok && styles.ruleOk]}>{r.label}</Text>
          <Text style={styles.ruleState}>{r.ok ? 'Atendido' : 'Pendente'}</Text>
        </View>
      ))}
    </View>
  );
}

const STRENGTH_COLORS = ['#555555', COLORS.error, COLORS.warning, COLORS.primary, COLORS.success];

export function StrengthBar({ strength }) {
  if (!strength || strength.level === 0) return null;
  return (
    <View style={styles.strengthWrap} accessible accessibilityLabel={`Força da senha: ${strength.label}, nível ${strength.level} de 4`} testID="strength-bar">
      <View style={styles.strengthBars}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.strengthSeg, { backgroundColor: i <= strength.level ? STRENGTH_COLORS[strength.level] : COLORS.border }]} />
        ))}
      </View>
      <Text style={styles.strengthLabel}>{`Força: ${strength.label}`}</Text>
    </View>
  );
}

export function Divider({ text = 'ou' }) {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{text}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

// Janela de confirmação própria (Alert não funciona na web e não dá para testar).
export function ConfirmModal({ visible, title, children, confirmLabel, confirmDisabled, onConfirm, onCancel, busy, danger }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.sheetTitle} accessibilityRole="header">{title}</Text>
            {children}
            <View style={{ height: SPACING.md }} />
            <TouchableOpacity
              onPress={confirmDisabled || busy ? undefined : onConfirm}
              disabled={!!(confirmDisabled || busy)}
              aria-disabled={!!(confirmDisabled || busy)}
              style={[styles.btn, danger && { backgroundColor: COLORS.error }, (confirmDisabled || busy) && styles.btnDisabled]}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              accessibilityState={{ disabled: !!(confirmDisabled || busy) }}
              testID="confirm-modal-ok"
            >
              {busy ? <ActivityIndicator color={COLORS.white} /> : <Text style={[styles.btnText, danger && { color: COLORS.white }]}>{confirmLabel}</Text>}
            </TouchableOpacity>
            <LinkButton label="Cancelar" onPress={onCancel} testID="confirm-modal-cancel" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export const isIOS = Platform.OS === 'ios';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.bg },
  screenContent: { paddingHorizontal: SPACING.lg, flexGrow: 1, backgroundColor: COLORS.bg },
  back: { width: 44, height: 44, justifyContent: 'center', marginBottom: SPACING.sm },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginBottom: SPACING.md },
  form: { gap: SPACING.md },
  field: { gap: SPACING.xs },
  label: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, minHeight: 52 },
  inputError: { borderColor: COLORS.error },
  input: { flex: 1, color: COLORS.white, fontSize: FONTS.sizes.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, minHeight: 50 },
  eye: { width: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  errorText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.error },
  hint: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  btn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, minHeight: 52, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.black, textAlign: 'center' },
  btn2: { flexDirection: 'row', gap: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.textSecondary, minHeight: 52, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, alignItems: 'center', justifyContent: 'center' },
  social: { flexDirection: 'row', gap: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1, minHeight: 52, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, alignItems: 'center', justifyContent: 'center' },
  socialText: { fontSize: FONTS.sizes.md, fontWeight: '600', textAlign: 'center' },
  btn2Text: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.white, textAlign: 'center' },
  link: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.sm },
  linkText: { fontSize: FONTS.sizes.md, color: COLORS.primary, textDecorationLine: 'underline', textAlign: 'center' },
  notice: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start', borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.md, backgroundColor: COLORS.bgCard },
  noticeText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.white, lineHeight: 20 },
  checkRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start', minHeight: 44, paddingVertical: SPACING.xs },
  box: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, borderColor: COLORS.textSecondary, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkText: { fontSize: FONTS.sizes.sm, color: COLORS.white, lineHeight: 20 },
  checklist: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.xs },
  checkTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.white, marginBottom: 2 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 26 },
  ruleText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  ruleOk: { color: COLORS.white },
  ruleState: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  strengthWrap: { gap: 4 },
  strengthBars: { flexDirection: 'row', gap: 4 },
  strengthSeg: { flex: 1, height: 6, borderRadius: 3 },
  strengthLabel: { fontSize: FONTS.sizes.sm, color: COLORS.white },
  divider: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: SPACING.lg },
  sheet: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.lg, maxHeight: '90%', borderWidth: 1, borderColor: COLORS.border },
  sheetTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.white, marginBottom: SPACING.sm },
});
