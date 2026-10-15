import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, BackHandler, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { COMBOS } from '../data/combosEquipment';
import { GOAL_OPTIONS, LEVEL_OPTIONS, LIMITATION_OPTIONS } from '../utils/planOptions';
import {
  DAYS_OPTIONS, FOCUS_OPTIONS, TIME_OPTIONS,
  PLAN_LABEL, SUGGESTION_CHIPS, applyAdjustment, buildReasons, defaultSettings, generateGuidedPlan, getPlanBadge, getPlanSteps, getProfileChips,
  getProfileDefaults, missingProfileFields, parseAdjustment, parseMeasure, swapExercise,
} from '../utils/guidedPlan';
import { AI_BADGE_ENABLED } from '../data/guidedConfig';
import { isApiConfigured } from '../services/api';
import SeriesCard from '../components/guided/SeriesCard';
import { BuildingChecklist, animateLayout, Chip, FooterButton, GuidedHeader, OptionCard, TrainerLabel } from '../components/guided/GuidedParts';

// Série guiada: uma pergunta por tela, no aparelho (sem rede). O chat antigo continua na rota
// "AIPersonalTrainerChat". Nada aqui altera os dados salvos até o morador tocar em "Salvar série".
const QUESTIONS = ['schedule', 'combo', 'limitation', 'focus'];

export default function GuidedPlanScreen({ navigation }) {
  const { user, addWorkouts, saveUser } = useApp();
  const [settings, setSettings] = useState(() => defaultSettings(getProfileDefaults(user)));
  const [stage, setStage] = useState('intro'); // 'intro' | 'ask' | 'building' | 'review'
  const [qIndex, setQIndex] = useState(0);
  const [plan, setPlan] = useState(null);
  const [swaps, setSwaps] = useState(0);
  const [saving, setSaving] = useState(false);

  const finishBuilding = useCallback(() => setStage('review'), []);
  // "Quer ajustar algo?": interpreta o texto localmente e regenera a série. Devolve a mensagem para o morador.
  const adjust = useCallback((text) => {
    const { actions, understood } = parseAdjustment(text);
    if (!understood) {
      return { ok: false, message: 'Não entendi esse pedido. Tente algo como "mais glúteo", "treino mais curto", "evitar impacto" ou "mais perna".' };
    }
    const result = applyAdjustment(settings, actions);
    if (!result.changed) {
      return { ok: false, message: result.notes.join(' ') || 'Nada para mudar nesse pedido.' };
    }
    setSettings(result.settings);
    setPlan(generateGuidedPlan(result.settings, user));
    const redone = swaps > 0 ? ' As trocas de exercício feitas à mão foram refeitas.' : '';
    setSwaps(0);
    return { ok: true, message: `Pronto: ${result.changes.join(', ')}.${redone}` };
  }, [settings, user, swaps]);

  // Salva com addWorkouts (mesmo formato dos treinos de sempre). O IMC só é gravado no perfil se
  // o peso e a altura usados forem os do próprio perfil.
  const save = useCallback(async () => {
    if (!plan || saving) return;
    setSaving(true);
    try {
      await addWorkouts(plan.workouts);
      const sameBody = user && Number(user.weight) === settings.weight && Number(user.height) === settings.height;
      if (plan.imc && sameBody) await saveUser({ ...user, imc: plan.imc, imcCategory: plan.imcCategoria });
      setStage('saved');
    } catch (e) {
      console.log('Erro ao salvar a série:', e);
    }
    setSaving(false);
  }, [plan, saving, addWorkouts, saveUser, user, settings.weight, settings.height]);

  const swap = useCallback((serieIndex, exerciseId, newId) => {
    setSwaps((n) => n + 1);
    setPlan((p) => (p ? { ...p, workouts: swapExercise(p.workouts, serieIndex, exerciseId, newId, settings, user) } : p));
  }, [settings, user]);
  const patch = useCallback((p) => setSettings((s) => ({ ...s, ...p })), []);

  const goBack = useCallback(() => {
    if (stage === 'ask') {
      if (qIndex > 0) setQIndex(qIndex - 1);
      else setStage('intro');
      return true;
    }
    if (stage === 'building' || stage === 'review') {
      setQIndex(QUESTIONS.length - 1);
      setStage('ask');
      return true;
    }
    navigation.goBack();
    return true;
  }, [stage, qIndex, navigation]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', goBack);
    return () => sub.remove();
  }, [goBack]);

  if (stage === 'intro') {
    return (
      <IntroStage
        settings={settings}
        patch={patch}
        onBack={goBack}
        onStart={() => { setQIndex(0); setStage('ask'); }}
        onOpenChat={() => navigation.navigate('AIPersonalTrainerChat')}
      />
    );
  }

  if (stage === 'ask') {
    const last = qIndex === QUESTIONS.length - 1;
    return (
      <AskStage
        key={QUESTIONS[qIndex]}
        question={QUESTIONS[qIndex]}
        index={qIndex}
        total={QUESTIONS.length}
        settings={settings}
        patch={patch}
        onBack={goBack}
        onNext={() => {
          if (!last) { setQIndex(qIndex + 1); return; }
          // O plano sai do gerador local na hora; as etapas do "Montando" mostram o que foi calculado.
          setPlan(generateGuidedPlan(settings, user));
          setStage('building');
        }}
        last={last}
      />
    );
  }

  if (stage === 'building' && plan) {
    return (
      <BuildingStage
        settings={settings}
        plan={plan}
        user={user}
        onBack={goBack}
        onDone={finishBuilding}
      />
    );
  }

  if (stage === 'review' && plan) {
    return (
      <ReviewStage
        settings={settings}
        plan={plan}
        user={user}
        onBack={goBack}
        onSwap={swap}
        onAdjust={adjust}
        onSave={save}
        saving={saving}
      />
    );
  }

  if (stage === 'saved') {
    return <SavedStage plan={plan} onOpen={() => navigation.navigate('WorkoutsList')} onHome={() => navigation.getParent()?.navigate('Home')} />;
  }

  return null;
}

// ---------- Montando sua série: etapas ligadas a cálculos reais do gerador ----------

const STEP_MS = 750;

function BuildingStage({ settings, plan, user, onBack, onDone }) {
  const steps = getPlanSteps(settings, plan, user);
  const [visible, setVisible] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { if (alive) setReduceMotion(!!v); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const delay = reduceMotion ? 150 : STEP_MS;
    if (visible >= steps.length) {
      const t = setTimeout(onDone, reduceMotion ? 150 : 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisible((v) => v + 1), delay);
    return () => clearTimeout(t);
  }, [visible, steps.length, reduceMotion, onDone]);

  const badge = getPlanBadge({ source: plan.source, aiEnabled: AI_BADGE_ENABLED, apiConfigured: isApiConfigured(), isDemo: !!user?.isDemo });

  return (
    <View style={styles.container}>
      <GuidedHeader onBack={onBack} progress={Math.min(visible / steps.length, 1)} caption="Montando" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.labelRow}>
          <TrainerLabel text={PLAN_LABEL} badge={badge} />
        </View>
        <Text style={styles.title} accessibilityRole="header">Montando sua série</Text>
        <Text style={styles.subtitle}>Cada etapa abaixo é um cálculo feito agora, no seu aparelho.</Text>
        <BuildingChecklist steps={steps} visible={visible} />
      </ScrollView>
      <FooterButton label="Pular" onPress={onDone} secondary icon="play-skip-forward-outline" />
    </View>
  );
}

// ---------- Revisão: por que esta série, cartões A/B/C e troca de exercício ----------

function ReviewStage({ settings, plan, user, onBack, onSwap, onAdjust, onSave, saving }) {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustText, setAdjustText] = useState('');
  const [feedback, setFeedback] = useState(null);

  const submit = (text) => {
    const value = (text ?? adjustText).trim();
    if (!value) return;
    setFeedback(onAdjust(value));
    setAdjustText('');
  };

  const reasons = buildReasons(settings, plan, user);
  const badge = getPlanBadge({ source: plan.source, aiEnabled: AI_BADGE_ENABLED, apiConfigured: isApiConfigured(), isDemo: !!user?.isDemo });
  const combo = COMBOS.find((c) => c.id === settings.combo);
  const summary = [
    `${settings.days} ${settings.days === 1 ? 'dia' : 'dias'}`,
    `${settings.time} min`,
    `Combo ${combo?.label}`,
  ];

  return (
    <View style={styles.container}>
      <GuidedHeader onBack={onBack} caption="Revisão" progress={1} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.labelRow}>
          <TrainerLabel text={PLAN_LABEL} badge={badge} />
        </View>
        <Text style={styles.title} accessibilityRole="header">Sua série está pronta</Text>
        <View style={styles.chipsWrap}>
          {summary.map((t) => (
            <View key={t} style={styles.summaryChip}><Text style={styles.summaryChipText}>{t}</Text></View>
          ))}
        </View>

        <View style={styles.reasonsCard}>
          <Text style={styles.groupTitle}>Por que esta série</Text>
          {reasons.map((r) => (
            <View key={r} style={styles.reasonRow}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
              <Text style={styles.reasonText}>{r}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.groupTitle}>Suas séries</Text>
        {plan.workouts.map((w, i) => (
          <SeriesCard key={w.serie} workouts={plan.workouts} index={i} settings={settings} user={user} onSwap={onSwap} initiallyOpen={i === 0} />
        ))}
      </ScrollView>

      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0}>
        <View style={styles.adjustBar}>
          <TouchableOpacity
            style={styles.adjustToggle}
            onPress={() => { animateLayout(); setAdjustOpen((o) => !o); }}
            accessibilityRole="button"
            accessibilityState={{ expanded: adjustOpen }}
            accessibilityLabel="Quer ajustar algo?"
          >
            <Ionicons name="options-outline" size={18} color={COLORS.primary} />
            <Text style={styles.adjustToggleText}>Quer ajustar algo?</Text>
            <Ionicons name={adjustOpen ? 'chevron-down' : 'chevron-up'} size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {adjustOpen && (
            <View style={styles.adjustPanel}>
              <View style={styles.chipsWrap}>
                {SUGGESTION_CHIPS.map((c) => (
                  <Chip key={c} label={c} onPress={() => submit(c)} />
                ))}
              </View>
              <View style={styles.editorRow}>
                <TextInput
                  style={styles.input}
                  value={adjustText}
                  onChangeText={setAdjustText}
                  placeholder="Ex.: mais perna, 30 minutos"
                  placeholderTextColor={COLORS.textSecondary}
                  returnKeyType="send"
                  onSubmitEditing={() => submit()}
                  accessibilityLabel="Escreva o que quer ajustar"
                />
                <TouchableOpacity style={styles.okBtn} onPress={() => submit()} accessibilityRole="button" accessibilityLabel="Ajustar a série">
                  <Text style={styles.okBtnText}>Ajustar</Text>
                </TouchableOpacity>
              </View>
              {feedback ? (
                <Text style={[styles.feedback, !feedback.ok && styles.feedbackWarn]} accessibilityLiveRegion="polite">{feedback.message}</Text>
              ) : null}
            </View>
          )}
        </View>
        <FooterButton label={saving ? 'Salvando…' : 'Salvar série'} onPress={onSave} disabled={saving} icon="save-outline" />
      </KeyboardAvoidingView>
    </View>
  );
}

// ---------- Série salva ----------

function SavedStage({ plan, onOpen, onHome }) {
  const n = plan?.workouts?.length ?? 0;
  return (
    <View style={styles.container}>
      <View style={styles.savedBody}>
        <Ionicons name="checkmark-circle" size={72} color={COLORS.success} />
        <Text style={styles.title} accessibilityRole="header">Série salva!</Text>
        <Text style={styles.subtitle}>
          {n === 1 ? 'Sua série A já está' : `Suas ${n} séries já estão`} em Treinos, prontas para você começar.
        </Text>
      </View>
      <FooterButton label="Ver minhas séries" onPress={onOpen} icon="barbell-outline" />
      <TouchableOpacity style={styles.homeLink} onPress={onHome} accessibilityRole="button" accessibilityLabel="Voltar ao início">
        <Text style={styles.linkText}>Voltar ao início</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------- Abertura: o que já sabemos do perfil, em chips editáveis ----------

function IntroStage({ settings, patch, onBack, onStart, onOpenChat }) {
  const [editing, setEditing] = useState(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const missing = missingProfileFields(settings);
  const chips = getProfileChips(settings);

  const open = (field) => {
    setError('');
    if (editing === field) { setEditing(null); return; }
    setEditing(field);
    setText(field === 'weight' || field === 'height' ? String(settings[field] ?? '') : '');
  };

  const saveMeasure = (field) => {
    const range = field === 'weight' ? { min: 30, max: 300 } : { min: 100, max: 250 };
    const v = parseMeasure(text, range);
    if (v === null) {
      setError(field === 'weight' ? 'Informe o peso entre 30 e 300 kg.' : 'Informe a altura entre 100 e 250 cm.');
      return;
    }
    patch({ [field]: v });
    setEditing(null);
    setError('');
  };

  const toggleGoal = (id) => {
    const goals = settings.goals.includes(id) ? settings.goals.filter((g) => g !== id) : [...settings.goals, id];
    patch({ goals });
  };

  return (
    <View style={styles.container}>
      <GuidedHeader onBack={onBack} caption="Série guiada" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title} accessibilityRole="header">Vamos montar sua série</Text>
          <Text style={styles.subtitle}>
            {missing.length === 0
              ? 'Já sabemos isto de você. Toque em um item para mudar, só para esta série.'
              : 'Complete os itens em amarelo para continuar. Valem só para esta série.'}
          </Text>

          <View style={styles.chipsWrap}>
            {chips.map((c) => (
              <TouchableOpacity
                key={c.field}
                style={[styles.profileChip, !c.value && styles.profileChipMissing, editing === c.field && styles.profileChipActive]}
                onPress={() => open(c.field)}
                accessibilityRole="button"
                accessibilityLabel={`${c.label}: ${c.value || 'não informado'}. Toque para editar.`}
              >
                <Text style={styles.profileChipLabel}>{c.label}</Text>
                <Text style={[styles.profileChipValue, !c.value && styles.profileChipValueMissing]}>{c.value || 'Informar'}</Text>
                <Ionicons name="create-outline" size={14} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>

          {(editing === 'weight' || editing === 'height') && (
            <View style={styles.editor}>
              <Text style={styles.editorLabel}>{editing === 'weight' ? 'Peso (kg)' : 'Altura (cm)'}</Text>
              <View style={styles.editorRow}>
                <TextInput
                  style={styles.input}
                  value={text}
                  onChangeText={setText}
                  keyboardType="decimal-pad"
                  placeholder={editing === 'weight' ? 'Ex.: 78' : 'Ex.: 175'}
                  placeholderTextColor={COLORS.textSecondary}
                  accessibilityLabel={editing === 'weight' ? 'Peso em quilos' : 'Altura em centímetros'}
                  onSubmitEditing={() => saveMeasure(editing)}
                  returnKeyType="done"
                />
                <TouchableOpacity style={styles.okBtn} onPress={() => saveMeasure(editing)} accessibilityRole="button" accessibilityLabel="Confirmar">
                  <Text style={styles.okBtnText}>OK</Text>
                </TouchableOpacity>
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          )}

          {editing === 'goals' && (
            <View style={styles.editor}>
              <Text style={styles.editorLabel}>Objetivos (pode escolher mais de um)</Text>
              <View style={styles.chipsWrap}>
                {GOAL_OPTIONS.map((g) => (
                  <Chip key={g.id} label={g.label} selected={settings.goals.includes(g.id)} onPress={() => toggleGoal(g.id)} />
                ))}
              </View>
            </View>
          )}

          {editing === 'level' && (
            <View style={styles.editor}>
              <Text style={styles.editorLabel}>Nível de experiência</Text>
              <View style={styles.chipsWrap}>
                {LEVEL_OPTIONS.map((l) => (
                  <Chip key={l.id} label={l.label} selected={settings.level === l.id} onPress={() => patch({ level: l.id })} />
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.linkBtn} onPress={onOpenChat} accessibilityRole="button" accessibilityLabel="Usar o chat antigo do Personal Trainer">
            <Ionicons name="chatbubbles-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.linkText}>Prefere conversar? Usar o chat antigo</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
      <FooterButton label="Começar" onPress={onStart} disabled={missing.length > 0} icon="arrow-forward" />
    </View>
  );
}

// ---------- Uma pergunta por tela ----------

function AskStage({ question, index, total, settings, patch, onBack, onNext, last }) {
  let title; let subtitle; let body; let ready;

  if (question === 'schedule') {
    title = 'Quantos dias e quanto tempo?';
    subtitle = 'Escolha os dias de treino por semana e a duração de cada sessão.';
    ready = true;
    body = (
      <>
        <Text style={styles.groupTitle}>Dias por semana</Text>
        {DAYS_OPTIONS.map((o) => (
          <OptionCard key={o.id} label={o.label} hint={o.hint} selected={settings.days === o.id} onPress={() => patch({ days: o.id })} />
        ))}
        <Text style={styles.groupTitle}>Tempo por sessão</Text>
        {TIME_OPTIONS.map((o) => (
          <OptionCard key={o.id} label={o.label} hint={o.hint} selected={settings.time === o.id} onPress={() => patch({ time: o.id })} />
        ))}
      </>
    );
  } else if (question === 'combo') {
    title = 'Qual é o combo da academia?';
    subtitle = 'Ele define quais máquinas entram na sua série.';
    ready = !!settings.combo;
    body = COMBOS.map((c) => (
      <OptionCard key={c.id} label={c.label} hint={c.description} selected={settings.combo === c.id} onPress={() => patch({ combo: c.id })} icon="barbell-outline" />
    ));
  } else if (question === 'limitation') {
    title = 'Tem alguma limitação?';
    subtitle = 'Vamos evitar exercícios que sobrecarregam a região.';
    ready = !!settings.limitation;
    body = LIMITATION_OPTIONS.map((l) => (
      <OptionCard key={l.id} label={l.label} selected={settings.limitation === l.id} onPress={() => patch({ limitation: l.id })} />
    ));
  } else {
    title = 'Quer dar mais foco a algo?';
    subtitle = 'Pode deixar equilibrado. Você ainda poderá ajustar no fim.';
    ready = true;
    body = FOCUS_OPTIONS.map((f) => (
      <OptionCard key={f.id} label={f.label} hint={f.hint} selected={settings.focus === f.id} onPress={() => patch({ focus: f.id })} />
    ));
  }

  return (
    <View style={styles.container}>
      <GuidedHeader onBack={onBack} progress={(index + 1) / total} caption={`Pergunta ${index + 1} de ${total}`} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.options} accessibilityRole="radiogroup">{body}</View>
      </ScrollView>
      <FooterButton label={last ? 'Montar minha série' : 'Continuar'} onPress={onNext} disabled={!ready} icon={last ? 'sparkles' : 'arrow-forward'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg, paddingTop: SPACING.md, gap: SPACING.md },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },
  subtitle: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 22 },
  options: { gap: SPACING.sm },
  labelRow: { flexDirection: 'row' },
  summaryChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs + 2, borderRadius: RADIUS.full, backgroundColor: COLORS.bgCardAlt },
  summaryChipText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.white },
  reasonsCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.sm },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  reasonText: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.white, lineHeight: 22 },
  adjustBar: { backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: SPACING.lg },
  adjustToggle: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  adjustToggleText: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  adjustPanel: { gap: SPACING.sm, paddingBottom: SPACING.sm },
  feedback: { fontSize: FONTS.sizes.sm, color: COLORS.success, lineHeight: 18 },
  feedbackWarn: { color: COLORS.warning },
  savedBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, padding: SPACING.lg },
  homeLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
  groupTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1, marginTop: SPACING.sm, textTransform: 'uppercase' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  profileChip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, flexShrink: 1 },
  profileChipMissing: { borderColor: COLORS.primary },
  profileChipActive: { backgroundColor: '#1A1700', borderColor: COLORS.primary },
  profileChipLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  profileChipValue: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.white, flexShrink: 1 },
  profileChipValueMissing: { color: COLORS.primary },
  editor: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.sm },
  editorLabel: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.white },
  editorRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  input: { flex: 1, minHeight: 48, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgCardAlt, color: COLORS.white, paddingHorizontal: SPACING.md, fontSize: FONTS.sizes.md },
  okBtn: { minHeight: 48, minWidth: 64, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md },
  okBtnText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.black },
  error: { fontSize: FONTS.sizes.sm, color: COLORS.error },
  linkBtn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm },
  linkText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textDecorationLine: 'underline', flexShrink: 1 },
});
