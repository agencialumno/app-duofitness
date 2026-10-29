import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, LayoutAnimation, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, HEALTH_UI, SPACING } from '../utils/theme';
import useHealth from '../hooks/useHealth';
import CategoryCard from '../components/health/CategoryCard';
import { CategoryChips, NoDataGroup, QuickActions, ScoreHero, SuggestionsCard, WeeklyReport } from '../components/health/HealthParts';
import InfoButton from '../components/InfoButton';
import { SCORE_DISCLAIMER } from '../utils/health';
import { splitViews } from '../utils/healthView';
import { HEALTH_PRIVACY_LINES } from '../data/healthInfoContent';

const { space, type } = HEALTH_UI;

// Saúde, de cima para baixo: (a) Duo Score em destaque, (b) ações rápidas, (c) chips que rolam até cada categoria, (d) sugestões,
// (e) um cartão enxuto por categoria COM dados e, recolhidas, as categorias SEM dados, (f) relatório semanal recolhido e
// (g) avisos pequenos. Detalhes, explicação ("i") e histórico ficam na tela de detalhe. Tudo no aparelho; não é aconselhamento médico.
export default function HealthScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { loading, result, score, notes, views, coach, minor, addGlass } = useHealth();
  const scrollRef = useRef(null);
  const ys = useRef({ cats: 0, nodata: 0 });
  const [noDataOpen, setNoDataOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { if (alive) setReduceMotion(!!v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => setReduceMotion(!!v));
    return () => { alive = false; sub?.remove?.(); };
  }, []);

  // "Reduzir movimento": sem animação de layout nem rolagem animada.
  const animate = () => { if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); };
  const scrollToY = (y) => scrollRef.current?.scrollTo({ y: Math.max(y - space.inner, 0), animated: !reduceMotion });

  const { withData, noData } = splitViews(views);
  const openCategory = (category) => navigation.navigate('SaudeDetalhe', { category });
  const hydration = views.find((v) => v.id === 'hydration');
  const waterText = hydration && hydration.hasData && hydration.current && hydration.current.sub === 'Hoje' ? `Hoje: ${hydration.current.text}` : '';

  const selectChip = (id) => {
    const v = views.find((x) => x.id === id);
    if (v && v.hasData) {
      scrollToY(ys.current.cats + (ys.current[id] || 0));
    } else {
      animate();
      setNoDataOpen(true);
      scrollToY(ys.current.nodata);
    }
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
        <InfoButton tema="saude" />
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.xl }]}
      >
        {/* (a) Duo Score */}
        <View style={styles.firstSection}>
          <ScoreHero loading={loading} result={result} score={score} minor={minor} />
        </View>

        {/* (b) ações rápidas */}
        <View style={styles.section}>
          <QuickActions
            minor={minor}
            waterText={waterText}
            onRegister={() => navigation.navigate('SaudeDetalhe', { category: minor ? 'sleep' : 'body', register: true })}
            onWater={() => addGlass(1)}
            onConnect={() => navigation.navigate('SaudeConectar')}
          />
        </View>

        {/* (c) chips por categoria */}
        {!loading && views.length > 0 ? (
          <View style={styles.section}>
            <CategoryChips items={views} onSelect={selectChip} />
          </View>
        ) : null}

        {/* (d) sugestões */}
        {!loading && coach ? (
          <View style={styles.section}>
            <SuggestionsCard coach={coach} onToggle={animate} />
          </View>
        ) : null}

        {/* (e) categorias com dados e, recolhidas, as sem dados */}
        {!loading ? (
          <View style={styles.section}>
            <View style={styles.cards} onLayout={(e) => { ys.current.cats = e.nativeEvent.layout.y; }}>
              {withData.map((v) => (
                <View key={v.id} onLayout={(e) => { ys.current[v.id] = e.nativeEvent.layout.y; }}>
                  <CategoryCard view={v} testID={`health-card-${v.id}`} onPress={() => openCategory(v.id)} />
                </View>
              ))}
            </View>
            {noData.length > 0 ? (
              <View style={withData.length > 0 ? styles.afterCards : null}>
                <NoDataGroup
                  views={noData}
                  open={noDataOpen}
                  onToggle={() => { animate(); setNoDataOpen((v) => !v); }}
                  onOpenCategory={openCategory}
                  onLayout={(e) => { ys.current.nodata = e.nativeEvent.layout.y + ys.current.cats; }}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {/* (f) relatório semanal, recolhido por padrão */}
        {!loading && result ? (
          <View style={styles.section}>
            <WeeklyReport result={result} notes={notes} onToggle={animate} />
          </View>
        ) : null}

        {/* (g) avisos pequenos */}
        <View style={[styles.section, styles.legal]}>
          <View style={styles.noticeRow}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.noticeText}>{SCORE_DISCLAIMER}</Text>
          </View>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: space.screen, paddingBottom: SPACING.sm },
  backBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -SPACING.sm },
  headerText: { flex: 1 },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },
  subtitle: { ...type.support, color: COLORS.textSecondary },
  content: { paddingHorizontal: space.screen, paddingTop: space.inner },
  firstSection: { marginTop: space.inner },
  section: { marginTop: space.section },
  cards: { gap: space.cardGap },
  afterCards: { marginTop: space.cardGap },
  legal: { gap: space.inner },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.tight },
  noticeText: { flex: 1, ...type.caption, color: COLORS.textSecondary },
});
