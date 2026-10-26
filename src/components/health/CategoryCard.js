import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../../utils/theme';
import TrendBars from './TrendBars';

// Cartão de uma categoria da Saúde (o toque abre o detalhe). Valor atual, tendência de 7 e 30 dias (texto, sem julgamento),
// gráfico de 7 dias com texto alternativo, origem do dado e, sem dados, o que falta e a ação certa (registrar ou conectar).
export default function CategoryCard({ view, onPress, testID }) {
  return (
    <TouchableOpacity
      testID={testID}
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={view.a11y}
    >
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <Ionicons name={view.icon} size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>{view.label}</Text>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </View>

      {view.hasData ? (
        <View style={styles.body}>
          {view.current ? (
            <View style={styles.valueRow}>
              <Text style={styles.value}>{view.current.text}</Text>
              <Text style={styles.sub}>{view.current.sub}</Text>
            </View>
          ) : null}
          {view.extra.map((e) => (
            <Text key={e.label} style={styles.extra}>{e.label}: <Text style={styles.extraValue}>{e.text}</Text> · {e.when}</Text>
          ))}
          <Text style={styles.trend}>{view.trends.d7.text}</Text>
          <Text style={styles.trend}>{view.trends.d30.text}</Text>
          <TrendBars series={view.series.d7} metric={view.primaryMetric} />
          {view.origin ? (
            <View style={styles.originRow}>
              <Ionicons name="information-circle-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.origin}>Origem: {view.origin}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={styles.empty}>{view.empty.message}</Text>
          <View style={styles.actionPill}>
            <Ionicons name={view.empty.action.type === 'connect' ? 'link-outline' : 'add-circle-outline'} size={16} color={COLORS.black} />
            <Text style={styles.actionText}>{view.empty.action.label}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 44 },
  iconWrap: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: '#1A1700', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  body: { gap: SPACING.xs },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: SPACING.sm },
  value: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },
  sub: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  extra: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  extraValue: { color: COLORS.white, fontWeight: '600' },
  trend: { fontSize: FONTS.sizes.sm, color: COLORS.white },
  originRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  origin: { flex: 1, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  empty: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 19 },
  actionPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, minHeight: 44, paddingHorizontal: SPACING.md, borderRadius: RADIUS.full, backgroundColor: COLORS.primary },
  actionText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.black },
});
