import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { NOTIFICATIONS_ENABLED } from '../data/remindersConfig';

// Entrada para os ajustes de lembretes no Perfil. Sem a flag de notificações (build normal) não aparece.
export default function RemindersCard({ onPress }) {
  if (!NOTIFICATIONS_ENABLED) return null;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} accessibilityRole="button" accessibilityLabel="Lembretes de treino" testID="reminders-card">
      <Ionicons name="notifications-outline" size={22} color={COLORS.textSecondary} />
      <View style={styles.body}>
        <Text style={styles.title}>Lembretes de treino</Text>
        <Text style={styles.sub}>Horário, dias e silêncio</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  body: { flex: 1, gap: 2 },
  title: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.white },
  sub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
});
