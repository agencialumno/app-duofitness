import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { generatePlanForAge, hydratePlanForAge } from '../utils/planForAge';
import { calculateIMC, getIMCCategory } from '../utils/imc';
import { getComboEquipment } from '../data/combosEquipment';
import {
  GOAL_OPTIONS, LEVEL_OPTIONS, LIMITATION_OPTIONS, COMBO_OPTIONS,
  matchMulti, matchSingle, extractNumbers,
} from '../utils/planOptions';
import { isApiConfigured, checkHealth, chatStream } from '../services/api';

// Este roteiro roda 100% no aparelho, sem depender de internet — pensado para
// funcionar de forma confiável em feiras/eventos. O texto e o comportamento
// são os mesmos de uma conversa com IA real; o motor de geração de treino
// (workoutGenerator.js) é o mesmo usado no restante do app.
//
// Peso, altura, objetivos e nível são reaproveitados do perfil quando já
// existem (coletados no onboarding) — só perguntamos o que ainda falta.
//
// Quando a API (backend/) está configurada e há conexão, depois de 2 ou 3
// perguntas rápidas (combo, limitação e, se faltar, nível) a conversa passa para
// a IA real, em streaming. Se a chamada falhar ou demorar, o app continua no
// roteiro offline com o que já foi respondido. O Modo Demo nunca usa a API.

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

  // Perguntas feitas antes de passar a conversa para a IA online: o servidor
  // precisa de combo, limitação e nível para só oferecer exercícios adequados.
  const preSteps = [STEP_COMBO, STEP_LIMITATION];
  if (!known.level) preSteps.push(STEP_LEVEL);

  return { steps, known, preSteps };
}

// Quais respostas já existem para cada passo do roteiro offline. Usado ao cair
// do modo online para o offline sem perguntar de novo o que já foi respondido.
function isStepAnswered(step, answers) {
  switch (step.id) {
    case 'body': return !!(answers.weight && answers.height);
    case 'goals': return Array.isArray(answers.goals) && answers.goals.length > 0;
    case 'schedule': return !!(answers.days && answers.time);
    case 'combo': return !!answers.combo;
    case 'level': return !!answers.level;
    case 'limitation': return answers.limitation !== undefined;
    default: return false;
  }
}

const GOAL_IDS = GOAL_OPTIONS.map(g => g.id);

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

// Perfil enviado à API. Campos sem valor ficam de fora (JSON.stringify ignora undefined).
function buildApiProfile(answers, user) {
  const goals = (answers.goals || []).filter(g => GOAL_IDS.includes(g));
  return {
    combo: answers.combo,
    limitation: answers.limitation,
    level: answers.level,
    weight: toFiniteNumber(answers.weight),
    height: toFiniteNumber(answers.height),
    goals: goals.length > 0 ? goals : undefined,
    gender: user?.gender,
    ageGroup: user?.ageGroup,
  };
}

const API_HISTORY_START = 'Olá! Quero montar meu treino.';

const INTRO_MESSAGE =
  'Olá! Eu sou seu personal trainer virtual da Duo Fitness. 💪\nVou te fazer algumas perguntas rápidas para montar suas Séries A, B e C sob medida.';

export default function AIPersonalTrainerScreen({ navigation }) {
  const { addWorkouts, saveUser, user } = useApp();
  const [{ steps: INITIAL_STEPS, known: KNOWN_ANSWERS, preSteps: PRE_STEPS }] = useState(() => buildSteps(user));
  // Sem EXPO_PUBLIC_API_URL tudo fica offline.
  const online = isApiConfigured();
  // 'pre' = perguntas antes da IA online, 'ai' = conversa com a API, 'script' = roteiro offline
  const [phase, setPhase] = useState(online ? 'pre' : 'script');
  const [stepList, setStepList] = useState(INITIAL_STEPS);
  const [preIndex, setPreIndex] = useState(0);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingId, setStreamingId] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState(KNOWN_ANSWERS);
  const [chipSelection, setChipSelection] = useState([]);
  const [finalPlan, setFinalPlan] = useState(null);
  const [planSaved, setPlanSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef(null);
  const apiHistory = useRef([]);
  const streamRef = useRef(null);
  const healthRef = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    startConversation();
    return () => {
      mounted.current = false;
      streamRef.current?.abort();
    };
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

    // Em paralelo com as primeiras perguntas, vê se a API responde.
    if (online) healthRef.current = checkHealth();

    const firstStep = online ? PRE_STEPS[0] : stepList[0];
    setTimeout(() => {
      pushAI(`${INTRO_MESSAGE}${knownNote}\n\n${firstStep.ask()}`);
      setLoading(false);
    }, 700);
  };

  // Conversa com a IA online (streaming). `acc` = tudo que já foi respondido.
  const runAiTurn = (acc) => {
    const msgId = `ai_${Date.now()}`;
    let text = '';
    let gotPlan = false;
    setLoading(true);

    streamRef.current = chatStream({
      messages: apiHistory.current,
      profile: buildApiProfile(acc, user),
      onDelta: (chunk) => {
        if (!mounted.current) return;
        text += chunk;
        setStreamingId(msgId);
        setMessages(prev => {
          const exists = prev.some(m => m.id === msgId);
          return exists
            ? prev.map(m => (m.id === msgId ? { ...m, content: text } : m))
            : [...prev, { id: msgId, role: 'assistant', content: text }];
        });
      },
      onPlan: ({ plan, collected }) => {
        if (!mounted.current) return;
        const merged = { ...acc, ...collected };
        const imc = calculateIMC(merged.weight, merged.height);
        const imcInfo = imc ? getIMCCategory(imc) : null;
        const generated = hydratePlanForAge(plan, {
          goals: merged.goals,
          gender: user?.gender,
          ageGroup: user?.ageGroup,
          imcCategory: imcInfo?.id,
        }).map(w => ({ ...w, generatedByAI: true }));

        if (generated.length === 0 || generated.some(w => w.exercises.length < 5)) {
          gotPlan = true;
          switchToScript(merged, 'Não consegui validar o plano da IA aqui no aparelho, então vou montar o seu plano pelo roteiro offline.');
          return;
        }

        const planObj = {
          imc: imc ? imc.toFixed(1) : null,
          imcCategoria: imcInfo?.id,
          series: generated.map(w => ({ serie: w.serie, nome: w.name, foco: w.focus, exercicios: w.exercises })),
          workouts: generated,
        };
        gotPlan = true;
        setAnswers(merged);
        pushAI('Prontinho! Montei suas séries com base no que você me contou. Dá uma olhada:', { plan: planObj });
        setFinalPlan(planObj);
      },
      onDone: () => {
        if (!mounted.current) return;
        if (text) apiHistory.current.push({ role: 'assistant', content: text });
        setStreamingId(null);
        setLoading(false);
      },
      onError: (err) => {
        if (!mounted.current || gotPlan) return;
        setStreamingId(null);
        // A IA validou os dados mas o plano não passou: o que ela coletou já dá
        // para o gerador local montar o plano, sem perguntar tudo de novo.
        const f = err.fallback || {};
        const merged = {
          ...acc,
          ...(f.weight && f.height ? { weight: f.weight, height: f.height } : {}),
          ...(Array.isArray(f.goals) && f.goals.length > 0 ? { goals: f.goals } : {}),
          ...(f.days && f.time ? { days: f.days, time: f.time } : {}),
        };
        const note = err.code === 'timeout' || err.code === 'stalled'
          ? 'A IA demorou para responder, então vou seguir com o roteiro offline.'
          : 'Não consegui falar com a IA agora, então vou seguir com o roteiro offline.';
        switchToScript(merged, note);
      },
    });
  };

  // Passa para o roteiro offline pulando o que já foi respondido. Se não
  // faltar nada, já gera o plano local.
  const switchToScript = (acc, note) => {
    streamRef.current?.abort();
    streamRef.current = null;
    setPhase('script');
    setAnswers(acc);
    const remaining = INITIAL_STEPS.filter(step => !isStepAnswered(step, acc));
    setStepList(remaining);
    setStepIndex(0);
    if (note) pushAI(note);
    if (remaining.length === 0) {
      finalizePlan(acc);
    } else {
      pushAI(remaining[0].ask());
      setLoading(false);
    }
  };

  // Terminadas as perguntas iniciais: testa a API e começa a conversa online.
  const startAiPhase = async (acc) => {
    setLoading(true);
    const healthy = healthRef.current ? await healthRef.current : false;
    if (!mounted.current) return;
    if (!healthy) {
      switchToScript(acc, 'Não consegui falar com a IA agora, então vou seguir com o roteiro offline.');
      return;
    }
    setPhase('ai');
    apiHistory.current = [{ role: 'user', content: API_HISTORY_START }];
    runAiTurn(acc);
  };

  const handleAiAnswer = (text) => {
    pushUser(text);
    setInput('');
    apiHistory.current = [...apiHistory.current, { role: 'user', content: text }];
    runAiTurn(answers);
  };

  const finalizePlan = (allAnswers) => {
    setLoading(true);
    setTimeout(() => {
      const imc = calculateIMC(allAnswers.weight, allAnswers.height);
      const imcInfo = imc ? getIMCCategory(imc) : null;

      const generated = generatePlanForAge({
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
    const trimmed = rawText.trim();
    if (!trimmed) return;
    if (phase === 'ai') {
      handleAiAnswer(trimmed);
      return;
    }

    const inPre = phase === 'pre';
    const list = inPre ? PRE_STEPS : stepList;
    const index = inPre ? preIndex : stepIndex;
    const step = list[index];
    if (!step) return;

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

      const nextIndex = index + 1;
      if (nextIndex < list.length) {
        (inPre ? setPreIndex : setStepIndex)(nextIndex);
        pushAI(list[nextIndex].ask());
        setLoading(false);
      } else if (inPre) {
        startAiPhase(updatedAnswers);
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
    const step = currentStep;
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

  // Na fase da IA online não há chips: a conversa é livre.
  const currentStep = finalPlan || phase === 'ai'
    ? null
    : phase === 'pre' ? PRE_STEPS[preIndex] : stepList[stepIndex];

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
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => navigation.goBack()} style={styles.backBtn}>
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
          {loading && messages.length > 0 && !streamingId && (
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
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Confirmar seleção" accessibilityState={{ disabled: chipSelection.length === 0 }}
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
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Enviar mensagem" accessibilityState={{ disabled: !input.trim() || loading || !!finalPlan }}
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