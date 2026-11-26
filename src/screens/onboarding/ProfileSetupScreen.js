import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { MAX_NAME_LENGTH, isUsableName, cleanName } from '../../utils/accountName';
import { CONDOMINIOS, CONDOMINIO_PADRAO } from '../../data/condominios';

const GOALS = [
  { id: 'lose_weight', label: 'Emagrecer', sub: 'Mais cardio e descansos curtos na série', icon: 'trending-down-outline' },
  { id: 'gain_muscle', label: 'Ganhar massa', sub: 'Hipertrofia e aumento de força', icon: 'barbell-outline' },
  { id: 'maintain', label: 'Condicionamento', sub: 'Manter forma e melhorar resistência', icon: 'pulse-outline' },
  { id: 'health', label: 'Saúde geral', sub: 'Bem-estar e qualidade de vida', icon: 'heart-outline' },
];

export default function ProfileSetupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { accountName } = useApp();
  // Nome já conhecido (cadastro ou Google/Apple): a pergunta é pulada. Desconhecido: pergunta UMA vez, com o campo vazio.
  const nameKnown = isUsableName(accountName);
  const [typed, setTyped] = useState('');
  const name = nameKnown ? cleanName(accountName) : typed;
  const setName = setTyped;
  const [goals, setGoals] = useState([]);
  const [condominio, setCondominio] = useState(CONDOMINIO_PADRAO);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleGoal = (id) => {
    setGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const canContinue = !!condominio && isUsableName(name) && goals.length > 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
          {navigation.canGoBack() ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Voltar">
              <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : <View />}
          <View style={styles.stepDots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        <Text style={styles.title}>Vamos começar</Text>
        <Text style={styles.sub}>{nameKnown ? 'Qual é o seu objetivo?' : 'Como você se chama e qual é o seu objetivo?'}</Text>

        {/* Condomínio Duo Fitness */}
        <View style={styles.field}>
          <Text style={styles.label}>SEU CONDOMÍNIO</Text>
          <Text style={styles.multiHint}>Selecione onde você treina</Text>
          <TouchableOpacity
            style={[styles.condoBtn, dropdownOpen && styles.condoBtnOpen]}
            onPress={() => setDropdownOpen(prev => !prev)}
            activeOpacity={0.8}
            accessibilityRole="combobox"
            accessibilityLabel={`Condomínio selecionado: ${condominio?.nome || 'Nenhum'}`}
          >
            <View style={styles.condoLeft}>
              <View style={styles.condoIcon}>
                <Ionicons name="business-outline" size={20} color={COLORS.textSecondary} />
              </View>
              <View style={styles.condoTextWrap}>
                <Text style={styles.condoName}>{condominio?.nome || 'Selecione seu condomínio'}</Text>
                <Text style={styles.condoSub}>{`Combo ${condominio?.comboLabel || 'TRIPLE'} · Duo Fitness`}</Text>
              </View>
            </View>
            <Ionicons name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {dropdownOpen && (
            <View style={styles.dropdownList}>
              {CONDOMINIOS.map(c => {
                const isSelected = condominio?.id === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                    onPress={() => {
                      setCondominio(c);
                      setDropdownOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={styles.dropdownItemLeft}>
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={isSelected ? COLORS.white : COLORS.textMuted}
                      />
                      <View>
                        <Text style={[styles.dropdownItemName, isSelected && styles.dropdownItemNameActive]}>
                          {c.nome}
                        </Text>
                        <Text style={styles.dropdownItemSub}>{c.descricao}</Text>
                      </View>
                    </View>
                    <View style={styles.comboBadge}>
                      <Text style={styles.comboBadgeText}>{c.comboLabel}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {nameKnown ? (
          <Text style={styles.greetName} accessibilityRole="header" testID="ob-name-known">{`Olá, ${name.split(' ')[0]}!`}</Text>
        ) : (
        <View style={styles.field}>
          <Text style={styles.label}>SEU NOME</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Como posso te chamar?"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="words"
            maxLength={MAX_NAME_LENGTH}
            testID="ob-name"
            accessibilityLabel="Seu nome"
            textContentType="name"
            autoComplete="name"
            returnKeyType="done"
          />
        </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>OBJETIVOS</Text>
          <Text style={styles.multiHint}>Pode escolher mais de um</Text>
          <View style={styles.goals}>
            {GOALS.map(g => {
              const selected = goals.includes(g.id);
              return (
                <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: selected }}
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

        <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !canContinue }}
          style={[styles.btn, !canContinue && styles.btnDisabled]}
          onPress={() => canContinue && navigation.navigate('BodyData', { name, goals, condominio: condominio?.nome, combo: condominio?.combo })}
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
  multiHint: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: -SPACING.xs, marginBottom: SPACING.sm },
  condoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  condoBtnOpen: {
    borderColor: COLORS.border,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  condoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  condoIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgCardAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  condoTextWrap: {
    flex: 1,
  },
  condoName: {
    fontSize: FONTS.sizes.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  condoSub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  dropdownList: {
    backgroundColor: COLORS.bgCardAlt,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: COLORS.border,
    borderBottomLeftRadius: RADIUS.md,
    borderBottomRightRadius: RADIUS.md,
    padding: SPACING.xs,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  dropdownItemActive: {
    backgroundColor: COLORS.bgCard,
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  dropdownItemName: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dropdownItemNameActive: {
    color: COLORS.white,
  },
  dropdownItemSub: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  comboBadge: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  comboBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  greetName: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.white, marginBottom: SPACING.lg },
  input: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.white, fontSize: FONTS.sizes.md },
  goals: { gap: SPACING.sm },
  goalCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md },
  goalCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.bgCardAlt },
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
