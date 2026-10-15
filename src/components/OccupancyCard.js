import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { formatUpdatedAgo, getOccupancyRatio, getOccupancyState } from '../utils/occupancy';

const STATE_COLOR = { quiet: COLORS.success, moderate: COLORS.warning, full: COLORS.error };

// Selo de dados de exemplo: aparece sempre que a origem for "mock".
export function ExampleBadge() {
  return (
    <View style={styles.badge} accessibilityLabel="Dados de exemplo">
      <Ionicons name="flask-outline" size={12} color={COLORS.black} />
      <Text style={styles.badgeText}>Dados de exemplo</Text>
    </View>
  );
}

// Conteúdo da lotação: contagem, capacidade, barra, estado e "atualizado há X min".
// Só números agregados. Sem dados: "Sem dados no momento".
export default function OccupancyCard({ status, reading, now, large = false }) {
  if (status === 'loading') {
    return <Text style={styles.muted}>Carregando…</Text>;
  }
  if (status !== 'ready' || !reading) {
    return (
      <View style={styles.emptyRow}>
        <Ionicons name="cloud-offline-outline" size={20} color={COLORS.textSecondary} />
        <Text style={styles.empty}>Sem dados no momento</Text>
      </View>
    );
  }

  const st = getOccupancyState(reading.count, reading.capacity);
  const ratio = getOccupancyRatio(reading.count, reading.capacity) ?? 0;
  const color = STATE_COLOR[st?.id] || COLORS.primary;
  const ago = formatUpdatedAgo(reading.updatedAt, now);

  return (
    <View
      accessible
      accessibilityLabel={`${reading.count} de ${reading.capacity} pessoas. Academia ${st?.label?.toLowerCase()}.${ago ? ` Atualizado ${ago}.` : ''}${reading.source === 'mock' ? ' Dados de exemplo.' : ''}`}
    >
      <View style={styles.row}>
        <Text style={[styles.count, large && styles.countLarge]}>{reading.count}</Text>
        <Text style={styles.of}>de {reading.capacity} pessoas</Text>
        <View style={[styles.stateChip, { borderColor: color }]}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.stateText}>{st?.label}</Text>
        </View>
      </View>
      <View style={[styles.bar, large && styles.barLarge]}>
        <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: color }]} />
      </View>
      {ago ? <Text style={styles.updated}>Atualizado {ago}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: SPACING.sm },
  count: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },
  countLarge: { fontSize: FONTS.sizes.xxxl },
  of: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, flexShrink: 1 },
  stateChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  stateText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.white },
  bar: { height: 8, borderRadius: 4, backgroundColor: COLORS.bgCardAlt, overflow: 'hidden', marginTop: SPACING.sm },
  barLarge: { height: 12, borderRadius: 6 },
  fill: { height: '100%', borderRadius: 4 },
  updated: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: SPACING.xs },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  empty: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textSecondary, flexShrink: 1 },
  muted: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.black },
});
