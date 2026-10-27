import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, HEALTH_UI } from '../../utils/theme';
import { cardA11y, compactVariation } from '../../utils/healthView';
import TrendBars from './TrendBars';

const { space, type, card } = HEALTH_UI;

// "76,0 kg" -> ["76,0", "kg"]; "6h24" (sem espaço) fica inteiro como valor.
function splitValue(text) {
  const m = /^([\d.,:]+)\s+(\D.*)$/.exec(String(text));
  return m ? [m[1], m[2]] : [String(text), ''];
}

// Cartão enxuto de UMA categoria com dados: um valor principal grande (com a unidade), a variação, uma mini-tendência e a
// origem em texto pequeno. Explicação, histórico e registro ficam no detalhe (o toque abre). Lido como UM item pelo leitor de
// tela (cardA11y). Categoria sem dados NÃO usa este cartão: fica no grupo "Sem dados ainda".
export default function CategoryCard({ view, onPress, testID }) {
  const variation = compactVariation(view);
  const [number, unit] = view.current ? splitValue(view.current.text) : ['', ''];
  return (
    <TouchableOpacity
      testID={testID}
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={cardA11y(view)}
    >
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <Ionicons name={view.icon} size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>{view.label}</Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </View>

      {view.current ? (
        <View style={styles.valueRow}>
          <Text style={styles.value}>{number}</Text>
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
          <Text style={styles.when}>{view.current.sub}</Text>
        </View>
      ) : (
        <Text style={styles.when}>Sem valor principal ainda.</Text>
      )}

      <View style={styles.variation}>
        <Ionicons name={variation.icon} size={16} color={COLORS.textSecondary} />
        <Text style={styles.variationText}>{variation.text}<Text style={styles.when}> · {variation.window}</Text></Text>
      </View>

      <TrendBars series={view.series.d7} metric={view.primaryMetric} height={32} showAxis={false} />

      {view.origin ? <Text style={styles.origin}>Origem: {view.origin}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.bgCard, borderRadius: card.radius, borderWidth: card.borderWidth, borderColor: COLORS.border, padding: space.cardPadding, gap: space.inner },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.inner, minHeight: HEALTH_UI.minTouch },
  iconWrap: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#1A1700', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, ...type.label, color: COLORS.white },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: space.inner },
  value: { ...type.value, color: COLORS.white },
  unit: { ...type.label, color: COLORS.white },
  when: { ...type.caption, color: COLORS.textSecondary },
  variation: { flexDirection: 'row', alignItems: 'center', gap: space.tight },
  variationText: { flex: 1, ...type.support, color: COLORS.white },
  origin: { ...type.caption, color: COLORS.textSecondary },
});
