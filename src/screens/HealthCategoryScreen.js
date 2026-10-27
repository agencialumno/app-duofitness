import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, HEALTH_UI, RADIUS, SPACING } from '../utils/theme';
import useHealth from '../hooks/useHealth';
import TrendBars from '../components/health/TrendBars';
import InfoButton from '../components/InfoButton';
import { ExampleBadge } from '../components/OccupancyCard';
import { dayKey } from '../utils/health';
import { getCategory } from '../utils/healthModel';
import { FORM_FIELDS, buildHistory, compactVariation, parseForm } from '../utils/healthView';
import { HEALTH_INFO, HEALTH_MEANING, HEALTH_PRIVACY_LINES } from '../data/healthInfoContent';

// Detalhe de UMA categoria, de cima para baixo: valor atual com a variação e a origem, seletor de período (7 ou 30 dias) com o gráfico,
// registros com data e origem, a ação de registro (recolhida quando já há dados) e a explicação ("i" no cabeçalho e texto no fim).
// O campo focado fica sempre visível com o teclado aberto (KeyboardAvoidingView + rolagem até o formulário).
export default function HealthCategoryScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const id = route?.params?.category;
  const cat = getCategory(id);
  const { loading, views, samples, minor, isExample, record, remove, addGlass, waterGoal, setGoal, source } = useHealth();
  const scrollRef = useRef(null);
  const formY = useRef(0);
  const [texts, setTexts] = useState({});
  const [msg, setMsg] = useState(null);
  const [period, setPeriod] = useState('7');
  const [formOpen, setFormOpen] = useState(!!route?.params?.register);

  const blocked = !cat || (id === 'body' && minor);
  const view = !blocked ? views.find((v) => v.id === id) : null;
  const info = !blocked ? HEALTH_INFO[id] : null;
  const fields = FORM_FIELDS[id] || [];
  const today = dayKey();

  const submit = () => {
    const { entries, errors } = parseForm(fields, texts);
    if (errors.length) { setMsg({ ok: false, text: errors.join(' ') }); return; }
    if (entries.length === 0) { setMsg({ ok: false, text: 'Preencha pelo menos um campo para registrar.' }); return; }
    record(entries, today);
    setTexts({});
    setMsg({ ok: true, text: entries.length === 1 ? 'Registro salvo.' : `${entries.length} registros salvos.` });
  };

  const goalNow = waterGoal;
  const todayWater = (samples.filter((s) => s.metric === 'water' && s.date === today).sort((a, b) => (b.source === source) - (a.source === source))[0] || {}).value ?? null;

  const Header = (
    <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Voltar">
        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
      </TouchableOpacity>
      <View style={styles.headerText}>
        <Text style={styles.title} accessibilityRole="header">{cat ? cat.label : 'Saúde'}</Text>
        <Text style={styles.subtitle}>Detalhe e histórico</Text>
      </View>
      {info ? <InfoButton label={info.label} titulo={info.titulo} blocks={info.blocks} /> : null}
    </View>
  );

  if (blocked) {
    return (
      <View style={styles.container}>
        {Header}
        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.muted}>{cat ? 'Esta categoria não está disponível para menores de 18 anos.' : 'Categoria não encontrada.'}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={`health-detail-${id}`}>
      {Header}
      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={0}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.xl }]}
        >
          {isExample && <ExampleBadge />}
          {/* Valor atual, variação e origem */}
          <View style={styles.card} testID="health-hero">
            {loading || !view ? (
              <Text style={styles.muted}>Carregando…</Text>
            ) : view.hasData ? (
              <>
                {view.current ? (
                  <View style={styles.valueRow} accessible accessibilityLabel={`${view.current.text}, ${view.current.sub.toLowerCase()}`}>
                    <Text style={styles.value}>{view.current.text}</Text>
                    <Text style={styles.sub}>{view.current.sub}</Text>
                  </View>
                ) : null}
                <View style={styles.variation}>
                  <Ionicons name={compactVariation(view).icon} size={16} color={COLORS.textSecondary} />
                  <Text style={styles.trend}>{compactVariation(view).text} <Text style={styles.sub}>· 7 dias</Text></Text>
                </View>
                {view.extra.map((e) => (
                  <Text key={e.label} style={styles.extra}>{e.label}: <Text style={styles.extraValue}>{e.text}</Text> · {e.when}</Text>
                ))}
                {view.origin ? <Text style={styles.origin}>Origem: {view.origin}</Text> : null}
              </>
            ) : (
              <>
                <Text style={styles.muted}>{view.empty.message}</Text>
                <Text style={styles.muted}>{view.empty.action.type === 'connect' ? 'Você também pode registrar à mão abaixo.' : 'Use a ação de registro abaixo.'}</Text>
              </>
            )}
          </View>

          {/* Período (7 ou 30 dias) e gráfico */}
          {view && view.hasData && (
            <View style={styles.card} testID="health-period">
              <View style={styles.segment} accessibilityRole="tablist">
                {[['7', '7 dias'], ['30', '30 dias']].map(([k, label]) => (
                  <TouchableOpacity
                    key={k}
                    testID={`period-${k}`}
                    style={[styles.segBtn, period === k && styles.segBtnActive]}
                    onPress={() => setPeriod(k)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: period === k }}
                    accessibilityLabel={`Período de ${label}`}
                  >
                    <Text style={[styles.segText, period === k && styles.segTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.trend}>{period === '7' ? view.trends.d7.text : view.trends.d30.text}</Text>
              {period === '7'
                ? <TrendBars series={view.series.d7} metric={view.primaryMetric} testID="trend-7" />
                : <TrendBars series={view.series.d30} metric={view.primaryMetric} testID="trend-30" />}
              <Text style={styles.caption}>Dias sem registro aparecem como um ponto pequeno e não contam como zero.</Text>
            </View>
          )}

          {/* Registros, com data e origem */}
          {!loading && cat.metrics.map((metric) => {
            const rows = buildHistory(samples, metric, { limit: 14 });
            if (rows.length === 0) return null;
            return (
              <View key={metric} style={styles.card} testID={`history-${metric}`}>
                <Text style={styles.cardTitle}>Histórico: {METRIC_TITLE[metric]}</Text>
                {rows.map((r) => (
                  <View key={r.date} style={styles.histRow} accessible accessibilityLabel={`${r.label}: ${r.text}. Origem: ${SOURCE_NAME[r.source]}.`}>
                    <Text style={styles.histDate}>{r.label}</Text>
                    <Text style={styles.histValue}>{r.text}</Text>
                    <Text style={styles.histSource}>{SOURCE_NAME[r.source]}</Text>
                    {r.removable ? (
                      <TouchableOpacity style={styles.removeBtn} onPress={() => remove(metric, r.date)} accessibilityRole="button" accessibilityLabel={`Remover o registro de ${r.label}`}>
                        <Ionicons name="trash-outline" size={18} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    ) : <View style={styles.removeBtn} />}
                  </View>
                ))}
              </View>
            );
          })}

          {/* Registrar */}
          <View style={styles.card} onLayout={(e) => { formY.current = e.nativeEvent.layout.y; }}>
            {id !== 'hydration' && !formOpen ? (
              <TouchableOpacity testID="health-register-open" style={styles.okBtn} onPress={() => setFormOpen(true)} accessibilityRole="button" accessibilityLabel="Registrar hoje">
                <Text style={styles.okBtnText}>Registrar hoje</Text>
              </TouchableOpacity>
            ) : <Text style={styles.cardTitle}>Registrar hoje</Text>}
            {id === 'hydration' ? (
              <>
                <View style={styles.waterRow}>
                  <TouchableOpacity style={styles.roundBtn} onPress={() => addGlass(-1)} accessibilityRole="button" accessibilityLabel="Tirar um copo">
                    <Ionicons name="remove" size={22} color={COLORS.white} />
                  </TouchableOpacity>
                  <View style={styles.waterCenter} accessible accessibilityLabel={`${todayWater ?? 0} de ${goalNow} copos`}>
                    <Text style={styles.value}>{todayWater ?? '—'}<Text style={styles.bigOf}> / {goalNow}</Text></Text>
                    <Text style={styles.muted}>copos hoje</Text>
                  </View>
                  <TouchableOpacity style={[styles.roundBtn, styles.roundBtnPrimary]} onPress={() => addGlass(1)} accessibilityRole="button" accessibilityLabel="Adicionar um copo">
                    <Ionicons name="add" size={22} color={COLORS.black} />
                  </TouchableOpacity>
                </View>
                <View style={styles.goalRow}>
                  <Text style={styles.goalText}>Meta diária: {goalNow} copos</Text>
                  <TouchableOpacity style={styles.smallBtn} onPress={() => setGoal(goalNow - 1)} accessibilityRole="button" accessibilityLabel="Diminuir a meta de copos">
                    <Ionicons name="remove" size={18} color={COLORS.white} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.smallBtn} onPress={() => setGoal(goalNow + 1)} accessibilityRole="button" accessibilityLabel="Aumentar a meta de copos">
                    <Ionicons name="add" size={18} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              </>
            ) : formOpen ? (
              <View testID="health-form" style={styles.formBox}>
                {fields.map((f) => (
                  <View key={f.metric} style={styles.field}>
                    <Text style={styles.label}>{f.label}</Text>
                    <TextInput
                      testID={`field-${f.metric}`}
                      style={styles.input}
                      value={texts[f.metric] ?? ''}
                      onChangeText={(t) => { setTexts((s) => ({ ...s, [f.metric]: t })); setMsg(null); }}
                      onFocus={() => scrollRef.current?.scrollTo({ y: Math.max(formY.current - SPACING.md, 0), animated: true })}
                      keyboardType={f.kind === 'number' ? 'decimal-pad' : 'numbers-and-punctuation'}
                      keyboardAppearance="dark"
                      selectionColor={COLORS.primary}
                      placeholder={f.placeholder}
                      placeholderTextColor={COLORS.textSecondary}
                      returnKeyType="done"
                      onSubmitEditing={submit}
                      accessibilityLabel={f.label}
                    />
                  </View>
                ))}
                <TouchableOpacity testID="health-register" style={styles.okBtn} onPress={submit} accessibilityRole="button" accessibilityLabel="Registrar">
                  <Text style={styles.okBtnText}>Registrar</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {msg ? <Text style={[styles.feedback, !msg.ok && styles.feedbackWarn]} accessibilityLiveRegion="polite" accessibilityRole="alert">{msg.text}</Text> : null}
          </View>

          {/* Explicação */}
          <View style={styles.card} testID="health-meaning">
            <Text style={styles.cardTitle}>O que é</Text>
            <Text style={styles.muted}>{HEALTH_MEANING[id]}</Text>
          </View>

          <View style={styles.privacy}>
            {HEALTH_PRIVACY_LINES.map((t) => (
              <View key={t} style={styles.noticeRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.noticeText}>{t}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const METRIC_TITLE = {
  weight: 'peso', body_fat: '% de gordura', lean_mass: 'massa magra', steps: 'passos', distance: 'distância', exercise_minutes: 'minutos de exercício',
  sleep_duration: 'duração do sono', bedtime: 'hora de dormir', wake_time: 'hora de acordar', resting_hr: 'FC em repouso', hrv: 'variabilidade da FC', water: 'água',
};
const SOURCE_NAME = { manual: 'Manual', apple_saude: 'Apple Saúde', health_connect: 'Health Connect', exemplo: 'Exemplo' };

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  backBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -SPACING.sm },
  headerText: { flex: 1 },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },
  subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  content: { padding: HEALTH_UI.space.screen, paddingTop: SPACING.sm, gap: HEALTH_UI.space.cardGap },
  formBox: { gap: SPACING.sm },
  variation: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  caption: { fontSize: 12, lineHeight: 16, color: COLORS.textSecondary },
  segment: { flexDirection: 'row', gap: SPACING.sm },
  segBtn: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgCardAlt },
  segBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  segText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.white },
  segTextActive: { color: COLORS.black },
  card: { backgroundColor: COLORS.bgCard, borderRadius: HEALTH_UI.card.radius, borderWidth: HEALTH_UI.card.borderWidth, borderColor: COLORS.border, padding: HEALTH_UI.space.cardPadding, gap: SPACING.sm },
  cardTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  muted: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 19 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: SPACING.sm },
  value: { ...HEALTH_UI.type.value, color: COLORS.white },
  bigOf: { fontSize: FONTS.sizes.lg, fontWeight: '400', color: COLORS.textSecondary },
  sub: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  extra: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  extraValue: { color: COLORS.white, fontWeight: '600' },
  origin: { fontSize: 12, lineHeight: 16, color: COLORS.textSecondary },
  trend: { fontSize: FONTS.sizes.sm, color: COLORS.white },
  trendSpaced: { marginTop: SPACING.sm },
  waterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md },
  waterCenter: { alignItems: 'center', flex: 1 },
  roundBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgCardAlt, borderWidth: 1, borderColor: COLORS.border },
  roundBtnPrimary: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  goalText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  smallBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgCardAlt, borderWidth: 1, borderColor: COLORS.border },
  field: { gap: 4 },
  label: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
  input: { minHeight: 48, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgCardAlt, color: COLORS.white, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: FONTS.sizes.md },
  okBtn: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md },
  okBtnText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.black },
  feedback: { fontSize: FONTS.sizes.sm, color: COLORS.success },
  feedbackWarn: { color: COLORS.warning },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 36 },
  histDate: { width: 48, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  histValue: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.white, fontWeight: '600' },
  histSource: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  removeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 16, color: COLORS.textSecondary },
  privacy: { gap: SPACING.xs },
});
