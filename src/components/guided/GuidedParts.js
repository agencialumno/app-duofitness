import React, { useEffect, useRef } from 'react';
import { Animated, Easing, LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../../utils/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function animateLayout() {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

// Cabeçalho: botão voltar, rótulo opcional e barra de progresso (0 a 1).
export function GuidedHeader({ onBack, progress, caption, label }) {
  const insets = useSafeAreaInsets();
  const width = useRef(new Animated.Value(progress ?? 0)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: progress ?? 0, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [progress, width]);

  return (
    <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        {caption ? <Text style={styles.caption}>{caption}</Text> : <View style={{ flex: 1 }} />}
        {label ? <TrainerLabel text={label} /> : null}
      </View>
      {progress !== undefined && (
        <View
          style={styles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityLabel={caption || 'Progresso'}
          accessibilityValue={{ min: 0, max: 100, now: Math.round((progress ?? 0) * 100) }}
        >
          <Animated.View style={[styles.progressFill, { width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
      )}
    </View>
  );
}

// "Personal Trainer Duo" (gerador local) ou "IA" quando a API real gerou a série.
export function TrainerLabel({ text, badge }) {
  return (
    <View style={styles.trainerLabel}>
      <Ionicons name="sparkles" size={12} color={COLORS.primary} />
      <Text style={styles.trainerLabelText}>{text}</Text>
      {badge ? <Text style={styles.iaBadge}>{badge}</Text> : null}
    </View>
  );
}

// Cartão grande de escolha (uma pergunta por tela).
export function OptionCard({ label, hint, selected, onPress, icon }) {
  return (
    <TouchableOpacity
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
    >
      {icon ? <Ionicons name={icon} size={22} color={selected ? COLORS.primary : COLORS.textSecondary} /> : null}
      <View style={styles.optionText}>
        <Text style={styles.optionLabel}>{label}</Text>
        {hint ? <Text style={styles.optionHint}>{hint}</Text> : null}
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={24}
        color={selected ? COLORS.primary : COLORS.textMuted}
      />
    </TouchableOpacity>
  );
}

// Chip pequeno (opções múltiplas e sugestões).
export function Chip({ label, selected, onPress, accessibilityLabel }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={accessibilityLabel || label}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Botão principal fixo no rodapé, respeitando a área segura.
export function FooterButton({ label, onPress, disabled, secondary, icon }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
      <TouchableOpacity
        style={[styles.primaryBtn, secondary && styles.secondaryBtn, disabled && styles.btnDisabled]}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        accessibilityLabel={label}
      >
        {icon ? <Ionicons name={icon} size={20} color={secondary ? COLORS.primary : COLORS.black} /> : null}
        <Text style={[styles.primaryBtnText, secondary && styles.secondaryBtnText]}>{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

// Checklist animado do "Montando sua série": `visible` = quantas etapas já apareceram.
export function BuildingChecklist({ steps, visible }) {
  return (
    <View style={styles.checklist}>
      {steps.map((s, i) => (
        <ChecklistRow key={s.id} step={s} done={i < visible} active={i === visible} shown={i <= visible} />
      ))}
    </View>
  );
}

function ChecklistRow({ step, done, active, shown }) {
  const opacity = useRef(new Animated.Value(shown ? 1 : 0.25)).current;
  const scale = useRef(new Animated.Value(done ? 1 : 0.8)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: shown ? 1 : 0.25, duration: 250, useNativeDriver: true }).start();
  }, [shown, opacity]);
  useEffect(() => {
    if (done) Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, [done, scale]);

  return (
    <Animated.View
      style={[styles.checkRow, { opacity }]}
      accessible
      accessibilityLabel={`${step.label}. ${done ? `Concluído: ${step.detail}` : active ? 'Em andamento' : 'Aguardando'}`}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={done ? 'checkmark-circle' : active ? 'sync-circle-outline' : 'ellipse-outline'}
          size={26}
          color={done ? COLORS.success : active ? COLORS.primary : COLORS.textMuted}
        />
      </Animated.View>
      <View style={styles.checkText}>
        <Text style={styles.checkLabel}>{step.label}</Text>
        {done ? <Text style={styles.checkDetail}>{step.detail}</Text> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm, backgroundColor: COLORS.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  backBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -SPACING.sm },
  caption: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.bgCardAlt, overflow: 'hidden', marginTop: SPACING.xs },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.primary },
  trainerLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1A1700', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  trainerLabelText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.primary },
  iaBadge: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.black, backgroundColor: COLORS.primary, borderRadius: 4, paddingHorizontal: 4, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 64, padding: SPACING.md, borderRadius: RADIUS.lg, backgroundColor: COLORS.bgCard, borderWidth: 1.5, borderColor: COLORS.border },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: '#1A1700' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.white },
  optionHint: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
  chip: { minHeight: 44, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, justifyContent: 'center', borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.white },
  chipTextSelected: { color: COLORS.black },
  footer: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border },
  primaryBtn: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  secondaryBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.primary },
  btnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.black, flexShrink: 1, textAlign: 'center' },
  secondaryBtnText: { color: COLORS.primary },
  checklist: { gap: SPACING.md },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.lg, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  checkText: { flex: 1 },
  checkLabel: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  checkDetail: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
});
