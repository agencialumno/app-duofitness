import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { goToHome, resetToWelcome } from '../navigation/resetNavigation';

export const DEMO_LABEL = 'Modo Demo: dados de exemplo';

// "Reiniciar demo" e "Sair". Sem confirmação: no demo não há dado real a perder.
export function useDemoActions(navigation) {
  const { restartDemo, resetAll } = useApp();
  const [busy, setBusy] = useState(false);

  const restart = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (await restartDemo()) goToHome(navigation);
    } catch (e) {
      console.log('Erro ao reiniciar o demo:', e);
    }
    setBusy(false);
  };

  // Limpa todas as chaves @duo_*, zera o estado e volta às boas-vindas.
  const exit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await resetAll();
      resetToWelcome(navigation);
    } catch (e) {
      console.log('Erro ao sair do demo:', e);
    }
    setBusy(false);
  };

  return { restart, exit, busy };
}

// Faixa fina fixa no topo da Home (só no Modo Demo). Respeita a área segura de cima.
export function DemoBanner({ navigation }) {
  const insets = useSafeAreaInsets();
  const { restart, exit, busy } = useDemoActions(navigation);
  return (
    <View style={[styles.banner, { paddingTop: insets.top + SPACING.xs }]} accessibilityRole="summary">
      <View style={styles.row}>
        <Ionicons name="flask-outline" size={14} color={COLORS.black} />
        <Text style={styles.text}>{DEMO_LABEL}</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={restart}
          disabled={busy}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel="Reiniciar demo"
        >
          <Text style={styles.btnText}>Reiniciar demo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btn}
          onPress={exit}
          disabled={busy}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel="Sair do demo"
        >
          <Text style={styles.btnText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Cartão do Perfil com as mesmas duas ações.
export function DemoCard({ navigation }) {
  const { restart, exit, busy } = useDemoActions(navigation);
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Ionicons name="flask-outline" size={18} color={COLORS.primary} />
        <Text style={styles.cardTitle}>{DEMO_LABEL}</Text>
      </View>
      <Text style={styles.cardText}>Estes dados são fictícios. Reinicie para voltar ao ponto de partida ou saia para voltar às boas-vindas.</Text>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.cardBtn} onPress={restart} disabled={busy} accessibilityRole="button" accessibilityLabel="Reiniciar demo">
          <Ionicons name="refresh-outline" size={16} color={COLORS.black} />
          <Text style={styles.cardBtnText}>Reiniciar demo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.cardBtn, styles.cardBtnOutline]} onPress={exit} disabled={busy} accessibilityRole="button" accessibilityLabel="Sair do demo">
          <Ionicons name="log-out-outline" size={16} color={COLORS.primary} />
          <Text style={[styles.cardBtnText, styles.cardBtnTextOutline]}>Sair do demo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingBottom: SPACING.xs },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: SPACING.sm, minHeight: 32 },
  text: { flex: 1, minWidth: 120, fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.black },
  btn: { minHeight: 32, paddingHorizontal: SPACING.sm + 2, justifyContent: 'center', borderRadius: RADIUS.full, backgroundColor: COLORS.black },
  btnText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.primary },
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.primary, padding: SPACING.md, gap: SPACING.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  cardTitle: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  cardText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 19 },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  cardBtn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.md, borderRadius: RADIUS.full, backgroundColor: COLORS.primary },
  cardBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.primary },
  cardBtnText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.black },
  cardBtnTextOutline: { color: COLORS.primary },
});
