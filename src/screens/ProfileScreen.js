import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getIMCCategory } from '../utils/imc';
import { HEALTH_KEY } from '../utils/health';

const GOAL_LABELS = {
  lose_weight: 'Emagrecer',
  gain_muscle: 'Ganhar massa muscular',
  maintain: 'Condicionamento',
  health: 'Saúde geral',
};
const LEVEL_LABELS = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

function formatGoals(goals) {
  if (!goals || goals.length === 0) return '—';
  return goals.map(g => GOAL_LABELS[g] || g).join(' + ');
}

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, xp, streak, achievements, completedSessions, workouts, getLevel } = useApp();
  const levelInfo = getLevel();
  const imcInfo = user?.imc ? getIMCCategory(parseFloat(user.imc)) : null;

  const handleReset = () => {
    Alert.alert('Resetar dados', 'Isso vai apagar todos os seus treinos e progresso. Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Resetar tudo', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(HEALTH_KEY); // dados de saúde (@duo_health) também
          await AsyncStorage.clear();
          navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.sm }]}>

      {/* Avatar */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Image source={require('../../assets/logo.png')} style={styles.avatarLogo} resizeMode="contain" />
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userLevel}>Nível {levelInfo.level} · {levelInfo.title}</Text>
        <View style={styles.goalBadge}>
          <Ionicons name="flag-outline" size={12} color={COLORS.primary} />
          <Text style={styles.goalText}>{formatGoals(user?.goals)}</Text>
        </View>
      </View>

      {/* XP */}
      <View style={styles.xpCard}>
        <View style={styles.xpRow}>
          <Text style={styles.xpLabel}>XP TOTAL</Text>
          <View style={styles.xpBadge}>
            <Ionicons name="star" size={12} color={COLORS.primary} />
            <Text style={styles.xpValue}>{xp} XP</Text>
          </View>
        </View>
        <View style={styles.xpBar}>
          <View style={[styles.xpFill, { width: `${Math.min((xp / (levelInfo.nextXp || xp + 1)) * 100, 100)}%` }]} />
        </View>
        {levelInfo.nextXp && <Text style={styles.xpNext}>{levelInfo.nextXp - xp} XP para o próximo nível</Text>}
      </View>

      {/* Dados físicos */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>DADOS FÍSICOS</Text>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditBodyData')}
          >
            <Ionicons name="create-outline" size={16} color={COLORS.primary} />
            <Text style={styles.editBtnText}>{user?.weight ? 'Editar' : 'Adicionar'}</Text>
          </TouchableOpacity>
        </View>

        {user?.weight && user?.height && imcInfo ? (
          <View style={styles.bodyCard}>
            <View style={styles.bodyRow}>
              <View style={styles.bodyStat}>
                <Ionicons name="scale-outline" size={18} color={COLORS.primary} />
                <Text style={styles.bodyStatValue}>{user.weight} kg</Text>
                <Text style={styles.bodyStatLabel}>Peso</Text>
              </View>
              <View style={styles.bodyDivider} />
              <View style={styles.bodyStat}>
                <Ionicons name="resize-outline" size={18} color={COLORS.primary} />
                <Text style={styles.bodyStatValue}>{user.height} cm</Text>
                <Text style={styles.bodyStatLabel}>Altura</Text>
              </View>
              <View style={styles.bodyDivider} />
              <View style={styles.bodyStat}>
                <Ionicons name={imcInfo.icon} size={18} color={imcInfo.color} />
                <Text style={[styles.bodyStatValue, { color: imcInfo.color }]}>{user.imc}</Text>
                <Text style={styles.bodyStatLabel}>IMC</Text>
              </View>
            </View>
            <View style={[styles.imcBanner, { backgroundColor: imcInfo.color + '18', borderColor: imcInfo.color + '44' }]}>
              <Text style={[styles.imcBannerLabel, { color: imcInfo.color }]}>{imcInfo.label}</Text>
              <Text style={styles.imcBannerTip}>{imcInfo.tip}</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.bodyEmpty}
            onPress={() => navigation.navigate('EditBodyData')}
          >
            <Ionicons name="body-outline" size={24} color={COLORS.textMuted} />
            <Text style={styles.bodyEmptyText}>Adicionar peso e altura</Text>
            <Text style={styles.bodyEmptySub}>Necessário para calcular IMC e personalizar treinos</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ATIVIDADE</Text>
        <View style={styles.statsGrid}>
          {[
            { label: 'Treinos realizados', value: completedSessions.length, icon: 'checkmark-circle-outline' },
            { label: 'Sequência atual', value: `${streak} dias`, icon: 'flame-outline' },
            { label: 'Séries criadas', value: workouts.length, icon: 'barbell-outline' },
            { label: 'Conquistas', value: achievements.length, icon: 'trophy-outline' },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Ionicons name={s.icon} size={20} color={COLORS.primary} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Conquistas */}
      {achievements.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONQUISTAS</Text>
          <View style={styles.achGrid}>
            {achievements.map((a, i) => (
              <View key={i} style={styles.achCard}>
                <Ionicons name="trophy" size={24} color={COLORS.primary} />
                <Text style={styles.achTitle}>{a.title}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Perfil */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PERFIL</Text>
        <View style={styles.infoCard}>
          {[
            { label: 'Nível de condicionamento', value: LEVEL_LABELS[user?.level] || '—' },
            { label: 'Objetivo', value: formatGoals(user?.goals) },
            { label: 'Sexo biológico', value: user?.gender === 'male' ? 'Masculino' : user?.gender === 'female' ? 'Feminino' : '—' },
            { label: 'Faixa etária', value: user?.ageGroup ? `${user.ageGroup} anos` : '—' },
            { label: 'Membro desde', value: user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString('pt-BR') : '—' },
          ].map((item, i, arr) => (
            <View key={i}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
              {i < arr.length - 1 && <View style={styles.infoDivider} />}
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
        <Ionicons name="trash-outline" size={16} color={COLORS.error} />
        <Text style={styles.resetText}>Resetar todos os dados</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.lg },
  profileHeader: { alignItems: 'center', gap: SPACING.sm },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.black, borderWidth: 2, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarLogo: { width: 72, height: 72 },
  userName: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },
  userLevel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  goalBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1A1700', borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: 4, borderWidth: 1, borderColor: '#3A2A00' },
  goalText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '500' },
  xpCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.sm },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: 1.5, fontWeight: '600' },
  xpBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  xpValue: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },
  xpBar: { height: 4, backgroundColor: COLORS.border, borderRadius: 2 },
  xpFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  xpNext: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  section: { gap: SPACING.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 1.5 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '600' },
  bodyCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  bodyRow: { flexDirection: 'row', padding: SPACING.md },
  bodyStat: { flex: 1, alignItems: 'center', gap: 4 },
  bodyDivider: { width: 1, backgroundColor: COLORS.border },
  bodyStatValue: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.white },
  bodyStatLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  imcBanner: { padding: SPACING.md, borderTopWidth: 1, gap: 2 },
  imcBannerLabel: { fontSize: FONTS.sizes.sm, fontWeight: '700' },
  imcBannerTip: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, lineHeight: 18 },
  bodyEmpty: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm },
  bodyEmptyText: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textSecondary },
  bodyEmptySub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, textAlign: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  statCard: { width: '47%', backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, alignItems: 'center', gap: 4 },
  statValue: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.white },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, textAlign: 'center' },
  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  achCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, alignItems: 'center', gap: 4, width: '30%' },
  achTitle: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textAlign: 'center' },
  infoCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md },
  infoDivider: { height: 1, backgroundColor: COLORS.border },
  infoLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  infoValue: { fontSize: FONTS.sizes.sm, color: COLORS.white, fontWeight: '500' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.error, borderRadius: RADIUS.md },
  resetText: { color: COLORS.error, fontSize: FONTS.sizes.sm, fontWeight: '600' },
});
