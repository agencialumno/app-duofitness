import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { Ionicons } from '@expo/vector-icons';

const LEVELS = [
  { id: 'beginner', label: 'Iniciante', sub: 'Menos de 6 meses de treino', desc: 'Foco em técnica, adaptação e movimento correto', icon: 'leaf-outline', days: '2–3x por semana' },
  { id: 'intermediate', label: 'Intermediário', sub: '6 meses a 2 anos de treino', desc: 'Volume moderado com progressão de carga constante', icon: 'flash-outline', days: '3–4x por semana' },
  { id: 'advanced', label: 'Avançado', sub: 'Mais de 2 anos de treino', desc: 'Alta intensidade, periodização e maior volume total', icon: 'rocket-outline', days: '4–5x por semana' },
];

export default function LevelSelectScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const params = route.params;
  const [level, setLevel] = useState('');
  const { saveUser } = useApp();

  const finish = async () => {
    if (!level) return;
    await saveUser({
      ...params,
      level,
      joinedAt: new Date().toISOString(),
    });
    // o portão do app passa para o Main sozinho quando o perfil é salvo
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <View style={styles.stepDots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>
      </View>

      <Text style={styles.title}>Nível de experiência</Text>
      <Text style={styles.sub}>Isso define a intensidade, o volume e a complexidade dos exercícios.</Text>

      <View style={styles.levels}>
        {LEVELS.map(l => (
          <TouchableOpacity
            key={l.id}
            style={[styles.card, level === l.id && styles.cardActive]}
            onPress={() => setLevel(l.id)}
          >
            <View style={styles.cardTop}>
              <View style={[styles.iconWrap, level === l.id && styles.iconWrapActive]}>
                <Ionicons name={l.icon} size={22} color={level === l.id ? COLORS.black : COLORS.textSecondary} />
              </View>
              <View style={styles.cardMeta}>
                <Text style={[styles.cardLabel, level === l.id && styles.cardLabelActive]}>{l.label}</Text>
                <Text style={styles.cardSub}>{l.sub}</Text>
              </View>
              <View style={[styles.radio, level === l.id && styles.radioActive]}>
                {level === l.id && <View style={styles.radioDot} />}
              </View>
            </View>
            <View style={styles.cardBottom}>
              <Text style={styles.cardDesc}>{l.desc}</Text>
              <View style={styles.daysBadge}>
                <Ionicons name="calendar-outline" size={12} color={COLORS.primary} />
                <Text style={styles.daysText}>{l.days}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.btn, !level && styles.btnDisabled]}
        onPress={finish}
        activeOpacity={level ? 0.85 : 1}
      >
        <Text style={styles.btnText}>Criar meu perfil</Text>
        <Ionicons name="checkmark" size={18} color={COLORS.black} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xl },
  backBtn: { padding: SPACING.xs },
  stepDots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.primary, width: 20 },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white, marginBottom: SPACING.xs },
  sub: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginBottom: SPACING.xl, lineHeight: 22 },
  levels: { gap: SPACING.md, marginBottom: SPACING.xl },
  card: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.sm },
  cardActive: { borderColor: COLORS.primary, backgroundColor: '#141200' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  iconWrap: { width: 44, height: 44, borderRadius: RADIUS.sm, backgroundColor: COLORS.bgCardAlt, justifyContent: 'center', alignItems: 'center' },
  iconWrapActive: { backgroundColor: COLORS.primary },
  cardMeta: { flex: 1 },
  cardLabel: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textSecondary },
  cardLabelActive: { color: COLORS.white },
  cardSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: COLORS.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  cardBottom: { paddingLeft: 56, gap: SPACING.xs },
  cardDesc: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },
  daysBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  daysText: { fontSize: FONTS.sizes.xs, color: COLORS.primary, fontWeight: '500' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: SPACING.md },
  btnDisabled: { opacity: 0.35 },
  btnText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.black },
});
