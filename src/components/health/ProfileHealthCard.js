import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../../utils/theme';
import { scoreBand } from '../../utils/health';
import { mostRecentNote } from '../../utils/healthView';
import useHealth from '../../hooks/useHealth';
import { ExampleBadge } from '../OccupancyCard';

// Cartão "Saúde" do Perfil: Duo Score, o registro mais recente (ou "sem dados" com a ação certa) e abre a MESMA tela Saúde
// (a rota "Saude" também está registrada na pilha do Perfil, então o voltar retorna ao Perfil). Menores de 18: só hábitos.
export default function ProfileHealthCard({ onPress }) {
  const h = useHealth();
  const band = scoreBand(h.score);
  const note = mostRecentNote(h.views, h.samples);
  const noData = !h.loading && h.score === null && !note;
  const scoreText = h.loading || h.score === null ? '—' : String(h.score);

  const summary = h.loading
    ? 'Carregando…'
    : noData
      ? 'Ainda sem dados. Registre o primeiro para ver o seu Duo Score.'
      : note
        ? `${note.label}: ${note.text} (${note.sub.toLowerCase()})`
        : 'Registre mais dados para ver a nota.';
  const label = `Saúde. ${h.score === null ? 'Duo Score ainda sem dados.' : `Duo Score ${h.score} de 100, ${band.label}.`} ${summary}${h.minor ? ' Só hábitos.' : ''} ${noData ? 'Toque para registrar.' : 'Abre a área de saúde.'}`;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID="profile-health-card"
    >
      <View style={styles.head}>
        <Ionicons name="heart-outline" size={18} color={COLORS.primary} />
        <Text style={styles.title}>Saúde</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
      </View>
      {h.isExample ? <ExampleBadge /> : null}
      <View style={styles.row}>
        <Text style={styles.score}>{scoreText}</Text>
        <View style={styles.side}>
          <Text style={styles.small}>Duo Score</Text>
          <Text style={styles.band}>{h.loading ? 'Carregando…' : band.label}</Text>
        </View>
      </View>
      <Text style={styles.summary} testID="profile-health-summary">{summary}</Text>
      {h.minor ? <Text style={styles.small}>Só hábitos.</Text> : null}
      {noData ? (
        <View style={styles.action}>
          <Text style={styles.actionText}>Registrar primeiro dado</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.black} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  title: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  score: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },
  side: { flex: 1 },
  small: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  band: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.primary },
  summary: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },
  action: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md },
  actionText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.black },
});
