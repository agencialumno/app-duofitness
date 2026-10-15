import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { calculateIMC, getIMCCategory } from '../../utils/imc';

const GENDERS = [
  { id: 'male', label: 'Masculino', icon: 'man-outline' },
  { id: 'female', label: 'Feminino', icon: 'woman-outline' },
];

const AGE_GROUPS = [
  { id: 'under18', label: 'Menor de 18' },
  { id: '18-25', label: '18–25 anos' },
  { id: '26-35', label: '26–35 anos' },
  { id: '36-45', label: '36–45 anos' },
  { id: '46+',   label: '46+ anos' },
];

export default function BodyDataScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { name, goals } = route.params;

  const [gender, setGender] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  const imc = weight && height ? calculateIMC(parseFloat(weight), parseFloat(height)) : null;
  const imcInfo = imc ? getIMCCategory(imc) : null;

  const canContinue = gender && ageGroup && weight && height &&
    parseFloat(weight) > 0 && parseFloat(height) > 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.stepDots}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        <Text style={styles.title}>Dados físicos</Text>
        <Text style={styles.sub}>Usamos isso para calcular seu IMC e personalizar a intensidade dos treinos.</Text>

        {/* Gênero */}
        <View style={styles.field}>
          <Text style={styles.label}>SEXO BIOLÓGICO</Text>
          <View style={styles.genderRow}>
            {GENDERS.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[styles.genderCard, gender === g.id && styles.genderCardActive]}
                onPress={() => setGender(g.id)}
              >
                <Ionicons name={g.icon} size={24} color={gender === g.id ? COLORS.black : COLORS.textSecondary} />
                <Text style={[styles.genderLabel, gender === g.id && styles.genderLabelActive]}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Faixa etária */}
        <View style={styles.field}>
          <Text style={styles.label}>FAIXA ETÁRIA</Text>
          <View style={styles.ageGrid}>
            {AGE_GROUPS.map(a => (
              <TouchableOpacity
                key={a.id}
                style={[styles.ageCard, ageGroup === a.id && styles.ageCardActive]}
                onPress={() => setAgeGroup(a.id)}
              >
                <Text style={[styles.ageLabel, ageGroup === a.id && styles.ageLabelActive]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {ageGroup === 'under18' && (
            <Text style={styles.minorNote}>Recomendamos que o treino de menores de 18 anos seja acompanhado por um responsável ou profissional.</Text>
          )}
        </View>

        {/* Peso e altura */}
        <View style={styles.field}>
          <Text style={styles.label}>MEDIDAS</Text>
          <View style={styles.measuresRow}>
            <View style={styles.measureWrap}>
              <Text style={styles.measureLabel}>Peso</Text>
              <View style={styles.measureInput}>
                <TextInput
                  style={styles.measureText}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="70"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  maxLength={5}
                />
                <Text style={styles.measureUnit}>kg</Text>
              </View>
            </View>
            <View style={styles.measureDivider} />
            <View style={styles.measureWrap}>
              <Text style={styles.measureLabel}>Altura</Text>
              <View style={styles.measureInput}>
                <TextInput
                  style={styles.measureText}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="170"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.measureUnit}>cm</Text>
              </View>
            </View>
          </View>
        </View>

        {/* IMC Preview */}
        {imc && imcInfo && (
          <View style={[styles.imcCard, { borderColor: imcInfo.color + '44' }]}>
            <View style={styles.imcLeft}>
              <Text style={styles.imcLabel}>SEU IMC</Text>
              <Text style={[styles.imcValue, { color: imcInfo.color }]}>{imc.toFixed(1)}</Text>
              <Text style={[styles.imcCategory, { color: imcInfo.color }]}>{imcInfo.label}</Text>
            </View>
            <View style={styles.imcRight}>
              <Ionicons name={imcInfo.icon} size={36} color={imcInfo.color} />
              <Text style={styles.imcTip}>{imcInfo.tip}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btn, !canContinue && styles.btnDisabled]}
          onPress={() => canContinue && navigation.navigate('LevelSelect', {
            name, goals, gender, ageGroup,
            weight: parseFloat(weight),
            height: parseFloat(height),
            imc: imc?.toFixed(1),
            imcCategory: imcInfo?.id,
          })}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xl },
  backBtn: { padding: SPACING.xs },
  stepDots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.primary, width: 20 },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white, marginBottom: SPACING.xs },
  sub: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginBottom: SPACING.xl, lineHeight: 22 },
  field: { marginBottom: SPACING.xl },
  label: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginBottom: SPACING.sm, fontWeight: '600', letterSpacing: 1.5 },
  genderRow: { flexDirection: 'row', gap: SPACING.sm },
  genderCard: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md },
  genderCardActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  genderLabel: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textSecondary },
  genderLabelActive: { color: COLORS.black },
  ageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  ageCard: { width: '47%', backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  ageCardActive: { borderColor: COLORS.primary, backgroundColor: '#141200' },
  ageLabel: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textSecondary },
  ageLabelActive: { color: COLORS.primary },
  minorNote: { fontSize: FONTS.sizes.xs, color: COLORS.warning, marginTop: SPACING.sm, lineHeight: 16 },
  measuresRow: { flexDirection: 'row', backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, overflow: 'hidden' },
  measureWrap: { flex: 1, padding: SPACING.md, alignItems: 'center', gap: 4 },
  measureDivider: { width: 1, backgroundColor: COLORS.border },
  measureLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 1 },
  measureInput: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  measureText: { fontSize: 32, fontWeight: '700', color: COLORS.white, textAlign: 'center', minWidth: 60 },
  measureUnit: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, fontWeight: '500' },
  imcCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg, marginBottom: SPACING.lg },
  imcLeft: { gap: 4 },
  imcLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 1.5 },
  imcValue: { fontSize: 40, fontWeight: '700', lineHeight: 44 },
  imcCategory: { fontSize: FONTS.sizes.md, fontWeight: '600' },
  imcRight: { alignItems: 'center', gap: SPACING.sm, flex: 1, paddingLeft: SPACING.lg },
  imcTip: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: SPACING.md },
  btnDisabled: { opacity: 0.35 },
  btnText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.black },
});
