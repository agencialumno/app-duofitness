import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import useOccupancy from '../hooks/useOccupancy';
import OccupancyCard, { ExampleBadge } from '../components/OccupancyCard';
import { formatHour } from '../utils/occupancy';

// "Academia agora": lotação em números agregados. Funciona offline (sem dados = "Sem dados no momento").
export default function GymNowScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { status, reading, best, now, refresh, isMock } = useOccupancy();
  const showExample = isMock || reading?.source === 'mock';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">Academia agora</Text>
          <Text style={styles.subtitle}>Lotação da academia do condomínio</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.xxl }]}>
        <View style={styles.card}>
          {showExample && <ExampleBadge />}
          <OccupancyCard status={status} reading={reading} now={now} large />
        </View>

        <View style={styles.card}>
          <View style={styles.tipHead}>
            <Ionicons name="time-outline" size={18} color={COLORS.primary} />
            <Text style={styles.tipTitle}>Melhor horário</Text>
          </View>
          {best ? (
            <>
              {best.source === 'mock' && <ExampleBadge />}
              <Text style={styles.tipText}>
                {best.tomorrow ? 'Amanhã, ' : 'Hoje, '}por volta das {formatHour(best.hour)} tende a estar{' '}
                {best.state?.label?.toLowerCase()}.
              </Text>
            </>
          ) : (
            <Text style={styles.tipMuted}>Sem previsão no momento.</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={refresh}
          accessibilityRole="button"
          accessibilityLabel="Atualizar lotação"
        >
          <Ionicons name="refresh-outline" size={18} color={COLORS.primary} />
          <Text style={styles.refreshText}>Atualizar</Text>
        </TouchableOpacity>

        <View style={styles.notice}>
          <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.noticeText}>
            Mostramos só a contagem de pessoas, sem identificar ninguém.
            {showExample ? ' Os números acima são de exemplo e não representam a academia real.' : ''}
          </Text>
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
  tipHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  tipTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  tipText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 22 },
  tipMuted: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  refreshBtn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.primary },
  refreshText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs },
  noticeText: { flex: 1, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, lineHeight: 16 },
});
