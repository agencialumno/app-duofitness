import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { generateWorkoutPlan } from '../utils/workoutGenerator';
import { calculateIMC, getIMCCategory } from '../utils/imc';
import { COMBOS, getComboEquipment } from '../data/combosEquipment';

// Este roteiro roda 100% no aparelho, sem depender de internet — pensado para
// funcionar de forma confiável em feiras/eventos. O texto e o comportamento
// são os mesmos de uma conversa com IA real; o motor de geração de treino
// (workoutGenerator.js) é o mesmo usado no restante do app.
//
// Peso, altura, objetivos e nível são reaproveitados do perfil quando já
// existem (coletados no onboarding) — só perguntamos o que ainda falta.

const GOAL_OPTIONS = [
  { id: 'lose_weight', label: 'Emagrecer', keywords: ['emagre', 'perder peso', 'queimar', 'secar'] },
  { id: 'gain_muscle', label: 'Ganhar massa', keywords: ['massa', 'hipertro', 'muscul', 'força', 'forca'] },
  { id: 'maintain', label: 'Condicionamento', keywords: ['condic', 'resistê', 'resist', 'fôlego', 'folego'] },
  { id: 'health', label: 'Saúde geral', keywords: ['saúde', 'saude', 'bem-estar', 'bem estar', 'qualidade de vida'] },
];

const LEVEL_OPTIONS = [
  { id: 'beginner', label: 'Iniciante', keywords: ['inici', 'começando', 'comecando', 'novo no treino', 'nunca treinei'] },
  { id: 'intermediate', label: 'Intermediário', keywords: ['intermed'] },
  { id: 'advanced', label: 'Avançado', keywords: ['avan'] },
];

const LIMITATION_OPTIONS = [
  { id: 'none', label: 'Nenhuma', keywords: ['nenhuma', 'não tenho', 'nao tenho', 'sem limita', 'sem lesão', 'sem lesao'] },
  { id: 'knee', label: 'Joelho', keywords: ['joelho'] },
  { id: 'shoulder', label: 'Ombro', keywords: ['ombro'] },
  { id: 'back', label: 'Lombar/Costas', keywords: ['lombar', 'costas'] },
];

const COMBO_OPTIONS = COMBOS.map(c => ({ id: c.id, label: c.label, keywords: [c.id, c.label.toLowerCase()] }));

function matchMulti(text, options) {
  const t = text.toLowerCase();
  return options.filter(o => o.keywords.some(k => t.includes(k))).map(o => o.id);
}

function matchSingle(text, options) {
  return matchMulti(text, options)[0];
}

function extractNumbers(text) {
  const found = text.match(/\d+(?:[.,]\d+)?/g);
  return found ? found.map(n => parseFloat(n.replace(',', '.'))) : [];
}

const STEP_BODY = {
  id: 'body',
  chips: null,
  ask: () => 'Para começar, me conta: qual é o seu peso (kg) e altura (cm)? Pode responder assim: "78, 175".',
  parse: (text) => {
    const nums = extractNumbers(text);
    if (nums.length < 2) {
      return { ok: false, message: 'Não consegui entender. Pode responder no formato "peso, altura"? Ex: 78, 175' };
    }
    return { ok: true, data: { weight: nums[0], height: nums[1] } };
  },
};

const STEP_GOALS = {
  id: 'goals',
  multi: true,
  chips: GOAL_OPTIONS,
  ask: () => 'Qual é o seu objetivo principal? Você pode escolher mais de um — toque nas opções abaixo ou escreva.',
  parse: (text) => {
    const found = matchMulti(text, GOAL_OPTIONS);
    if (found.length === 0) {
      return {
        ok: true,
        data: { goals: ['health'] },
        note: 'Não identifiquei um objetivo específico no que você escreveu, então vou considerar "Saúde geral" por enquanto — dá pra ajustar depois no seu perfil.',
      };
    }
    return { ok: true, data: { goals: found } };
  },
};

const STEP_SCHEDULE = {
  id: 'schedule',
  chips: null,
  ask: () => 'Quantos dias por semana você pode treinar, e quantos minutos por sessão? Ex: "3 dias, 45 minutos".',
  parse: (text) => {
    const nums = extractNumbers(text);
    if (nums.length === 0) {
      return { ok: false, message: 'Não consegui pegar os números. Pode responder assim: "3 dias, 45 minutos"?' };
    }
    const days = Math.min(Math.max(Math.round(nums[0]), 1), 5);
    const time = nums[1] ? Math.round(nums[1]) : 45;
    return { ok: true, data: { days, time } };
  },
};

const STEP_COMBO = {
  id: 'combo',
  chips: COMBO_OPTIONS,
  ask: () => 'Qual combo Duo Fitness vocês têm no condomínio? Isso me diz quais máquinas estão disponíveis pro seu treino.',
  parse: (text) => {
    const found = matchSingle(text, COMBO_OPTIONS);
    if (!found) {
      return { ok: false, message: 'Não reconheci esse combo. Pode responder UNO, DUO, TRIPLE, PRIME ou ELITE?' };
    }
    return { ok: true, data: { combo: found, equipment: getComboEquipment(found) } };
  },
};

const STEP_LEVEL = {
  id: 'level',
  chips: LEVEL_OPTIONS,
  ask: () => 'Qual é o seu nível de experiência? Iniciante, intermediário ou avançado?',
  parse: (text) => {
    const found = matchSingle(text, LEVEL_OPTIONS);
    if (!found) {
      return { ok: true, data: { level: 'intermediate' }, note: 'Não identifiquei bem o nível — vou considerar "Intermediário" por padrão.' };
    }
    return { ok: true, data: { level: found } };
  },
};

const STEP_LIMITATION = {
  id: 'limitation',
  chips: LIMITATION_OPTIONS,
  ask: () => 'Por último: alguma limitação física ou lesão que eu deva considerar? Pode ser joelho, ombro, lombar, ou "nenhuma".',
  parse: (text) => {
    const found = matchSingle(text, LIMITATION_OPTIONS);
    return { ok: true, data: { limitation: found || 'none' } };
  },
};

// Monta a lista de perguntas pulando o que já existe no perfil do usuário
// (coletado no onboarding: peso, altura, objetivos e nível).
function buildSteps(user) {
  const steps = [];
  const known = {};

  if (user?.weight && user?.height) {
    known.weight = user.weight;
    known.height = user.height;
  } else {
    steps.push(STEP_BODY);
  }

  if (user?.goals && user.goals.length > 0) {
    known.goals = user.goals;
  } else {
    steps.push(STEP_GOALS);
  }

  steps.push(STEP_SCHEDULE, STEP_COMBO);

  if (user?.level) {
    known.level = user.level;
  } else {
    steps.push(STEP_LEVEL);
  }

  steps.push(STEP_LIMITATION);

  return { steps, known };
}

const INTRO_MESSAGE =
  'Olá! Eu sou seu personal trainer virtual da Duo Fitness. 💪\nVou te fazer algumas perguntas rápidas para montar suas Séries A, B e C sob medida.';

export default function AIPersonalTrainerScreen({ navigation }) {
  const { addWorkouts, saveUser, user } = useApp();
  const [{ steps: STEP_LIST, known: KNOWN_ANSWERS }] = useState(() => buildSteps(user));
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState(KNOWN_ANSWERS);
  const [chipSelection, setChipSelection] = useState([]);
  const [finalPlan, setFinalPlan] = useState(null);
  const [planSaved, setPlanSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    startConversation();
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, loading]);

  const pushAI = (text, extra = {}) => {
    setMessages(prev => [...prev, { role: 'assistant', content: text, ...extra }]);
  };
  const pushUser = (text) => {
    setMessages(prev => [...prev, { role: 'user', content: text }]);
  };

  const startConversation = () => {
    setLoading(true);
    const knownParts = [];
    if (KNOWN_ANSWERS.weight && KNOWN_ANSWERS.height) knownParts.push(`peso e altura (${KNOWN_ANSWERS.weight}kg, ${KNOWN_ANSWERS.height}cm)`);
    if (KNOWN_ANSWERS.goals) knownParts.push('seus objetivos');
    if (KNOWN_ANSWERS.level) knownParts.push('seu nível de experiência');
    const knownNote = knownParts.length > 0
      ? ` Já peguei ${knownParts.join(', ')} do seu perfil, então vamos direto ao que falta. Bora?`
      : ' Vamos lá?';

    setTimeout(() => {
      pushAI(`${INTRO_MESSAGE}${knownNote}\n\n${STEP_LIST[0].ask()}`);
      setLoading(false);
    }, 700);
  };

  const finalizePlan = (allAnswers) => {
    setLoading(true);
    setTimeout(() => {
      const imc = calculateIMC(allAnswers.weight, allAnswers.height);
      const imcInfo = imc ? getIMCCategory(imc) : null;

      const generated = generateWorkoutPlan({
        goals: allAnswers.goals,
        level: allAnswers.level,
        days: allAnswers.days,
        time: allAnswers.time,
        equipment: allAnswers.equipment,
        limitation: allAnswers.limitation,
        imcCategory: imcInfo?.id,
        gender: user?.gender,
        ageGroup: user?.ageGroup,
      }).map(w => ({ ...w, generatedByAI: true }));

      const plan = {
        imc: imc ? imc.toFixed(1) : null,
        imcCategoria: imcInfo?.id,
        series: generated.map(w => ({
          serie: w.serie,
          nome: w.name,
          foco: w.focus,
          exercicios: w.exercises,
        })),
        workouts: generated,
      };

      pushAI('Prontinho! Montei suas 3 séries com base no que você me contou. Dá uma olhada:', { plan });
      setFinalPlan(plan);
      setLoading(false);
    }, 1200);
  };

  const handleAnswer = (rawText) => {
    const step = STEP_LIST[stepIndex];
    if (!step) return;
    const trimmed = rawText.trim();
    if (!trimmed) return;

    pushUser(trimmed);
    setInput('');
    setChipSelection([]);
    setLoading(true);

    setTimeout(() => {
      const result = step.parse(trimmed);
      if (!result.ok) {
        pushAI(result.message);
        setLoading(false);
        return;
      }

      const updatedAnswers = { ...answers, ...result.data };
      setAnswers(updatedAnswers);

      if (result.note) pushAI(result.note);

      const nextIndex = stepIndex + 1;
      if (nextIndex < STEP_LIST.length) {
        setStepIndex(nextIndex);
        pushAI(STEP_LIST[nextIndex].ask());
        setLoading(false);
      } else {
        setLoading(false);
        finalizePlan(updatedAnswers);
      }
    }, 500);
  };

  const sendMessage = () => {
    if (!input.trim() || loading || finalPlan) return;
    handleAnswer(input);
  };

  const toggleChip = (id) => {
    setChipSelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const confirmChips = () => {
    const step = STEP_LIST[stepIndex];
    if (!step?.chips) return;
    const labels = step.chips.filter(o => chipSelection.includes(o.id)).map(o => o.label);
    if (labels.length === 0) return;
    handleAnswer(labels.join(', '));
  };

  const tapSingleChip = (option) => {
    handleAnswer(option.label);
  };

  const savePlan = async () => {
    if (!finalPlan) return;
    setSaving(true);
    try {
      await addWorkouts(finalPlan.workouts);
      if (finalPlan.imc && user) {
        await saveUser({ ...user, imc: finalPlan.imc, imcCategory: finalPlan.imcCategoria });
      }
      setPlanSaved(true);
    } catch (e) {
      console.log('Erro ao salvar plano:', e);
    }
    setSaving(false);
  };

  const currentStep = !finalPlan ? STEP_LIST[stepIndex] : null;

  const renderMessage = (msg, i) => {
    const isAI = msg.role === 'assistant';
    const plan = msg.plan;

    return (
      <View key={i} style={[styles.msgRow, isAI ? styles.msgRowAI : styles.msgRowUser]}>
        {isAI && (
          <View style={styles.aiAvatar}>
            <Ionicons name="fitness-outline" size={14} color={COLORS.black} />
          </View>
        )}
        <View style={[styles.bubble, isAI ? styles.bubbleAI : styles.bubbleUser]}>
          {msg.content ? (
            <Text style={[styles.bubbleText, isAI ? styles.bubbleTextAI : styles.bubbleTextUser]}>
              {msg.content}
            </Text>
          ) : null}

          {plan && (
            <View style={styles.planPreview}>
              <View style={styles.planPreviewHeader}>
                <Ionicons name="sparkles" size={16} color={COLORS.primary} />
                <Text style={styles.planPreviewTitle}>Plano criado pelo personal!</Text>
              </View>
              {plan.series.map((s, si) => (
                <View key={si} style={styles.planSerieRow}>
                  <View style={styles.planSerieBadge}>
                    <Text style={styles.planSerieText}>{s.serie}</Text>
                  </View>
                  <View>
                    <Text style={styles.planSerieName}>{s.nome}</Text>
                    <Text style={styles.planSerieMeta}>{s.exercicios.length} exercícios · {s.foco}</Text>
                  </View>
                </View>
              ))}
              {!planSaved ? (
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={savePlan}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={COLORS.black} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color={COLORS.black} />
                      <Text style={styles.saveBtnText}>Salvar meu plano de treino</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.goBtn}
                  onPress={() => navigation.navigate('WorkoutsList')}
                >
                  <Ionicons name="barbell-outline" size={18} color={COLORS.black} />
                  <Text style={styles.saveBtnText}>Ver meus treinos</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Personal Trainer IA</Text>
            <View style={styles.onlineDot} />
          </View>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && loading && (
            <View style={styles.loadingStart}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.loadingText}>Conectando com seu personal...</Text>
            </View>
          )}
          {messages.map(renderMessage)}
          {loading && messages.length > 0 && (
            <View style={[styles.msgRow, styles.msgRowAI]}>
              <View style={styles.aiAvatar}>
                <Ionicons name="fitness-outline" size={14} color={COLORS.black} />
              </View>
              <View style={[styles.bubble, styles.bubbleAI, styles.typingBubble]}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            </View>
          )}
        </ScrollView>

        {currentStep?.chips && !loading && (
          <View style={styles.chipsRow}>
            {currentStep.chips.map(opt => {
              const active = currentStep.multi ? chipSelection.includes(opt.id) : false;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => (currentStep.multi ? toggleChip(opt.id) : tapSingleChip(opt))}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
            {currentStep.multi && (
              <TouchableOpacity
                style={[styles.chipConfirm, chipSelection.length === 0 && styles.chipConfirmDisabled]}
                onPress={confirmChips}
                disabled={chipSelection.length === 0}
              >
                <Ionicons name="checkmark" size={18} color={COLORS.black} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={finalPlan ? 'Conversa finalizada' : 'Digite sua resposta...'}
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={300}
            editable={!finalPlan}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading || finalPlan) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || loading || !!finalPlan}
          >
            <Ionicons name="send" size={18} color={(!input.trim() || loading || finalPlan) ? COLORS.textMuted : COLORS.black} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: SPACING.xs },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  headerTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  messages: { flex: 1 },
  messagesContent: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xl },
  loadingStart: { alignItems: 'center', gap: SPACING.md, paddingTop: SPACING.xxl },
  loadingText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  msgRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start' },
  msgRowUser: { justifyContent: 'flex-end' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginBottom: 2 },
  bubble: { maxWidth: '82%', borderRadius: RADIUS.lg, padding: SPACING.md },
  bubbleAI: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: '#1A1700', borderWidth: 1, borderColor: '#3A2A00', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: FONTS.sizes.md, lineHeight: 22 },
  bubbleTextAI: { color: COLORS.textPrimary },
  bubbleTextUser: { color: COLORS.primary },
  typingBubble: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg },
  planPreview: { marginTop: SPACING.sm, gap: SPACING.sm },
  planPreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs },
  planPreviewTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },
  planSerieRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bgCardAlt, borderRadius: RADIUS.sm, padding: SPACING.sm },
  planSerieBadge: { width: 32, height: 32, borderRadius: RADIUS.xs, backgroundColor: '#1A1700', justifyContent: 'center', alignItems: 'center' },
  planSerieText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.primary },
  planSerieName: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.white },
  planSerieMeta: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: SPACING.sm, marginTop: SPACING.xs },
  goBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.success, borderRadius: RADIUS.full, paddingVertical: SPACING.sm, marginTop: SPACING.xs },
  saveBtnText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.black },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm, alignItems: 'center' },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextActive: { color: COLORS.black, fontWeight: '700' },
  chipConfirm: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  chipConfirmDisabled: { backgroundColor: COLORS.bgCard },
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm, padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.bg },
  input: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, color: COLORS.white, fontSize: FONTS.sizes.md, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: COLORS.bgCard },
});