import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { generateWorkoutPlan } from '../utils/workoutGenerator';
import { COMBOS, getComboEquipment } from '../data/combosEquipment';
import InfoButton from '../components/InfoButton';

const GOAL_LABELS = {
  lose_weight: 'Emagrecimento',
  gain_muscle: 'Hipertrofia',
  maintain: 'Condicionamento',
  health: 'Saúde geral',
};

function formatGoals(goals) {
  if (!goals || goals.length === 0) return 'Saúde geral';
  return goals.map(g => GOAL_LABELS[g] || g).join(' + ');
}

const QUESTIONS = [
  {
    id: 'days',
    question: 'Quantos dias por semana você pode treinar?',
    sub: 'Seja realista — consistência vale mais que frequência.',
    options: [
      { value: 2, label: '2 dias', sub: 'Séries A e B' },
      { value: 3, label: '3 dias', sub: 'Séries A, B e C' },
      { value: 4, label: '4 dias', sub: 'Volume alto' },
      { value: 5, label: '5 dias', sub: 'Nível avançado' },
    ],
  },
  {
    id: 'time',
    question: 'Quanto tempo você tem por sessão?',
    sub: 'Incluindo aquecimento e descanso entre séries.',
    options: [
      { value: 30, label: '30 minutos', sub: 'Treino rápido e eficiente' },
      { value: 45, label: '45 minutos', sub: 'Equilibrado' },
      { value: 60, label: '60 minutos', sub: 'Volume completo' },
      { value: 90, label: '90 minutos', sub: 'Sessão longa' },
    ],
  },
  {
    id: 'combo',
    question: 'Qual combo Duo Fitness tem no seu condomínio?',
    sub: 'Isso define quais equipamentos e máquinas entram no seu treino.',
    options: COMBOS.map(c => ({ value: c.id, label: c.label, sub: c.description })),
  },
  {
    id: 'focus',
    question: 'Qual área você quer priorizar?',
    sub: 'O plano será balanceado mas com ênfase no que você escolher.',
    options: [
      { value: 'full', label: 'Corpo todo', sub: 'Desenvolvimento equilibrado' },
      { value: 'upper', label: 'Parte superior', sub: 'Peito, costas, ombros e braços' },
      { value: 'lower', label: 'Parte inferior', sub: 'Pernas e glúteos' },
      { value: 'core', label: 'Core e abdômen', sub: 'Força e estabilidade do tronco' },
    ],
  },
  {
    id: 'limitation',
    question: 'Você tem alguma limitação física?',
    sub: 'Isso evita exercícios que possam causar lesões ou desconforto.',
    options: [
      { value: 'none', label: 'Nenhuma', sub: 'Estou bem fisicamente' },
      { value: 'knee', label: 'Problema no joelho', sub: 'Evitar impacto nas pernas' },
      { value: 'shoulder', label: 'Problema no ombro', sub: 'Limitar amplitude superior' },
      { value: 'back', label: 'Problema nas costas', sub: 'Evitar compressão axial' },
    ],
  },
];

// Perguntas do gerador rápido que têm explicação ("i"): combo e limitação física.
const INFO_BY_QUESTION = { combo: 'combos', limitation: 'limitacao' };

export default function SmartPlanScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { addWorkouts, user } = useApp();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [plan, setPlan] = useState(null);

  const q = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;

  const select = (value) => {
    if (q.multi) {
      const curr = answers[q.id] || [];
      const next = curr.includes(value) ? curr.filter(v => v !== value) : [...curr, value];
      setAnswers({ ...answers, [q.id]: next });
    } else {
      setAnswers({ ...answers, [q.id]: value });
    }
  };

  const isSelected = (value) => q.multi
    ? (answers[q.id] || []).includes(value)
    : answers[q.id] === value;

  const canNext = q.multi
    ? (answers[q.id] || []).length > 0
    : answers[q.id] !== undefined;

  const next = async () => {
    if (!canNext) return;
    if (isLast) {
      setGenerating(true);
      const generated = generateWorkoutPlan({
        ...answers,
        equipment: getComboEquipment(answers.combo),
        goals: user?.goals,
        level: user?.level,
        imcCategory: user?.imcCategory,
        gender: user?.gender,
        ageGroup: user?.ageGroup,
      });
      await addWorkouts(generated);
      setPlan(generated);
      setGenerating(false);
      setDone(true);
    } else {
      setStep(s => s + 1);
    }
  };

  // Loading
  if (generating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingTitle}>Analisando seu perfil...</Text>
        <InfoButton tema="montandoSerie" />
        <Text style={styles.loadingSub}>
          Calculando suas séries para{'\n'}
          {user?.name?.split(' ')[0]} · IMC {user?.imc} · {formatGoals(user?.goals)}
        </Text>
      </View>
    );
  }

  // Resultado
  if (done && plan) {
    return (
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container} contentContainerStyle={[styles.doneContent, { paddingTop: insets.top + SPACING.sm }]}>
        <View style={styles.doneHeader}>
          <View style={styles.doneIconWrap}>
            <Ionicons name="checkmark" size={32} color={COLORS.black} />
          </View>
          <Text style={styles.doneTitle}>Plano criado!</Text>
          <Text style={styles.doneSub}>
            {plan.length} séries personalizadas para você com base no seu IMC, objetivo e nível de condicionamento.
          </Text>
        </View>

        <View style={styles.planList}>
          {plan.map((workout, i) => (
            <View key={i} style={styles.planCard}>
              <View style={styles.planSerieBadge}>
                <Text style={styles.planSerieText}>{workout.serie}</Text>
              </View>
              <View style={styles.planCardBody}>
                <Text style={styles.planSerie}>SÉRIE {workout.serie}</Text>
                <Text style={styles.planName}>{workout.name.replace(`Série ${workout.serie} — `, '')}</Text>
                <Text style={styles.planMeta}>{workout.exercises.length} exercícios · {workout.focus}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </View>
          ))}
        </View>

        {/* Notas personalizadas */}
        {plan[0]?.personalNotes?.length > 0 && (
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <Ionicons name="person-circle-outline" size={18} color={COLORS.primary} />
              <Text style={styles.notesTitle}>Recomendações para você</Text>
            </View>
            {plan[0].personalNotes.map((note, i) => (
              <View key={i} style={styles.noteRow}>
                <View style={styles.noteDot} />
                <Text style={styles.noteText}>{note}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.tipCard}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
          <Text style={styles.tipText}>
            Alterne as séries a cada sessão. Descanse pelo menos 1 dia entre treinos que trabalham o mesmo grupo muscular.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.btn}
          onPress={() => navigation.navigate('WorkoutsList')}
        >
          <Text style={styles.btnText}>Ver meus treinos</Text>
          <Ionicons name="arrow-forward" size={18} color={COLORS.black} />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Questionário
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity
          onPress={() => step > 0 ? setStep(s => s - 1) : navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <View style={styles.progressWrap}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${((step + 1) / QUESTIONS.length) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{step + 1} de {QUESTIONS.length}</Text>
        </View>
      </View>

      {/* Perfil resumido no topo */}
      {user?.imc && (
        <View style={styles.profileBanner}>
          <Ionicons name="person-outline" size={14} color={COLORS.primary} />
          <Text style={styles.profileBannerText}>
            {user.name?.split(' ')[0]} · IMC {user.imc} · {user.weight}kg · {user.height}cm
          </Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.questionRow}>
          <Text style={[styles.question, styles.questionFlex]}>{q.question}</Text>
          {INFO_BY_QUESTION[q.id] && <InfoButton tema={INFO_BY_QUESTION[q.id]} />}
        </View>
        <Text style={styles.questionSub}>{q.sub}</Text>

        <View style={styles.options}>
          {q.options.map((opt) => (
            <TouchableOpacity
              key={String(opt.value)}
              style={[styles.option, isSelected(opt.value) && styles.optionActive]}
              onPress={() => select(opt.value)}
            >
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, isSelected(opt.value) && styles.optionLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={styles.optionSub}>{opt.sub}</Text>
              </View>
              {q.multi ? (
                <View style={[styles.checkBox, isSelected(opt.value) && styles.checkBoxActive]}>
                  {isSelected(opt.value) && <Ionicons name="checkmark" size={14} color={COLORS.black} />}
                </View>
              ) : (
                <View style={[styles.radio, isSelected(opt.value) && styles.radioActive]}>
                  {isSelected(opt.value) && <View style={styles.radioDot} />}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, !canNext && styles.btnDisabled]}
          onPress={next}
          activeOpacity={canNext ? 0.85 : 1}
        >
          <Text style={styles.btnText}>{isLast ? 'Gerar meu plano' : 'Próximo'}</Text>
          <Ionicons name={isLast ? 'sparkles-outline' : 'arrow-forward'} size={18} color={COLORS.black} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.lg },
  backBtn: { padding: SPACING.xs },
  progressWrap: { flex: 1, gap: 6 },
  progressBg: { height: 3, backgroundColor: COLORS.border, borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  progressText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  profileBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginHorizontal: SPACING.lg, backgroundColor: '#1A1700', borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 6, marginBottom: SPACING.xs },
  profileBannerText: { fontSize: FONTS.sizes.xs, color: COLORS.primary, fontWeight: '500' },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  questionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs },
  questionFlex: { flex: 1 },
  question: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.white, marginBottom: SPACING.xs, lineHeight: 30 },
  questionSub: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.xl, lineHeight: 20 },
  options: { gap: SPACING.sm },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, gap: SPACING.md },
  optionActive: { borderColor: COLORS.primary, backgroundColor: '#141200' },
  optionText: { flex: 1 },
  optionLabel: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textSecondary },
  optionLabelActive: { color: COLORS.white },
  optionSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  checkBoxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: COLORS.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  footer: { padding: SPACING.lg, paddingBottom: SPACING.xl },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: SPACING.md },
  btnDisabled: { opacity: 0.35 },
  btnText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.black },
  loadingContainer: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', gap: SPACING.md, padding: SPACING.xl },
  loadingTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.white },
  loadingSub: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 },
  doneContent: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  doneHeader: { alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xl },
  doneIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
  doneTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },
  doneSub: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  planList: { gap: SPACING.sm, marginBottom: SPACING.md },
  planCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  planSerieBadge: { width: 44, height: 44, borderRadius: RADIUS.sm, backgroundColor: '#1A1700', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  planSerieText: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.primary },
  planCardBody: { flex: 1, gap: 2 },
  planSerie: { fontSize: FONTS.sizes.xs, color: COLORS.primary, fontWeight: '700', letterSpacing: 1.5 },
  planName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.white },
  planMeta: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  notesCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.md, gap: SPACING.sm },
  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  notesTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  noteDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.primary, marginTop: 7, flexShrink: 0 },
  noteText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },
  tipCard: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start', backgroundColor: '#0D1117', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#1A2332', padding: SPACING.md, marginBottom: SPACING.xl },
  tipText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },
});
