import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Ionicons } from '@expo/vector-icons';
import { getIMCCategory } from '../utils/imc';
import MarketplaceImage from '../components/MarketplaceImage';
import { MARKETPLACE_ITEMS, getDestaques } from '../data/marketplace';
import useOccupancy from '../hooks/useOccupancy';
import OccupancyCard, { ExampleBadge } from '../components/OccupancyCard';
import useHealth from '../hooks/useHealth';
import { DemoBanner } from '../components/DemoControls';
import { computeStreak, scoreBand } from '../utils/health';
import InfoButton from '../components/InfoButton';
import { buildImcSheet, showImcCategory } from '../utils/imcInfo';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, xp, getLevel, workouts, completedSessions, achievements } = useApp();
  // Sequência = dias seguidos com treino, pelas datas das sessões: a MESMA função da Saúde (computeStreak).
  // O contador gravado em @duo_streak segue existindo (conquistas), mas não é mais exibido aqui.
  const streakDays = computeStreak(completedSessions);
  const levelInfo = getLevel();
  const today = new Date().toDateString();
  const trainedToday = completedSessions.some(s => new Date(s.completedAt).toDateString() === today);
  const lastWorkout = workouts[workouts.length - 1];
  const xpProgress = levelInfo.nextXp
    ? Math.min(((xp % (levelInfo.nextXp / levelInfo.level)) / (levelInfo.nextXp / levelInfo.level)) * 100, 100)
    : 100;
  const occupancy = useOccupancy();
  const healthInfo = useHealth();
  const healthBand = scoreBand(healthInfo.score);
  const imcInfo = user?.imc ? getIMCCategory(parseFloat(user.imc)) : null;
  // Menor de 18 anos: as faixas de adultos não se aplicam; o rótulo e as cores de categoria ficam escondidos.
  const imcCategoryVisible = showImcCategory(user?.ageGroup);
  const imcColor = imcCategoryVisible ? imcInfo?.color : COLORS.white;

  return (
    <View style={styles.container}>
      {/* Modo Demo: faixa fixa no topo (já cobre a área segura de cima) */}
      {user?.isDemo && <DemoBanner navigation={navigation} />}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: user?.isDemo ? SPACING.sm : insets.top + SPACING.sm }]}>
        <View>
          <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0]}</Text>
          <Text style={styles.subGreeting}>
            {trainedToday ? 'Treino concluído hoje' : 'Pronto para treinar?'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.streakBadge} accessibilityLabel={`Sequência: ${streakDays} ${streakDays === 1 ? 'dia' : 'dias'} seguidos`}>
            <Ionicons name="flame" size={16} color={COLORS.primary} />
            <Text style={styles.streakNum}>{streakDays}</Text>
          </View>
          <InfoButton tema="sequencia" />
        </View>
      </View>

      {/* Level Card */}
      <View style={styles.levelCard}>
        <View style={styles.levelTop}>
          <View>
            <View style={styles.levelLabelRow}>
              <Text style={styles.levelLabel}>NÍVEL {levelInfo.level}</Text>
              <InfoButton tema="nivelXp" />
            </View>
            <Text style={styles.levelTitle}>{levelInfo.title}</Text>
          </View>
          <View style={styles.xpBadge}>
            <Ionicons name="star" size={12} color={COLORS.primary} />
            <Text style={styles.xpText}>{xp} XP</Text>
          </View>
        </View>
        <View style={styles.xpBar}>
          <View style={[styles.xpFill, { width: `${xpProgress}%` }]} />
        </View>
        {levelInfo.nextXp && (
          <Text style={styles.xpNext}>{levelInfo.nextXp - xp} XP para o próximo nível</Text>
        )}
      </View>

      {/* IMC Card */}
      {imcInfo && user?.weight && user?.height ? (
        <View style={[styles.imcCard, { borderColor: imcCategoryVisible ? imcInfo.color + '55' : COLORS.border }]}>
          <View style={styles.imcLeft}>
            <View style={styles.imcLabelRow}>
              <Text style={styles.imcLabel}>IMC</Text>
              <InfoButton tema="imc" blocks={buildImcSheet({ weight: user.weight, height: user.height, ageGroup: user.ageGroup }).blocks} />
            </View>
            <Text style={[styles.imcValue, { color: imcColor }]}>{user.imc}</Text>
            {imcCategoryVisible && <Text style={[styles.imcCat, { color: imcInfo.color }]}>{imcInfo.label}</Text>}
          </View>
          <View style={styles.imcDivider} />
          <View style={styles.imcRight}>
            <View style={styles.imcStatRow}>
              <Ionicons name="scale-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.imcStat}>{user.weight} kg</Text>
            </View>
            <View style={styles.imcStatRow}>
              <Ionicons name="resize-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.imcStat}>{user.height} cm</Text>
            </View>
            {user.ageGroup && (
              <View style={styles.imcStatRow}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.imcStat}>{user.ageGroup} anos</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        /* CTA para preencher dados físicos */
        <TouchableOpacity
          style={styles.imcCTA}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="body-outline" size={18} color={COLORS.primary} />
          <Text style={styles.imcCTAText}>Adicionar peso e altura para calcular seu IMC</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Treinos', value: completedSessions.length, icon: 'checkmark-circle-outline' },
          { label: 'Sequência', value: `${streakDays}d`, icon: 'flame-outline' },
          { label: 'Conquistas', value: achievements.length, icon: 'trophy-outline' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <Ionicons name={s.icon} size={18} color={COLORS.primary} />
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* IA Banner — sempre visível */}
      <TouchableOpacity
        style={styles.aiBanner}
        onPress={() => navigation.navigate('Workouts', { screen: 'AIPersonalTrainer' })}
        activeOpacity={0.85}
      >
        <View style={styles.aiBannerLeft}>
          <View style={styles.aiBannerIconWrap}>
            <Ionicons name="sparkles" size={22} color={COLORS.black} />
          </View>
          <View>
            <Text style={styles.aiBannerTitle}>Personal Trainer IA</Text>
            <Text style={styles.aiBannerSub}>Cria séries A, B e C personalizadas</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.black} />
      </TouchableOpacity>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>AÇÃO RÁPIDA</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.qActionSecondary}
          onPress={() => navigation.navigate('Workouts', { screen: 'SmartPlan' })}
        >
          <Ionicons name="options-outline" size={18} color={COLORS.primary} />
          <Text style={styles.qActionSecondaryText}>Gerador rápido</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.qActionSecondary}
          onPress={() => navigation.navigate('Workouts', { screen: 'CreateWorkout' })}
        >
          <Ionicons name="add-outline" size={18} color={COLORS.primary} />
          <Text style={styles.qActionSecondaryText}>Criar manualmente</Text>
        </TouchableOpacity>
      </View>

      {/* Academia agora: lotação (só números agregados; dados de exemplo ficam rotulados) */}
      <TouchableOpacity
        style={styles.gymCard}
        onPress={() => navigation.navigate('AcademiaAgora')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Academia agora. Abre a lotação da academia."
      >
        <View style={styles.gymHead}>
          <Ionicons name="people-outline" size={18} color={COLORS.primary} />
          <Text style={styles.gymTitle}>Academia agora</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </View>
        {occupancy.isMock && <ExampleBadge />}
        <OccupancyCard status={occupancy.status} reading={occupancy.reading} now={occupancy.now} />
      </TouchableOpacity>

      {/* Para você: vitrine de parceiros (dados locais, funciona offline e no Modo Demo) */}
      <Text style={styles.sectionTitleStrong} accessibilityRole="header">PARA VOCÊ</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.forYouScroll}
        contentContainerStyle={styles.forYouList}
      >
        {getDestaques(MARKETPLACE_ITEMS, 3).map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.forYouCard}
            onPress={() => navigation.navigate('LojaDetalhe', { itemId: item.id })}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`${item.titulo}. ${item.descricaoCurta}`}
            accessibilityHint="Abre os detalhes do item"
          >
            <MarketplaceImage imagem={item.imagem} categoria={item.categoria} iconSize={32} />
            <View style={styles.forYouBody}>
              <Text style={styles.forYouTitle} numberOfLines={2}>{item.titulo}</Text>
              <Text style={styles.forYouDesc} numberOfLines={2}>{item.descricaoCurta}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity
        style={styles.storeBtn}
        onPress={() => navigation.navigate('Loja')}
        accessibilityRole="button"
        accessibilityLabel="Ver marketplace"
      >
        <Ionicons name="storefront-outline" size={18} color={COLORS.primary} />
        <Text style={styles.storeBtnText}>Ver marketplace</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
      </TouchableOpacity>

      {/* Saúde: Duo Score (hábitos; não é avaliação médica) */}
      <TouchableOpacity
        style={styles.gymCard}
        onPress={() => navigation.navigate('Saude')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Saúde. ${healthInfo.score === null ? 'Duo Score ainda sem dados.' : `Duo Score ${healthInfo.score} de 100, ${healthBand.label}.`} Abre a área de saúde.`}
      >
        <View style={styles.gymHead}>
          <Ionicons name="heart-outline" size={18} color={COLORS.primary} />
          <Text style={styles.gymTitle}>Saúde</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </View>
        {healthInfo.isExample && <ExampleBadge />}
        <View style={styles.healthRow}>
          <Text style={styles.healthScore}>{healthInfo.loading || healthInfo.score === null ? '—' : healthInfo.score}</Text>
          <View style={styles.healthSide}>
            <Text style={styles.healthLabel}>Duo Score</Text>
            <Text style={styles.healthBand}>{healthInfo.loading ? 'Carregando…' : healthBand.label}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Último treino */}
      {lastWorkout && (
        <>
          <Text style={styles.sectionTitle}>ÚLTIMO TREINO</Text>
          <TouchableOpacity
            style={styles.workoutCard}
            onPress={() => navigation.navigate('Workouts', {
              screen: 'WorkoutDetail',
              params: { workout: lastWorkout },
            })}
          >
            <View style={styles.workoutCardIcon}>
              <Ionicons name="barbell-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.workoutCardBody}>
              <Text style={styles.workoutCardName}>{lastWorkout.name}</Text>
              <Text style={styles.workoutCardInfo}>
                {lastWorkout.exercises?.length || 0} exercícios · {lastWorkout.category}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </>
      )}

      {/* Conquistas */}
      {achievements.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>CONQUISTAS RECENTES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.achRow}>
              {achievements.slice(-5).reverse().map((a, i) => (
                <View key={i} style={styles.achCard}>
                  <Ionicons name="trophy" size={22} color={COLORS.primary} />
                  <Text style={styles.achTitle}>{a.title}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      )}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.lg },
  greeting: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },
  subGreeting: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  levelLabelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1A0F00', borderWidth: 1, borderColor: '#3A2A00', borderRadius: RADIUS.md, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  streakNum: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.primary },
  levelCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.sm },
  levelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  levelLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: 1.5, fontWeight: '600' },
  levelTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.white },
  xpBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1A1700', borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  xpText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },
  xpBar: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, marginBottom: SPACING.xs },
  xpFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  xpNext: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  imcCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.md },
  imcLeft: { gap: 2 },
  imcLabelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  imcLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 1.5 },
  imcValue: { fontSize: 32, fontWeight: '700', lineHeight: 36 },
  imcCat: { fontSize: FONTS.sizes.xs, fontWeight: '600' },
  imcDivider: { width: 1, height: 56, backgroundColor: COLORS.border },
  imcRight: { flex: 1, gap: SPACING.xs },
  imcStatRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  imcStat: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  imcCTA: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, marginBottom: SPACING.sm },
  imcCTAText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statCard: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, alignItems: 'center', gap: 4 },
  statValue: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.white },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  aiBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md },
  aiBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  aiBannerIconWrap: { width: 44, height: 44, borderRadius: RADIUS.sm, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'center', alignItems: 'center' },
  aiBannerTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.black },
  aiBannerSub: { fontSize: FONTS.sizes.xs, color: 'rgba(0,0,0,0.6)', marginTop: 2 },
  gymCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.md },
  gymHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  gymTitle: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  healthRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  healthScore: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },
  healthSide: { flex: 1 },
  healthLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  healthBand: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.primary },
  sectionTitleStrong: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.textSecondary, marginBottom: SPACING.sm, marginTop: SPACING.xs, letterSpacing: 1.5 },
  forYouScroll: { marginHorizontal: -SPACING.lg },
  forYouList: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  forYouCard: { width: 220, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  forYouBody: { padding: SPACING.sm, gap: 2 },
  forYouTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.white },
  forYouDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, lineHeight: 16 },
  storeBtn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, marginTop: SPACING.sm, marginBottom: SPACING.md, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.primary },
  storeBtnText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },
  sectionTitle: { fontSize: FONTS.sizes.xs, fontWeight: '600', color: COLORS.textMuted, marginBottom: SPACING.sm, marginTop: SPACING.xs, letterSpacing: 1.5 },
  quickActions: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  qActionSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  qActionSecondaryText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.primary },
  workoutCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  workoutCardIcon: { width: 40, height: 40, borderRadius: RADIUS.sm, backgroundColor: '#1A1700', justifyContent: 'center', alignItems: 'center' },
  workoutCardBody: { flex: 1 },
  workoutCardName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.white },
  workoutCardInfo: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  achRow: { flexDirection: 'row', gap: SPACING.sm, paddingBottom: SPACING.md },
  achCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, alignItems: 'center', gap: SPACING.xs, width: 90 },
  achTitle: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textAlign: 'center' },
});
