import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../utils/theme';
import { Ionicons } from '@expo/vector-icons';

const GOALS = [
  { id: 'lose_weight', label: 'Emagrecer', sub: 'Queimar gordura e definir o corpo', icon: 'trending-down-outline' },
  { id: 'gain_muscle', label: 'Ganhar massa', sub: 'Hipertrofia e aumento de força', icon: 'barbell-outline' },
  { id: 'maintain', label: 'Condicionamento', sub: 'Manter forma e melhorar resistência', icon: 'pulse-outline' },
  { id: 'health', label: 'Saúde geral', sub: 'Bem-estar e qualidade de vida', icon: 'heart-outline' },
];

export default function ProfileSetupScreen({ navigation }) {
  const [name, setName] = useState('');
  const [goals, setGoals] = useState([]);

  const toggleGoal = (id) => {
    setGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const canContinue = name.trim().length > 1 && goals.length > 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.stepDots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        <Text style={styles.title}>Vamos começar</Text>
        <Text style={styles.sub}>Como você se chama e qual é o seu objetivo?</Text>

        <View style={styles.field}>
          <Text style={styles.label}>SEU NOME</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Como posso te chamar?"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="words"
            maxLength={30}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>OBJETIVOS</Text>
          <Text style={styles.multiHint}>Pode escolher mais de um</Text>
          <View style={styles.goals}>
            {GOALS.map(g => {
              const selected = goals.includes(g.id);
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.goalCard, selected && styles.goalCardActive]}
                  onPress={() => toggleGoal(g.id)}
                >
                  <View style={[styles.goalIcon, selected && styles.goalIconActive]}>
                    <Ionicons name={g.icon} size={20} color={selected ? COLORS.black : COLORS.textSecondary} />
                  </View>
                  <View style={styles.goalText}>
                    <Text style={[styles.goalLabel, selected && styles.goalLabelActive]}>{g.label}</Text>
                    <Text style={styles.goalSub}>{g.sub}</Text>
                  </View>
                  <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                    {selected && <Ionicons name="checkmark" size={14} color={COLORS.black} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btn, !canContinue && styles.btnDisabled]}
          onPress={() => canContinue && navigation.navigate('BodyData', { name, goals })}
          activeOpacity={canContinue ? 0.85 : 1}
        >
          <Text style={styles.btnText}>Continuar</Text>
          <Ionicons name="arrow-forward" size={18} color={COLORS.black} />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xl, paddingTop: SPACING.xl },
  backBtn: { padding: SPACING.xs },
  stepDots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.primary, width: 20 },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white, marginBottom: SPACING.xs },
  sub: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginBottom: SPACING.xl, lineHeight: 22 },
  field: { marginBottom: SPACING.xl },
  label: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginBottom: SPACING.sm, fontWeight: '600', letterSpacing: 1.5 },
  multiHint: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: -SPACING.xs, marginBottom: SPACING.sm },
  input: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.white, fontSize: FONTS.sizes.md },
  goals: { gap: SPACING.sm },
  goalCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md },
  goalCardActive: { borderColor: COLORS.primary, backgroundColor: '#141200' },
  goalIcon: { width: 40, height: 40, borderRadius: RADIUS.sm, backgroundColor: COLORS.bgCardAlt, justifyContent: 'center', alignItems: 'center' },
  goalIconActive: { backgroundColor: COLORS.primary },
  goalText: { flex: 1 },
  goalLabel: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textSecondary },
  goalLabelActive: { color: COLORS.white },
  goalSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: SPACING.md, marginTop: SPACING.sm },
  btnDisabled: { opacity: 0.35 },
  btnText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.black },
});
