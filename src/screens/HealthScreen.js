import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import useHealth from '../hooks/useHealth';
import CategoryCard from '../components/health/CategoryCard';
import { ExampleBadge } from '../components/OccupancyCard';
import InfoButton from '../components/InfoButton';
import { animateLayout } from '../components/guided/GuidedParts';
import { SCORE_DISCLAIMER, scoreBand } from '../utils/health';
import { CONNECT_CARD } from '../utils/healthProviders';
import { HEALTH_PRIVACY_LINES } from '../data/healthInfoContent';
import { COACH_TEXTS } from '../data/healthCoachTexts';

const BAND_COLOR = { great: COLORS.success, good: COLORS.primary, fair: COLORS.warning, low: COLORS.error, none: COLORS.textSecondary };

// Saúde: Resumo (Duo Score) + sugestões de hábitos + um cartão por categoria (composição corporal, atividade, sono, coração e
// recuperação, hidratação) + conexão com dispositivos (desligada). Tudo no aparelho; nada de aconselhamento médico.
export default function HealthScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { loading, result, score, notes, views, coach, minor, isExample } = useHealth();
  const [why, setWhy] = useState(false);

  const band = scoreBand(score);
  const bandColor = BAND_COLOR[band.id];
  const openCategory = (category) => navigation.navigate('SaudeDetalhe', { category });

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
        <InfoButton tema="saude" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.xl }]}>
        {isExample && <ExampleBadge />}

        {/* 1. Resumo: Duo Score */}
        <View style={styles.card} testID="health-summary">
          <View style={styles.titleRow}>
            <Text style={[styles.cardTitle, styles.titleFlex]}>Resumo · Duo Score</Text>
            <InfoButton tema="duoScore" />
          </View>
          {loading || !result ? (
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

              {notes.length > 0 && (
                <View style={styles.notes}>
                  {notes.map((c) => (
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
                </View>
              )}

              {result.missing.length > 0 && (
                <View style={styles.missingBox}>
                  <Text style={styles.subTitle}>O que falta</Text>
                  {result.missing.map((m) => (
                    <View key={m} style={styles.missingRow}>
                      <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.missingText}>{m.charAt(0).toUpperCase() + m.slice(1)}</Text>
                    </View>
                  ))}
                  <Text style={styles.muted}>Categoria sem dados não entra na conta e não diminui o seu score.</Text>
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
              {why && (
                <View style={styles.why}>
                  <Text style={styles.muted}>
                    O score é a média ponderada só dos itens que têm dados. Item sem registro não conta contra você.
                  </Text>
                  {result.components.map((c) => (
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

        {/* Sugestões de hábitos (regras, não IA) */}
        {coach && (
          <View style={styles.card} testID="health-coach">
            <Text style={styles.cardTitle}>{COACH_TEXTS.title}</Text>
            {coach.insufficient ? (
              <Text style={styles.muted}>{coach.message}</Text>
            ) : (
              <>
                <Text style={styles.muted}>{COACH_TEXTS.intro}</Text>
                {coach.suggestions.map((s) => (
                  <View key={s.id} style={styles.recRow} accessible accessibilityLabel={`${s.reason} ${s.action}`}>
                    <Ionicons name="bulb-outline" size={18} color={COLORS.primary} />
                    <View style={styles.recText}>
                      <Text style={styles.recReason}>{s.reason}</Text>
                      <Text style={styles.recAction}>{s.action}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {minor && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Só hábitos</Text>
            <Text style={styles.muted}>Para menores de 18 anos, a Saúde mostra apenas hábitos: atividade, sono, coração e recuperação e hidratação. Não acompanhamos peso, composição corporal nem metas.</Text>
          </View>
        )}

        {/* 2 a 6. Um cartão por categoria */}
        {!loading && views.map((v) => (
          <CategoryCard key={v.id} view={v} testID={`health-card-${v.id}`} onPress={() => openCategory(v.id)} />
        ))}

        {/* Conectar dispositivos (desligado; menores não veem) */}
        {!minor && (
          <TouchableOpacity
            testID="health-connect-card"
            style={[styles.card, styles.connectCard]}
            onPress={() => navigation.navigate('SaudeConectar')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${CONNECT_CARD.title}: ${CONNECT_CARD.status}. Abre a tela de conexão, hoje indisponível.`}
          >
            <Ionicons name="heart-circle-outline" size={28} color={COLORS.textSecondary} />
            <View style={styles.connectText}>
              <Text style={styles.connectTitle}>Conectar dispositivos</Text>
              <Text style={styles.muted}>Apple Saúde / Health Connect · em breve</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}

        <View style={styles.privacy}>
          {HEALTH_PRIVACY_LINES.map((t) => (
            <View key={t} style={styles.noticeRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.noticeText}>{t}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
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
  content: { padding: SPACING.lg, paddingTop: SPACING.sm, gap: SPACING.md },
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleFlex: { flex: 1 },
  cardTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  subTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
  muted: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 19 },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.md },
  scoreNumber: { fontSize: 56, fontWeight: '700', lineHeight: 64 },
  scoreSide: { paddingBottom: SPACING.sm },
  scoreOf: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  band: { fontSize: FONTS.sizes.lg, fontWeight: '700' },
  bar: { height: 10, borderRadius: 5, backgroundColor: COLORS.bgCardAlt, overflow: 'hidden' },
  barSmall: { height: 6, borderRadius: 3, backgroundColor: COLORS.bgCardAlt, overflow: 'hidden', marginTop: 4 },
  barFill: { height: '100%', borderRadius: 5 },
  notes: { gap: SPACING.xs },
  catRow: { paddingVertical: SPACING.xs },
  catHead: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm },
  catLabel: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.white, fontWeight: '600' },
  catGrade: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
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
  recRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  recText: { flex: 1, gap: 2 },
  recReason: { fontSize: FONTS.sizes.md, color: COLORS.white, lineHeight: 22 },
  recAction: { fontSize: FONTS.sizes.sm, color: COLORS.primary, lineHeight: 19, fontWeight: '600' },
  connectCard: { flexDirection: 'row', alignItems: 'center', opacity: 0.75 },
  connectText: { flex: 1 },
  connectTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textSecondary },
  privacy: { gap: SPACING.xs },
});
