import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, TYPE, HEALTH_UI } from '../utils/theme';

// Cabeçalho único de tela (docs/visual-cabecalho.md). Duas variantes:
//  - "inner" (padrão): tela interna, com botão voltar; título TYPE.title, até 2 linhas.
//  - "root": raiz de aba, sem voltar; título grande TYPE.titleLarge.
// NÃO usa useNavigation: o voltar é o `onBack` que a tela passa, então headerShown, useReturnToOrigin e o gesto do iOS continuam como estão.
// Topo seguro: fundo opaco COLORS.bg com insets.top somado, irmão fixo acima do ScrollView (o conteúdo não passa por baixo do relógio).
// Alvos de toque de HEALTH_UI.minTouch (44) no voltar e na coluna da ação à direita; quem passa `right` define role e label do nó.
export default function ScreenHeader({ title, subtitle, onBack, right, variant = 'inner', testID }) {
  const insets = useSafeAreaInsets();
  const root = variant === 'root';
  return (
    <View testID={testID} style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
      {!root && onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.touch} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={SPACING.lg} color={COLORS.white} />
        </TouchableOpacity>
      ) : null}
      <View style={styles.text}>
        <Text style={root ? styles.titleRoot : styles.title} numberOfLines={2} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right ? <View testID="screen-header-right" style={styles.rightSlot}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm, backgroundColor: COLORS.bg },
  touch: { minWidth: HEALTH_UI.minTouch, minHeight: HEALTH_UI.minTouch, alignItems: 'center', justifyContent: 'center', marginLeft: -SPACING.sm },
  text: { flex: 1, gap: SPACING.xs },
  title: { ...TYPE.title, color: COLORS.textPrimary },
  titleRoot: { ...TYPE.titleLarge, color: COLORS.textPrimary },
  subtitle: { ...TYPE.bodySmall, color: COLORS.textSecondary },
  rightSlot: { minWidth: HEALTH_UI.minTouch, minHeight: HEALTH_UI.minTouch, alignItems: 'center', justifyContent: 'center' },
});
