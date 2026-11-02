import React, { useMemo, useState } from 'react';
import { Alert, View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { buildHistoryView, confirmDeleteSeries } from '../utils/seriesView';
import ScreenHeader from '../components/ScreenHeader';

export default function WorkoutsScreen({ navigation }) {
  const { workouts, completedSessions, seriesStore, deleteSeries, user, ageInfo } = useApp();
  const getSessionCount = (id) => completedSessions.filter(s => s.workoutId === id).length;

  // Histórico de séries: a série ATUAL (a geração mais recente) em destaque e as anteriores recolhidas em "Séries anteriores".
  // Treinos criados à mão (sem série A/B/C) ficam em "Outros treinos", fora do histórico.
  const ageGroup = ageInfo?.ageGroup ?? user?.ageGroup;
  const view = useMemo(() => buildHistoryView({ store: seriesStore, workouts, sessions: completedSessions, ageGroup }), [seriesStore, workouts, completedSessions, ageGroup]);
  const [showPrevious, setShowPrevious] = useState(false);
  const [openPrevious, setOpenPrevious] = useState({});
  const rows = [];
  if (view.current) {
    rows.push({ key: 'cur-head', type: 'seriesHead', s: view.current });
    view.current.workouts.forEach((w) => rows.push({ key: `w-${w.id}`, type: 'workout', w }));
    rows.push({ key: 'cur-actions', type: 'seriesActions', s: view.current });
  }
  if (view.others.length > 0) {
    rows.push({ key: 'others-title', type: 'title', text: view.current ? 'Outros treinos' : 'Meus treinos' });
    view.others.forEach((w) => rows.push({ key: `w-${w.id}`, type: 'workout', w }));
  }
  if (view.previous.length > 0) {
    rows.push({ key: 'prev-toggle', type: 'prevToggle' });
    if (showPrevious) {
      view.previous.forEach((p) => {
        rows.push({ key: `ph-${p.id}`, type: 'prevHead', s: p });
        if (openPrevious[p.id]) {
          p.workouts.forEach((w) => rows.push({ key: `w-${w.id}`, type: 'workout', w }));
          rows.push({ key: `pa-${p.id}`, type: 'seriesActions', s: p, previous: true });
        }
      });
    }
  }
  const askDelete = (s) => confirmDeleteSeries(Alert, () => deleteSeries(s.id));
  const renderExtra = (row) => {
    if (row.type === 'title') return <Text style={styles.sectionTitle} accessibilityRole="header">{row.text}</Text>;
    if (row.type === 'seriesHead') {
      const s = row.s;
      return (
        <View style={styles.currentHead} testID="series-current">
          <Text style={styles.sectionTitle} accessibilityRole="header">Série atual</Text>
          <Text style={styles.seriesMeta}>{`${s.dateText} · Objetivo: ${s.goalsText} · Combo: ${s.comboText}`}</Text>
          <Text style={styles.seriesMeta}>{`Treinos concluídos: ${s.completed}`}</Text>
        </View>
      );
    }
    if (row.type === 'seriesActions') {
      const s = row.s;
      return (
        <View style={styles.actionsRow}>
          {!row.previous ? (
            <TouchableOpacity style={styles.linkBtn} accessibilityRole="button" accessibilityLabel="Ver evolução das séries" onPress={() => navigation.navigate('EvolucaoSeries')}>
              <Text style={styles.linkBtnText}>Ver evolução</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.linkBtn} accessibilityRole="button" accessibilityLabel={`Excluir a série de ${s.dateText}`} onPress={() => askDelete(s)} testID={`delete-${s.id}`}>
            <Text style={styles.dangerBtnText}>Excluir série</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (row.type === 'prevToggle') {
      return (
        <TouchableOpacity
          style={styles.toggleRow}
          accessibilityRole="button"
          accessibilityLabel={`Séries anteriores, ${view.previous.length}. ${showPrevious ? 'Recolher' : 'Expandir'}`}
          accessibilityState={{ expanded: showPrevious }}
          onPress={() => setShowPrevious((v) => !v)}
          testID="previous-toggle"
        >
          <Text style={styles.toggleTitle}>{`Séries anteriores (${view.previous.length})`}</Text>
          <Ionicons name={showPrevious ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      );
    }
    if (row.type === 'prevHead') {
      const s = row.s;
      const open = !!openPrevious[s.id];
      return (
        <TouchableOpacity
          style={styles.toggleRow}
          accessibilityRole="button"
          accessibilityLabel={`Série de ${s.dateText}, objetivo ${s.goalsText}, ${s.completed} treinos concluídos. ${open ? 'Recolher' : 'Expandir'}`}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpenPrevious((o) => ({ ...o, [s.id]: !o[s.id] }))}
        >
          <View style={styles.cardBody}>
            <Text style={styles.cardName}>{`Série de ${s.dateText}`}</Text>
            <Text style={styles.cardMetaText}>{`${s.goalsText} · ${s.comboText} · ${s.completed} concluídos`}</Text>
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        variant="root"
        title="Meus Treinos"
        right={(
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Criar treino" hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }} style={styles.addBtn} onPress={() => navigation.navigate('CreateWorkout')}>
            <Ionicons name="add" size={22} color={COLORS.black} />
          </TouchableOpacity>
        )}
      />

      {workouts.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="barbell-outline" size={36} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum treino ainda</Text>
          <Text style={styles.emptySub}>
            Use o Personal Trainer IA para criar séries A, B e C personalizadas para você.
          </Text>

          <TouchableOpacity accessibilityRole="button"
            style={styles.aiBtn}
            onPress={() => navigation.navigate('AIPersonalTrainer')}
          >
            <Ionicons name="sparkles-outline" size={20} color={COLORS.black} />
            <Text style={styles.aiBtnText}>Personal Trainer IA</Text>
          </TouchableOpacity>

          <TouchableOpacity accessibilityRole="button"
            style={styles.smartBtn}
            onPress={() => navigation.navigate('SmartPlan')}
          >
            <Ionicons name="options-outline" size={18} color={COLORS.primary} />
            <Text style={styles.smartBtnText}>Gerador rápido</Text>
          </TouchableOpacity>

          <TouchableOpacity accessibilityRole="button"
            style={styles.manualBtn}
            onPress={() => navigation.navigate('CreateWorkout')}
          >
            <Text style={styles.manualBtnText}>Criar manualmente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList showsVerticalScrollIndicator={false}
          data={rows}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.banners}>
              <TouchableOpacity accessibilityRole="button"
                style={styles.aiBanner}
                onPress={() => navigation.navigate('AIPersonalTrainer')}
              >
                <View style={styles.aiBannerLeft}>
                  <View style={styles.aiBannerIcon}>
                    <Ionicons name="sparkles" size={18} color={COLORS.black} />
                  </View>
                  <View>
                    <Text style={styles.aiBannerTitle}>Personal Trainer IA</Text>
                    <Text style={styles.aiBannerSub}>Criar novo plano personalizado</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.black} />
              </TouchableOpacity>
              {view.count > 0 ? (
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Ver evolução das séries" style={styles.evoBtn} onPress={() => navigation.navigate('EvolucaoSeries')}>
                  <Ionicons name="trending-up-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.evoBtnText}>Evolução das séries</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          renderItem={({ item: row }) => (row.type !== 'workout' ? renderExtra(row) : ((item) => (
            <TouchableOpacity accessibilityRole="button"
              style={styles.card}
              onPress={() => navigation.navigate('WorkoutDetail', { workout: item })}
              activeOpacity={0.8}
            >
              <View style={styles.cardSerie}>
                <Text style={styles.cardSerieText}>{item.serie || '—'}</Text>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardNameRow}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  {item.generatedByAI && (
                    <View style={styles.aiBadge}>
                      <Ionicons name="sparkles" size={10} color={COLORS.black} />
                      <Text style={styles.aiBadgeText}>IA</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardMetaText}>{item.exercises?.length || 0} exercícios</Text>
                  <Text style={styles.cardDot}>·</Text>
                  <Text style={styles.cardMetaText}>{item.category}</Text>
                  {getSessionCount(item.id) > 0 && (
                    <>
                      <Text style={styles.cardDot}>·</Text>
                      <Text style={styles.cardMetaText}>{getSessionCount(item.id)}x feito</Text>
                    </>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))(row.w))}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  list: { padding: SPACING.lg, paddingTop: SPACING.md, gap: SPACING.sm },
  banners: { gap: SPACING.sm, marginBottom: SPACING.sm },
  aiBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md,
  },
  aiBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  aiBannerIcon: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'center', alignItems: 'center' },
  aiBannerTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.black },
  aiBannerSub: { fontSize: FONTS.sizes.xs, color: 'rgba(0,0,0,0.6)', marginTop: 1 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
  },
  cardSerie: { width: 44, height: 44, borderRadius: RADIUS.sm, backgroundColor: '#1A1700', justifyContent: 'center', alignItems: 'center' },
  cardSerieText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.primary },
  cardBody: { flex: 1, gap: 4 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  cardName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.white, flex: 1 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 2 },
  aiBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.black },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  cardMetaText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  cardDot: { color: COLORS.textMuted, fontSize: FONTS.sizes.xs },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, gap: SPACING.md },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.sm },
  emptyTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.white },
  emptySub: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, marginTop: SPACING.sm,
    width: '100%', justifyContent: 'center',
  },
  aiBtnText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.black },
  smartBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.border, width: '100%', justifyContent: 'center',
  },
  smartBtnText: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.primary },
  manualBtn: { padding: SPACING.sm },
  manualBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, textDecorationLine: 'underline' },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.white, marginTop: SPACING.sm },
  currentHead: { gap: 2 },
  seriesMeta: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.sm },
  linkBtn: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: SPACING.sm },
  dangerBtnText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.error || '#FF6B6B', textDecorationLine: 'underline' },
  linkBtnText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary, textDecorationLine: 'underline' },
  toggleRow: {
    minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginTop: SPACING.xs,
  },
  toggleTitle: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.white },
  evoBtn: {
    minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  },
  evoBtnText: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.primary },
});
