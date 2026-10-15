import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ExerciseDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { exercise: ex } = route.params;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="fitness-outline" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.heroName}>{ex.name}</Text>
          <View style={styles.tags}>
            {[ex.category, ex.difficulty, ex.equipment].map((t, i) => (
              <View key={i} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
            ))}
          </View>
        </View>

        <View style={styles.configRow}>
          {[
            { label: ex.isTime ? 'Tempo' : 'Repetições', value: ex.defaultReps || ex.reps },
            { label: 'Séries', value: ex.defaultSets || ex.sets },
            { label: 'Descanso', value: `${ex.defaultRest || ex.rest}s` },
          ].map((item, i) => (
            <View key={i} style={[styles.configItem, i < 2 && styles.configItemBorder]}>
              <Text style={styles.configValue}>{item.value}</Text>
              <Text style={styles.configLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Músculos trabalhados</Text>
          <View style={styles.muscles}>
            {(ex.muscleGroup || []).map((m, i) => (
              <View key={i} style={styles.muscleTag}>
                <Text style={styles.muscleText}>{m}</Text>
              </View>
            ))}
          </View>
        </View>

        {ex.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sobre o exercício</Text>
            <Text style={styles.description}>{ex.description}</Text>
          </View>
        )}

        {ex.instructions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Como executar</Text>
            {ex.instructions.map((step, i) => (
              <View key={i} style={styles.instructionRow}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                <Text style={styles.instructionText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {ex.tips && (
          <View style={styles.tipCard}>
            <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Dica do personal</Text>
              <Text style={styles.tipText}>{ex.tips}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: SPACING.lg },
  backBtn: { padding: SPACING.xs },
  content: { padding: SPACING.lg, paddingTop: 0, paddingBottom: SPACING.xxl, gap: SPACING.lg },
  hero: { alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.md },
  heroIcon: { width: 80, height: 80, borderRadius: RADIUS.xl, backgroundColor: '#1A1700', justifyContent: 'center', alignItems: 'center' },
  heroName: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white, textAlign: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, justifyContent: 'center' },
  tag: { backgroundColor: '#1A1700', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 4 },
  tagText: { fontSize: FONTS.sizes.xs, color: COLORS.primary, fontWeight: '500' },
  configRow: { flexDirection: 'row', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  configItem: { flex: 1, padding: SPACING.md, alignItems: 'center', gap: 4 },
  configItemBorder: { borderRightWidth: 1, borderRightColor: COLORS.border },
  configValue: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.primary },
  configLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  section: { gap: SPACING.sm },
  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  muscles: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  muscleTag: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.border },
  muscleText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  description: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 24 },
  instructionRow: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start' },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1A1700', justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 2 },
  stepNumText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },
  instructionText: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 24 },
  tipCard: { flexDirection: 'row', gap: SPACING.md, backgroundColor: '#141200', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#2A2400', padding: SPACING.md },
  tipTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  tipText: { fontSize: FONTS.sizes.sm, color: '#C8A800', lineHeight: 20 },
});
