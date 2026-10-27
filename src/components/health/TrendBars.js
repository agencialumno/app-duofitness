import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, SPACING } from '../../utils/theme';
import { describeSeries } from '../../utils/healthView';

const HEIGHT = 56; // altura padrão; o cartão compacto usa 32
const MIN_BAR = 6;

// Gráfico de barras simples feito só com Views (sem biblioteca nem módulo nativo). Um item por dia:
//  - dia COM dado: barra proporcional (o menor valor da janela tem a altura mínima, o maior a altura total);
//  - dia SEM dado: só um ponto fraco na base ("sem registro"). Dia sem dado nunca vira barra de altura zero.
// O gráfico é visual: o leitor de tela recebe um texto alternativo (média, mínimo, máximo, dias com e sem registro).
export default function TrendBars({ series, metric, color = COLORS.primary, testID, height = HEIGHT, showAxis = true }) {
  if (!series || series.length === 0) return null;
  const present = series.filter((p) => p.value !== null && p.value !== undefined);
  const min = present.length ? Math.min(...present.map((p) => p.value)) : 0;
  const max = present.length ? Math.max(...present.map((p) => p.value)) : 0;
  const lastDate = present.length ? present[present.length - 1].date : null;
  const thin = series.length > 14;
  return (
    <View testID={testID} accessible accessibilityRole="image" accessibilityLabel={describeSeries(series, metric)}>
      <View style={[styles.chart, { height }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {series.map((p) => {
          const has = p.value !== null && p.value !== undefined;
          const h = has ? (max === min ? height * 0.6 : MIN_BAR + ((p.value - min) / (max - min)) * (height - MIN_BAR)) : 0;
          return (
            <View key={p.date} style={[styles.slot, { marginHorizontal: thin ? 0.5 : 2 }]}>
              {has ? (
                <View style={[styles.bar, { height: h, backgroundColor: color, opacity: p.date === lastDate ? 1 : 0.55 }]} />
              ) : (
                <View style={styles.gap} />
              )}
            </View>
          );
        })}
      </View>
      {showAxis ? (
        <View style={styles.axis} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Text style={styles.axisText}>{series[0].date.slice(8)}/{series[0].date.slice(5, 7)}</Text>
          <Text style={styles.axisText}>{series[series.length - 1].date.slice(8)}/{series[series.length - 1].date.slice(5, 7)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: COLORS.bgCardAlt, borderRadius: 10, paddingHorizontal: SPACING.xs, paddingVertical: SPACING.xs, overflow: 'hidden' },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3 },
  gap: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.border },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  axisText: { fontSize: 12, color: COLORS.textSecondary },
});
