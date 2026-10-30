import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Ionicons } from '@expo/vector-icons';

export default function WorkoutsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { workouts, completedSessions } = useApp();
  const getSessionCount = (id) => completedSessions.filter(s => s.workoutId === id).length;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <Text style={styles.title}>Meus Treinos</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Criar treino" hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }} style={styles.addBtn} onPress={() => navigation.navigate('CreateWorkout')}>
          <Ionicons name="add" size={22} color={COLORS.black} />
        </TouchableOpacity>
      </View>

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
          data={workouts}
          keyExtractor={item => item.id}
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
            </View>
          }
          renderItem={({ item }) => (
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
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.lg,
  },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, width: 38, height: 38, justifyContent: 'center', alignItems: 'center' },
  list: { padding: SPACING.lg, paddingTop: 0, gap: SPACING.sm },
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
});
