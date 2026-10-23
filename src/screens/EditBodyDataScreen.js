import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { calculateIMC, getIMCCategory } from '../utils/imc';
import InfoButton from '../components/InfoButton';
import { buildImcSheet, showImcCategory } from '../utils/imcInfo';

const GENDERS = [
  { id: 'male', label: 'Masculino', icon: 'man-outline' },
  { id: 'female', label: 'Feminino', icon: 'woman-outline' },
];

const AGE_GROUPS = [
  { id: 'under18', label: 'Menor de 18' },
  { id: '18-25', label: '18–25 anos' },
  { id: '26-35', label: '26–35 anos' },
  { id: '36-45', label: '36–45 anos' },
  { id: '46+', label: '46+ anos' },
];

export default function EditBodyDataScreen({ navigation }) {
  const { user, saveUser } = useApp();

  const [gender, setGender] = useState(user?.gender || '');
  const [ageGroup, setAgeGroup] = useState(user?.ageGroup || '');
  const [weight, setWeight] = useState(user?.weight ? String(user.weight) : '');
  const [height, setHeight] = useState(user?.height ? String(user.height) : '');

  const imc = weight && height ? calculateIMC(parseFloat(weight), parseFloat(height)) : null;
  const imcInfo = imc ? getIMCCategory(imc) : null;
  // Menor de 18 anos: sem rótulo, dica, cor nem ícone de categoria e sem a tabela de referência de adultos.
  const imcCategoryVisible = showImcCategory(ageGroup);

  const canSave = weight && height && parseFloat(weight) > 0 && parseFloat(height) > 0;

  const save = async () => {
    if (!canSave) return;
    await saveUser({
      ...user,
      gender,
      ageGroup,
      weight: parseFloat(weight),
      height: parseFloat(height),
      imc: imc?.toFixed(1),
      imcCategory: imcInfo?.id,
    });
    Alert.alert('Salvo!', 'Seus dados físicos foram atualizados.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dados Físicos</Text>
          <TouchableOpacity onPress={save} disabled={!canSave}>
            <Text style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}>Salvar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          {/* Peso e altura */}
          <View style={styles.field}>
            <Text style={styles.label}>PESO E ALTURA</Text>
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

          {/* IMC em tempo real */}
          {imc && imcInfo && (
            <View style={[styles.imcCard, { borderColor: imcCategoryVisible ? imcInfo.color + '55' : COLORS.border }]}>
              <View style={styles.imcLeft}>
                <View style={styles.imcLabelRow}>
                  <Text style={styles.imcLabel}>SEU IMC</Text>
                  <InfoButton tema="imc" blocks={buildImcSheet({ weight, height, ageGroup }).blocks} />
                </View>
                <Text style={[styles.imcValue, { color: imcCategoryVisible ? imcInfo.color : COLORS.white }]}>{imc.toFixed(1)}</Text>
                {imcCategoryVisible && <Text style={[styles.imcCategory, { color: imcInfo.color }]}>{imcInfo.label}</Text>}
              </View>
              {imcCategoryVisible && (
                <View style={styles.imcRight}>
                  <Ionicons name={imcInfo.icon} size={32} color={imcInfo.color} />
                  <Text style={styles.imcTip}>{imcInfo.tip}</Text>
                </View>
              )}
            </View>
          )}

          {/* Sexo */}
          <View style={styles.field}>
            <Text style={styles.label}>SEXO BIOLÓGICO</Text>
            <View style={styles.genderRow}>
              {GENDERS.map(g => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.genderCard, gender === g.id && styles.genderCardActive]}
                  onPress={() => setGender(g.id)}
                >
                  <Ionicons name={g.icon} size={22} color={gender === g.id ? COLORS.black : COLORS.textSecondary} />
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
          </View>

          {/* Tabela de referência (faixas de adultos: não aparece para menores de 18) */}
          {imcCategoryVisible && (
          <View style={styles.refCard}>
            <Text style={styles.refTitle}>Referência de IMC</Text>
            {[
              { range: '< 18,5', label: 'Abaixo do peso', color: '#60a5fa' },
              { range: '18,5 – 24,9', label: 'Peso normal', color: '#22c55e' },
              { range: '25,0 – 29,9', label: 'Sobrepeso', color: '#f97316' },
              { range: '30,0 – 34,9', label: 'Obesidade grau I', color: '#ef4444' },
              { range: '≥ 35,0', label: 'Obesidade grau II+', color: '#dc2626' },
            ].map((r, i) => (
              <View key={i} style={styles.refRow}>
                <View style={[styles.refDot, { backgroundColor: r.color }]} />
                <Text style={styles.refRange}>{r.range}</Text>
                <Text style={styles.refLabel}>{r.label}</Text>
              </View>
            ))}
          </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: SPACING.xs },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.white },
  saveBtn: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.primary },
  saveBtnDisabled: { opacity: 0.35 },
  content: { padding: SPACING.lg, gap: SPACING.xl, paddingBottom: SPACING.xxl },
  field: { gap: SPACING.sm },
  label: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 1.5 },
  measuresRow: { flexDirection: 'row', backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, overflow: 'hidden' },
  measureWrap: { flex: 1, padding: SPACING.lg, alignItems: 'center', gap: 6 },
  measureDivider: { width: 1, backgroundColor: COLORS.border },
  measureLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 1 },
  measureInput: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  measureText: { fontSize: 36, fontWeight: '700', color: COLORS.white, textAlign: 'center', minWidth: 70 },
  measureUnit: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, fontWeight: '500' },
  imcCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg, gap: SPACING.md },
  imcLeft: { gap: 4 },
  imcLabelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  imcLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 1.5 },
  imcValue: { fontSize: 44, fontWeight: '700', lineHeight: 48 },
  imcCategory: { fontSize: FONTS.sizes.md, fontWeight: '700' },
  imcRight: { flex: 1, alignItems: 'center', gap: SPACING.sm },
  imcTip: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18 },
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
  refCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.sm },
  refTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.xs },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  refDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  refRange: { fontSize: FONTS.sizes.sm, color: COLORS.white, fontWeight: '600', width: 100 },
  refLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
});
