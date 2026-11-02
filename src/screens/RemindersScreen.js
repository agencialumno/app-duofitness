import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { defaultWeekdays } from '../utils/reminders';
import { getPermission, loadNotifications, loadPrefs, requestPermission, savePrefs, stopAllReminders, syncReminders } from '../utils/remindersService';

const WEEK = [
  { id: 0, short: 'Dom', full: 'Domingo' }, { id: 1, short: 'Seg', full: 'Segunda-feira' }, { id: 2, short: 'Ter', full: 'Terça-feira' },
  { id: 3, short: 'Qua', full: 'Quarta-feira' }, { id: 4, short: 'Qui', full: 'Quinta-feira' }, { id: 5, short: 'Sex', full: 'Sexta-feira' }, { id: 6, short: 'Sáb', full: 'Sábado' },
];
const MIN_MINUTES = 8 * 60; // fora do silêncio (21h às 8h): de 08:00 até 20:30
const MAX_MINUTES = 20 * 60 + 30;
const pad = (n) => String(n).padStart(2, '0');

// Lembretes de treino e de inatividade (notificações locais). Tudo no aparelho: preferências em @duo_reminders, nenhum dado sai daqui.
export default function RemindersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { seriesStore } = useApp();
  const notifications = useMemo(() => loadNotifications(), []);
  const [prefs, setPrefs] = useState(null);
  const [permission, setPermission] = useState('unknown');
  const last = seriesStore?.items?.[seriesStore.items.length - 1];
  const seriesDays = last?.days;

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await loadPrefs(AsyncStorage);
      const perm = notifications ? await getPermission(notifications) : 'denied';
      if (alive) { setPrefs(p); setPermission(perm); }
    })();
    return () => { alive = false; };
  }, [notifications]);

  const apply = useCallback(async (patch) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    await savePrefs(AsyncStorage, next);
    await syncReminders({ storage: AsyncStorage, notifications, seriesDays, platform: Platform.OS });
  }, [prefs, notifications, seriesDays]);

  if (!prefs) return <View style={styles.container} />;

  const selected = prefs.days ?? defaultWeekdays(seriesDays);
  const minutes = prefs.hour * 60 + prefs.minute;
  const timeText = `${pad(prefs.hour)}:${pad(prefs.minute)}`;
  const shift = (delta) => {
    const m = Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, minutes + delta));
    apply({ hour: Math.floor(m / 60), minute: m % 60 });
  };
  const toggleDay = (id) => apply({ days: selected.includes(id) ? selected.filter((d) => d !== id) : [...selected, id].sort((a, b) => a - b) });
  const enable = async () => {
    const status = await requestPermission({ storage: AsyncStorage, notifications });
    setPermission(status === 'granted' ? 'granted' : 'denied');
    if (status === 'granted') await apply({ enabled: true });
  };
  const stop = async () => {
    await stopAllReminders({ storage: AsyncStorage, notifications });
    setPrefs((p) => ({ ...p, enabled: false }));
  };
  const needsPermission = permission !== 'granted';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">Lembretes</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.note}>Avisos gentis no seu aparelho, no máximo um por dia e nunca entre 21h e 8h. Nada disso sai do seu celular.</Text>

        {needsPermission ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>As notificações estão desligadas</Text>
            {prefs.permission === 'denied' || permission === 'denied' && prefs.askedAt ? (
              <>
                <Text style={styles.cardText}>Para receber lembretes, ative as notificações do Duo Fitness nos ajustes do seu celular.</Text>
                <TouchableOpacity style={styles.primaryBtn} accessibilityRole="button" accessibilityLabel="Abrir os ajustes do celular" onPress={() => Linking.openSettings()}>
                  <Text style={styles.primaryBtnText}>Abrir ajustes do celular</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.primaryBtn} accessibilityRole="button" accessibilityLabel="Ativar lembretes" onPress={enable}>
                <Text style={styles.primaryBtnText}>Ativar lembretes</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        <View style={styles.row}>
          <Text style={styles.label}>Lembretes de treino</Text>
          <Switch value={prefs.enabled} onValueChange={(v) => apply({ enabled: v })} accessibilityLabel="Lembretes ligados" accessibilityRole="switch" />
        </View>

        <Text style={styles.section} accessibilityRole="header">Horário</Text>
        <View style={styles.timeRow}>
          <TouchableOpacity style={styles.stepBtn} accessibilityRole="button" accessibilityLabel="Horário mais cedo" onPress={() => shift(-30)}>
            <Ionicons name="remove" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.time} accessibilityLiveRegion="polite" accessibilityLabel={`Horário do lembrete: ${timeText}`}>{timeText}</Text>
          <TouchableOpacity style={styles.stepBtn} accessibilityRole="button" accessibilityLabel="Horário mais tarde" onPress={() => shift(30)}>
            <Ionicons name="add" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <Text style={styles.section} accessibilityRole="header">Dias</Text>
        <View style={styles.daysRow}>
          {WEEK.map((d) => {
            const on = selected.includes(d.id);
            return (
              <TouchableOpacity
                key={d.id}
                style={[styles.dayChip, on && styles.dayChipOn]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={d.full}
                onPress={() => toggleDay(d.id)}
              >
                <Text style={[styles.dayText, on && styles.dayTextOn]}>{d.short}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.hint}>O padrão são os dias da sua série. Se você ficar alguns dias sem abrir o app, mando um lembrete gentil no 3º, 7º e 14º dia, e depois paro.</Text>

        <TouchableOpacity style={styles.stopBtn} accessibilityRole="button" accessibilityLabel="Parar todos os lembretes" onPress={stop}>
          <Text style={styles.stopText}>Parar todos os lembretes</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  backBtn: { minWidth: 44, minHeight: 44, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgCard },
  title: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.white, flex: 1 },
  content: { padding: SPACING.lg, paddingTop: 0, gap: SPACING.md },
  note: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.sm },
  cardTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  cardText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },
  primaryBtn: { minHeight: 44, borderRadius: RADIUS.full, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg },
  primaryBtnText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.black },
  row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: FONTS.sizes.md, color: COLORS.white, fontWeight: '600', flex: 1 },
  section: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white, marginTop: SPACING.sm },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  stepBtn: { minWidth: 44, minHeight: 44, borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  time: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.white, minWidth: 80, textAlign: 'center' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  dayChip: { minWidth: 44, minHeight: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.sm },
  dayChipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary },
  dayTextOn: { color: COLORS.black },
  hint: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, lineHeight: 18 },
  stopBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.md },
  stopText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.error, textDecorationLine: 'underline' },
});
