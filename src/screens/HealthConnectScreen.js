import React, { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import useHealth from '../hooks/useHealth';
import { ConfirmModal, Notice } from '../components/auth/AuthParts';
import { CONNECT_COPY } from '../data/healthConnectContent';
import { addSamples, disconnectAndErase, grantConsent } from '../utils/healthStore';

// Conectar dispositivos (iOS: Apple Saúde; Android: Health Connect). DESLIGADO enquanto EXPO_PUBLIC_HEALTH_INTEGRATION não for
// "true": mostra o que será lido e para quê, as permissões, que os dados ficam no aparelho, o consentimento explícito por categoria
// (nada vem marcado) e "Em breve". O botão "Conectar" fica desabilitado. Menores de 18 não veem a conexão.
// Nada aqui pede permissão ao sistema antes do consentimento e da integração ligada.
export default function HealthConnectScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { minor, integrationEnabled, provider, connection, changeConnection, update, health } = useHealth();
  const [picked, setPicked] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [askErase, setAskErase] = useState(false);

  const os = Platform.OS;
  const target = CONNECT_COPY.providers[os] || null; // web: sem provedor
  const enabled = integrationEnabled && !!target && !minor;
  const picks = Object.keys(picked).filter((k) => picked[k]);
  const canConnect = enabled && picks.length > 0 && !busy;

  const connect = async () => {
    if (!canConnect) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await provider.requestPermissions(picks); // só depois do consentimento marcado
      if (res.unavailable || res.granted.length === 0) {
        setMsg({ kind: 'error', text: 'Não foi possível conectar agora. Nada foi lido.' });
        return;
      }
      await changeConnection(grantConsent(connection, { provider: target.id, categories: res.granted }));
      const samples = await provider.readSamples({ categories: res.granted });
      if (samples) await update((h) => addSamples(h, samples));
      setMsg({ kind: 'success', text: 'Conectado. Os dados lidos ficam só neste aparelho.' });
    } catch (e) {
      setMsg({ kind: 'error', text: 'Não foi possível conectar agora. Nada foi lido.' });
    } finally {
      setBusy(false);
    }
  };

  const erase = async () => {
    setBusy(true);
    const r = disconnectAndErase(health, connection);
    await update(() => r.health);
    await changeConnection(r.connection);
    setAskErase(false);
    setBusy(false);
    setMsg({ kind: 'success', text: r.removed > 0 ? `Desconectado. ${r.removed} registros importados foram apagados.` : 'Desconectado. Não havia dados importados.' });
  };

  return (
    <View style={styles.container} testID="health-connect">
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title} accessibilityRole="header">{CONNECT_COPY.title}</Text>
          <Text style={styles.subtitle}>{target ? target.name : 'Apple Saúde e Health Connect'}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.xl }]}>
        {minor ? (
          <View style={styles.card}>
            <Text style={styles.muted} testID="connect-minor">{CONNECT_COPY.minorText}</Text>
          </View>
        ) : (
          <>
            {/* Aviso "Em breve": sempre que a integração estiver desligada */}
            {!integrationEnabled && (
              <View style={styles.soon} testID="connect-soon" accessible accessibilityLabel={`${CONNECT_COPY.soonTitle}. ${CONNECT_COPY.soonText}`}>
                <Ionicons name="time-outline" size={22} color={COLORS.primary} />
                <View style={styles.soonText}>
                  <Text style={styles.soonTitle}>{CONNECT_COPY.soonTitle}</Text>
                  <Text style={styles.muted}>{CONNECT_COPY.soonText}</Text>
                </View>
              </View>
            )}
            {!target && <Text style={styles.muted}>{CONNECT_COPY.webText}</Text>}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{CONNECT_COPY.readsTitle}</Text>
              {CONNECT_COPY.reads.map((r) => (
                <View key={r.category} style={styles.readRow}>
                  <Text style={styles.readLabel}>{r.label}</Text>
                  <Text style={styles.readItems}>{r.items.join(', ')}</Text>
                  <Text style={styles.muted}>{r.why}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{CONNECT_COPY.permissionsTitle}</Text>
              {CONNECT_COPY.permissions.map((p) => (
                <View key={p} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.bulletText}>{p}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{CONNECT_COPY.privacyTitle}</Text>
              {CONNECT_COPY.privacy.map((p) => (
                <View key={p} style={styles.bulletRow}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.bulletText}>{p}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.card, !enabled && styles.dim]} testID="connect-consent">
              <Text style={styles.cardTitle}>{CONNECT_COPY.consentTitle}</Text>
              <Text style={styles.muted}>{CONNECT_COPY.consentIntro}</Text>
              {CONNECT_COPY.reads.filter((r) => !(r.category === 'body' && minor)).map((r) => {
                const on = !!picked[r.category];
                return (
                  <TouchableOpacity
                    key={r.category}
                    testID={`consent-${r.category}`}
                    style={styles.checkRow}
                    onPress={enabled ? () => setPicked((s) => ({ ...s, [r.category]: !s[r.category] })) : undefined}
                    disabled={!enabled}
                    aria-disabled={!enabled}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on, disabled: !enabled }}
                    accessibilityLabel={`Permitir a leitura de ${r.label}`}
                  >
                    <View style={[styles.box, on && styles.boxOn]}>{on ? <Ionicons name="checkmark" size={18} color={COLORS.black} /> : null}</View>
                    <Text style={styles.checkText}>{r.label}</Text>
                  </TouchableOpacity>
                );
              })}
              <Text style={styles.muted}>{CONNECT_COPY.consentText}</Text>
              {enabled && picks.length === 0 ? <Text style={styles.muted}>{CONNECT_COPY.needCategory}</Text> : null}
              <TouchableOpacity
                testID="connect-button"
                style={[styles.okBtn, !canConnect && styles.disabled]}
                onPress={canConnect ? connect : undefined}
                disabled={!canConnect}
                aria-disabled={!canConnect}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canConnect, busy }}
                accessibilityLabel={`${CONNECT_COPY.connectButton}${integrationEnabled ? '' : ' (indisponível: em breve)'}`}
              >
                <Text style={styles.okBtnText}>{CONNECT_COPY.connectButton}</Text>
              </TouchableOpacity>
              {msg ? <Notice kind={msg.kind} text={msg.text} testID="connect-msg" /> : null}
            </View>

            {connection.provider ? (
              <View style={styles.card} testID="connect-disconnect">
                <Text style={styles.cardTitle}>{CONNECT_COPY.disconnectTitle}</Text>
                <Text style={styles.muted}>{CONNECT_COPY.disconnectText}</Text>
                <TouchableOpacity style={styles.dangerBtn} onPress={() => setAskErase(true)} accessibilityRole="button" accessibilityLabel={CONNECT_COPY.disconnectButton}>
                  <Text style={styles.dangerText}>{CONNECT_COPY.disconnectButton}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <ConfirmModal
        visible={askErase}
        danger
        title={CONNECT_COPY.disconnectTitle}
        confirmLabel={CONNECT_COPY.disconnectConfirm}
        busy={busy}
        onConfirm={erase}
        onCancel={() => setAskErase(false)}
      >
        <Text style={styles.muted}>{CONNECT_COPY.disconnectText}</Text>
      </ConfirmModal>
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
  dim: { opacity: 0.7 },
  cardTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  muted: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 19 },
  soon: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start', borderWidth: 1, borderColor: COLORS.primary, borderRadius: RADIUS.md, padding: SPACING.md, backgroundColor: COLORS.bgCard },
  soonText: { flex: 1, gap: 2 },
  soonTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.primary },
  readRow: { gap: 2, paddingVertical: SPACING.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  readLabel: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  readItems: { fontSize: FONTS.sizes.sm, color: COLORS.white },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  bulletText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 19 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 44 },
  box: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, borderColor: COLORS.textSecondary, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkText: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.white },
  okBtn: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md },
  disabled: { opacity: 0.45 },
  okBtnText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.black },
  dangerBtn: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.error },
  dangerText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.error },
});
