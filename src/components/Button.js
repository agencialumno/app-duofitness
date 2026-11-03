import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BUTTON, FONTS, RADIUS, SPACING, TYPE } from '../utils/theme';

// Botão único do app (docs/visual-botoes.md). 4 variantes (primary, secondary, tertiary, destructive; esta também na forma `quiet`, só texto) e 2 tamanhos
// (normal: altura mínima 52; compact: 44). O amarelo só aparece na variante primária. Só tokens: cores e medidas vêm de BUTTON no tema.
//  - Pressionado: cor própria por token (Pressable), nunca opacidade. Desabilitado: cores próprias, sem opacity.
//  - Altura com minHeight (não fixa) para o botão crescer com fonte grande do sistema. Alvo de toque nunca menor que 44 x 44.
//  - loading: o rótulo continua ocupando o espaço (invisível) e o indicador fica por cima, então a largura não muda; o toque é bloqueado.
//  - Não usa navegação nem contexto: pode ser usado também no ErrorBoundary e em modais.
export default function Button({
  label, onPress, variant = 'primary', size = 'normal', quiet = false, iconLeft, iconRight, loading = false, disabled = false, fullWidth,
  accessibilityLabel, accessibilityHint, accessibilityRole = 'button', testID,
}) {
  const compact = size === 'compact';
  const tertiary = variant === 'tertiary';
  const quietText = variant === 'destructive' && quiet;
  const plain = tertiary || quietText; // só texto, sublinhado
  const blocked = !!(disabled || loading);
  const wide = fullWidth === undefined ? !compact && !tertiary && !quietText : !!fullWidth;
  const palette = BUTTON.colors[quietText ? 'destructiveQuiet' : variant] || BUTTON.colors.primary;
  const stateOf = (pressed) => (disabled ? palette.disabled : pressed && !loading ? palette.pressed : palette.rest);
  const textColor = stateOf(false).fg;
  const iconColor = textColor;

  return (
    <Pressable
      testID={testID}
      onPress={blocked ? undefined : onPress}
      disabled={blocked}
      aria-disabled={blocked}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy: !!loading }}
      style={({ pressed }) => {
        const c = stateOf(pressed);
        return [
          styles.base,
          compact ? styles.compact : styles.normal,
          plain && styles.plain,
          c.bg ? { backgroundColor: c.bg } : null,
          c.border ? styles.bordered : null,
          c.border ? { borderColor: c.border } : null,
          wide ? styles.wide : null,
        ];
      }}
    >
      {iconLeft ? <Ionicons name={iconLeft} size={BUTTON.iconSize} color={iconColor} style={loading ? styles.hidden : undefined} /> : null}
      <Text
        style={[compact ? styles.textCompact : styles.textNormal, plain && styles.underline, { color: textColor }, loading ? styles.hidden : null]}
        numberOfLines={2}
      >
        {label}
      </Text>
      {iconRight ? <Ionicons name={iconRight} size={BUTTON.iconSize} color={iconColor} style={loading ? styles.hidden : undefined} /> : null}
      {loading ? (
        <View style={styles.spinner} pointerEvents="none">
          <ActivityIndicator color={textColor} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, minWidth: BUTTON.minWidth, borderRadius: RADIUS.full, paddingVertical: SPACING.sm },
  normal: { minHeight: BUTTON.minHeight.normal, paddingHorizontal: SPACING.lg },
  compact: { minHeight: BUTTON.minHeight.compact, paddingHorizontal: SPACING.md },
  plain: { paddingHorizontal: SPACING.sm },
  bordered: { borderWidth: BUTTON.borderWidth },
  wide: { alignSelf: 'stretch' },
  textNormal: { ...TYPE.bodyLarge, textAlign: 'center', flexShrink: 1 },
  textCompact: { ...TYPE.body, fontWeight: FONTS.weights.semibold, textAlign: 'center', flexShrink: 1 },
  underline: { textDecorationLine: 'underline' },
  // opacidade 0 (estrutural, não visual): o rótulo e os ícones seguem ocupando o espaço enquanto o indicador aparece por cima
  hidden: { opacity: 0 },
  spinner: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
