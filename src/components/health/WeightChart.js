import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, SPACING } from '../../utils/theme';
import { formatKg, getChartPoints } from '../../utils/health';

const HEIGHT = 140;
const PAD = 14;
const DOT = 10;

function shortDate(key) {
  const [, m, d] = key.split('-');
  return `${d}/${m}`;
}

// Gráfico de linha de peso feito só com Views (sem biblioteca nem módulo nativo).
export default function WeightChart({ series }) {
  const [width, setWidth] = useState(0);
  if (!series || series.length === 0) return null;

  const pts = getChartPoints(series);
  const innerW = Math.max(width - PAD * 2, 1);
  const innerH = HEIGHT - PAD * 2;
  const xy = pts.map((p) => ({ x: PAD + p.x * innerW, y: PAD + (1 - p.y) * innerH }));
  const first = series[0];
  const last = series[series.length - 1];

  return (
    <View
      accessible
      accessibilityLabel={`Gráfico de evolução do peso: de ${formatKg(first.kg)} em ${shortDate(first.date)} para ${formatKg(last.kg)} em ${shortDate(last.date)}, ${series.length} registros.`}
    >
      <View style={styles.chart} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && xy.slice(1).map((b, i) => {
          const a = xy[i];
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          const angle = Math.atan2(b.y - a.y, b.x - a.x);
          return (
            <View
              key={`l${i}`}
              style={[styles.line, { width: len, left: (a.x + b.x) / 2 - len / 2, top: (a.y + b.y) / 2 - 1, transform: [{ rotate: `${angle}rad` }] }]}
            />
          );
        })}
        {width > 0 && xy.map((p, i) => (
          <View key={`d${i}`} style={[styles.dot, { left: p.x - DOT / 2, top: p.y - DOT / 2 }, i === xy.length - 1 && styles.dotLast]} />
        ))}
      </View>
      <View style={styles.axis}>
        <Text style={styles.axisText}>{shortDate(first.date)} · {formatKg(first.kg)}</Text>
        <Text style={styles.axisText}>{shortDate(last.date)} · {formatKg(last.kg)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { height: HEIGHT, backgroundColor: COLORS.bgCardAlt, borderRadius: 12, overflow: 'hidden' },
  line: { position: 'absolute', height: 2, backgroundColor: COLORS.primary, opacity: 0.8 },
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: COLORS.bgCard, borderWidth: 2, borderColor: COLORS.primary },
  dotLast: { backgroundColor: COLORS.primary },
  axis: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
  axisText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
});
