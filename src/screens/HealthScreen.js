import React, { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import useHealth from '../hooks/useHealth';
import WeightChart from '../components/health/WeightChart';
import { ExampleBadge } from '../components/OccupancyCard';
import { animateLayout } from '../components/guided/GuidedParts';
import {
  PRIVACY_NOTE, SCORE_DISCLAIMER, addGlass, addWeight, dayKey, formatKg, getWater, getWeightSeries,
  getWeightTrend, parseWeightInput, scoreBand, setWaterGoal,
} from '../utils/health';
import { CONNECT_CARD } from '../utils/healthProviders';

const BAND_COLOR = { great: COLORS.success, good: COLORS.primary, fair: COLORS.warning, low: COLORS.error, none: COLORS.textSecondary };

// Saúde: Duo Score (hábitos), relatório semanal, peso e água. Tudo no aparelho; nada de aconselhamento médico.
export default function HealthScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { loading, health, update, report, score, minor, isExample } = useHealth();
  const [why, setWhy] = useState(false);
  const [weightText, setWeightText] = useState('');
  const [weightMsg, setWeightMsg] = useState(null);

  const band = scoreBand(score);
  const bandColor = BAND_COLOR[band.id];
  const today = dayKey();
  const glasses = getWater(health, today);
  const goal = health.waterGoal;
  const series = getWeightSeries(health, { days: 90 });
  const lastWeight = health.weights[health.weights.length - 1];
  const trend = getWeightTrend(health, { days: 30 });

  const registerWeight = () => {
    const kg = parseWeightInput(weightText);
    if (kg === null) {
      setWeightMsg({ ok: false, text: 'Informe um peso entre 30 e 300 kg. Pode usar vírgula, por exemplo 78,5.' });
      return;
    }
    update((h) => addWeight(h, kg, today));
    setWeightText('');
    setWeightMsg({ ok: true, text: `Peso registrado: ${formatKg(kg)}.` });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">Saúde</Text>
          <Text style={styles.subtitle}>Seus hábitos da semana</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {isExample && <ExampleBadge />}

          {/* Duo Score */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Duo Score</Text>
            {loading ? (
              <Text style={styles.muted}>Carregando…</Text>
            ) : (
              <>
                <View style={styles.scoreRow} accessible accessibilityLabel={score === null ? 'Duo Score: sem dados ainda' : `Duo Score ${score} de 100, ${band.label}`}>
                  <Text style={[styles.scoreNumber, { color: bandColor }]}>{score === null ? '—' : score}</Text>
                  <View style={styles.scoreSide}>
                    <Text style={styles.scoreOf}>de 100</Text>
                    <Text style={[styles.band, { color: bandColor }]}>{band.label}</Text>
                  </View>
                </View>
                <View style={styles.bar}>
                  <View style={[styles.barFill, { width: `${score ?? 0}%`, backgroundColor: bandColor }]} />
                </View>
                {report && report.missing.length > 0 && (
                  <View style={styles.missingBox}>
                    {report.missing.map((m) => (
                      <View key={m} style={styles.missingRow}>
                        <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.missingText}>{m.charAt(0).toUpperCase() + m.slice(1)}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  style={styles.whyBtn}
                  onPress={() => { animateLayout(); setWhy((v) => !v); }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: why }}
                  accessibilityLabel="Por que este número?"
                >
                  <Text style={styles.whyText}>Por que este número?</Text>
                  <Ionicons name={why ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.primary} />
                </TouchableOpacity>
                {why && report && (
                  <View style={styles.why}>
                    <Text style={styles.muted}>
                      O score é a média ponderada só dos itens que têm dados. Item sem registro não conta contra você.
                    </Text>
                    {report.components.map((c) => (
                      <View key={c.id} style={styles.compRow}>
                        <View style={styles.compHead}>
                          <Text style={styles.compLabel}>{c.label}</Text>
                          <Text style={styles.compValue}>{c.present ? `${c.value}/100` : 'sem dados'}</Text>
                        </View>
                        <Text style={styles.compDetail}>
                          {c.present ? `${c.detail}. Peso no cálculo: ${c.share}%, soma ${String(c.points).replace('.', ',')} pontos.` : `Fora do cálculo: ${c.detail}.`}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
            <View style={styles.noticeRow}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.noticeText}>{SCORE_DISCLAIMER}</Text>
            </View>
          </View>

          {/* Relatório semanal */}
          {report && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Relatório da semana</Text>
              {report.categories.map((c) => (
                <View key={c.id} style={styles.catRow} accessible accessibilityLabel={`${c.label}: ${c.value === null ? 'sem dados' : `${c.value} de 100, ${c.grade}`}`}>
                  <View style={styles.catHead}>
                    <Text style={styles.catLabel}>{c.label}</Text>
                    <Text style={styles.catGrade}>{c.value === null ? 'Sem dados' : `${c.value} · ${c.grade}`}</Text>
                  </View>
                  <View style={styles.barSmall}>
                    <View style={[styles.barFill, { width: `${c.value ?? 0}%`, backgroundColor: BAND_COLOR[scoreBand(c.value).id] }]} />
                  </View>
                </View>
              ))}
              <Text style={styles.subTitle}>Recomendações</Text>
              {report.recommendations.map((r) => (
                <View key={r} style={styles.recRow}>
                  <Ionicons name="bulb-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.recText}>{r}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Peso (não para menores de 18) */}
          {minor ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Só hábitos</Text>
              <Text style={styles.muted}>Para menores de 18 anos, o Duo Score considera apenas treinos e hidratação. Não acompanhamos peso nem metas de peso.</Text>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Evolução do peso</Text>
              {series.length === 0 ? (
                <Text style={styles.muted}>Nenhum registro ainda. Use o campo abaixo para registrar o peso de hoje.</Text>
              ) : (
                <>
                  <Text style={styles.big} accessibilityLabel={`Último peso: ${formatKg(lastWeight.kg)}`}>{formatKg(lastWeight.kg)}</Text>
                  {trend ? (
                    <Text style={styles.muted}>
                      {trend.delta === 0 ? 'Estável' : `${trend.delta > 0 ? '+' : ''}${String(trend.delta).replace('.', ',')} kg`} em {trend.days} {trend.days === 1 ? 'dia' : 'dias'}
                    </Text>
                  ) : (
                    <Text style={styles.muted}>Registre de novo em outro dia para ver a tendência.</Text>
                  )}
                  <WeightChart series={series} />
                </>
              )}
            </View>
          )}

          {/* Água */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Água de hoje</Text>
            <View style={styles.waterRow}>
              <TouchableOpacity
                style={styles.roundBtn}
                onPress={() => update((h) => addGlass(h, -1, today))}
                accessibilityRole="button"
                accessibilityLabel="Tirar um copo"
              >
                <Ionicons name="remove" size={22} color={COLORS.white} />
              </TouchableOpacity>
              <View style={styles.waterCenter} accessible accessibilityLabel={`${glasses} de ${goal} copos`}>
                <Text style={styles.big}>{glasses}<Text style={styles.bigOf}> / {goal}</Text></Text>
                <Text style={styles.muted}>copos</Text>
              </View>
              <TouchableOpacity
                style={[styles.roundBtn, styles.roundBtnPrimary]}
                onPress={() => update((h) => addGlass(h, 1, today))}
                accessibilityRole="button"
                accessibilityLabel="Adicionar um copo"
              >
                <Ionicons name="add" size={22} color={COLORS.black} />
              </TouchableOpacity>
            </View>
            <View style={styles.glasses} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {Array.from({ length: Math.max(goal, glasses) }).map((_, i) => (
                <Ionicons key={i} name={i < glasses ? 'water' : 'water-outline'} size={22} color={i < glasses ? COLORS.primary : COLORS.textMuted} />
              ))}
            </View>
            <View style={styles.goalRow}>
              <Text style={styles.goalText}>Meta diária: {goal} copos</Text>
              <TouchableOpacity style={styles.smallBtn} onPress={() => update((h) => setWaterGoal(h, h.waterGoal - 1))} accessibilityRole="button" accessibilityLabel="Diminuir a meta de copos">
                <Ionicons name="remove" size={18} color={COLORS.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallBtn} onPress={() => update((h) => setWaterGoal(h, h.waterGoal + 1))} accessibilityRole="button" accessibilityLabel="Aumentar a meta de copos">
                <Ionicons name="add" size={18} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Integração futura (desabilitada) */}
          <View style={[styles.card, styles.disabledCard]} accessible accessibilityState={{ disabled: true }} accessibilityLabel={`${CONNECT_CARD.title}: ${CONNECT_CARD.status}. Indisponível por enquanto.`}>
            <Ionicons name="heart-circle-outline" size={28} color={COLORS.textMuted} />
            <View style={styles.connectText}>
              <Text style={styles.connectTitle}>{CONNECT_CARD.title}</Text>
              <Text style={styles.muted}>{CONNECT_CARD.status}</Text>
            </View>
          </View>

          <View style={styles.noticeRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.noticeText}>{PRIVACY_NOTE}</Text>
          </View>
        </ScrollView>

        {/* Campo de peso sempre visível, acima do teclado */}
        {!minor && (
          <View style={styles.weightBar}>
            <View style={styles.weightRow}>
              <TextInput
                style={styles.input}
                value={weightText}
                onChangeText={(t) => { setWeightText(t); setWeightMsg(null); }}
                keyboardType="decimal-pad"
                placeholder="Peso de hoje (kg), ex.: 78,5"
                placeholderTextColor={COLORS.textSecondary}
                returnKeyType="done"
                onSubmitEditing={registerWeight}
                accessibilityLabel="Peso de hoje em quilos"
              />
              <TouchableOpacity style={styles.okBtn} onPress={registerWeight} accessibilityRole="button" accessibilityLabel="Registrar peso">
                <Text style={styles.okBtnText}>Registrar</Text>
              </TouchableOpacity>
            </View>
            {weightMsg ? (
              <Text style={[styles.feedback, !weightMsg.ok && styles.feedbackWarn]} accessibilityLiveRegion="polite">{weightMsg.text}</Text>
            ) : null}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  backBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -SPACING.sm },
  headerText: { flex: 1 },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },
  subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  content: { padding: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.xl, gap: SPACING.md },
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.sm },
  cardTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  subTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1, marginTop: SPACING.sm, textTransform: 'uppercase' },
  muted: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 19 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.md },
  scoreNumber: { fontSize: 56, fontWeight: '700', lineHeight: 64 },
  scoreSide: { paddingBottom: SPACING.sm },
  scoreOf: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  band: { fontSize: FONTS.sizes.lg, fontWeight: '700' },
  bar: { height: 10, borderRadius: 5, backgroundColor: COLORS.bgCardAlt, overflow: 'hidden' },
  barSmall: { height: 6, borderRadius: 3, backgroundColor: COLORS.bgCardAlt, overflow: 'hidden', marginTop: 4 },
  barFill: { height: '100%', borderRadius: 5 },
  missingBox: { gap: 4, paddingVertical: SPACING.xs },
  missingRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  missingText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.white },
  whyBtn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  whyText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },
  why: { gap: SPACING.sm },
  compRow: { gap: 2, paddingVertical: SPACING.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  compHead: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
  compLabel: { flex: 1, fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.white },
  compValue: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },
  compDetail: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, lineHeight: 16 },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs },
  noticeText: { flex: 1, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, lineHeight: 16 },
  catRow: { paddingVertical: SPACING.xs },
  catHead: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
  catLabel: { fontSize: FONTS.sizes.md, color: COLORS.white, fontWeight: '600' },
  catGrade: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  recRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  recText: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.white, lineHeight: 22 },
  big: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },
  bigOf: { fontSize: FONTS.sizes.lg, fontWeight: '400', color: COLORS.textSecondary },
  waterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.md },
  waterCenter: { alignItems: 'center', flex: 1 },
  roundBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgCardAlt, borderWidth: 1, borderColor: COLORS.border },
  roundBtnPrimary: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  glasses: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  goalText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  smallBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgCardAlt, borderWidth: 1, borderColor: COLORS.border },
  disabledCard: { flexDirection: 'row', alignItems: 'center', opacity: 0.6 },
  connectText: { flex: 1 },
  connectTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textSecondary },
  weightBar: { backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, gap: SPACING.xs },
  weightRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  input: { flex: 1, minHeight: 48, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgCardAlt, color: COLORS.white, paddingHorizontal: SPACING.md, fontSize: FONTS.sizes.md },
  okBtn: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md },
  okBtnText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.black },
  feedback: { fontSize: FONTS.sizes.sm, color: COLORS.success },
  feedbackWarn: { color: COLORS.warning },
});
