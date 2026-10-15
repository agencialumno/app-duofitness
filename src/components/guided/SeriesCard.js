import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../../utils/theme';
import { EQUIPMENT_LABELS, getAlternatives } from '../../utils/guidedPlan';
import { animateLayout } from './GuidedParts';

// Cartão expansível de uma série (A, B ou C) com troca de exercício por alternativa do mesmo grupo
// muscular e com equipamento do combo.
export default function SeriesCard({ workouts, index, settings, user, onSwap, initiallyOpen = false }) {
  const workout = workouts[index];
  const [open, setOpen] = useState(initiallyOpen);
  const [swapFor, setSwapFor] = useState(null);

  const toggle = () => {
    animateLayout();
    setOpen((o) => !o);
    setSwapFor(null);
  };

  const pick = (exerciseId) => {
    animateLayout();
    setSwapFor((cur) => (cur === exerciseId ? null : exerciseId));
  };

  const choose = (exerciseId, newId) => {
    animateLayout();
    onSwap(index, exerciseId, newId);
    setSwapFor(null);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.head}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Série ${workout.serie}, ${workout.exercises.length} exercícios, ${workout.focus}. ${open ? 'Recolher' : 'Expandir'}`}
      >
        <View style={styles.letter}>
          <Text style={styles.letterText}>{workout.serie}</Text>
        </View>
        <View style={styles.headText}>
          <Text style={styles.name}>{workout.name.replace(`Série ${workout.serie} — `, '')}</Text>
          <Text style={styles.meta}>{workout.exercises.length} exercícios · {workout.focus}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {open && (
        <View style={styles.body}>
          {workout.exercises.map((ex) => {
            const alternatives = swapFor === ex.id ? getAlternatives(workouts, index, ex.id, settings, user) : [];
            return (
              <View key={ex.id} style={styles.exRow}>
                <View style={styles.exLine}>
                  <View style={styles.exText}>
                    <Text style={styles.exName}>{ex.name}</Text>
                    <Text style={styles.exMeta}>
                      {ex.sets}x {ex.reps} · descanso {ex.rest}s · {(ex.muscleGroup || []).join(', ')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.swapBtn}
                    onPress={() => pick(ex.id)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: swapFor === ex.id }}
                    accessibilityLabel={`Trocar ${ex.name}`}
                  >
                    <Ionicons name="swap-horizontal" size={16} color={COLORS.primary} />
                    <Text style={styles.swapText}>Trocar</Text>
                  </TouchableOpacity>
                </View>

                {swapFor === ex.id && (
                  <View style={styles.alts}>
                    {alternatives.length === 0 ? (
                      <Text style={styles.noAlt}>Não há outra opção do mesmo grupo com os equipamentos do seu combo.</Text>
                    ) : (
                      alternatives.slice(0, 6).map((alt) => (
                        <TouchableOpacity
                          key={alt.id}
                          style={styles.alt}
                          onPress={() => choose(ex.id, alt.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Usar ${alt.name} no lugar de ${ex.name}`}
                        >
                          <Text style={styles.altName}>{alt.name}</Text>
                          <Text style={styles.altMeta}>{EQUIPMENT_LABELS[alt.equipment] || alt.equipment} · {alt.difficulty}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 64, padding: SPACING.md },
  letter: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  letterText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.black },
  headText: { flex: 1 },
  name: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  meta: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  body: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: SPACING.md },
  exRow: { paddingVertical: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  exLine: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  exText: { flex: 1 },
  exName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.white },
  exMeta: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2, lineHeight: 16 },
  swapBtn: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SPACING.sm },
  swapText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },
  alts: { marginTop: SPACING.xs, gap: SPACING.xs },
  alt: { minHeight: 44, justifyContent: 'center', padding: SPACING.sm, borderRadius: RADIUS.md, backgroundColor: COLORS.bgCardAlt, borderWidth: 1, borderColor: COLORS.border },
  altName: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.white },
  altMeta: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  noAlt: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 18, paddingVertical: SPACING.xs },
});
