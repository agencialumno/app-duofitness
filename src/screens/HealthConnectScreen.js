import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import useHealth from '../hooks/useHealth';
import { ConfirmModal, Notice } from '../components/auth/AuthParts';
import { ANDROID_COPY, CONNECT_COPY } from '../data/healthConnectContent';
import { PRIVACY_URL } from '../data/authConfig';
import { openHealthConnectInPlayStore, openUrl } from '../utils/externalLinks';
import { CATEGORIES } from '../utils/healthModel';
import { disconnectAndErase, grantConsent } from '../utils/healthStore';
import { summarizeReport, updatedAtLabel } from '../utils/healthSync';

// Conectar dispositivos. iOS com a integração ligada (EXPO_PUBLIC_HEALTH_INTEGRATION=true e o módulo do HealthKit no build): fluxo REAL e SÓ
// LEITURA do Apple Saúde (inclui o Apple Watch pareado): explica o que será lido, consentimento por categoria (nada vem marcado), "Conectar ao
// Apple Saúde" e "Desconectar" (para de ler e apaga o que veio do HealthKit; o registro manual fica). Android, web e a integração desligada
// seguem como "Em breve"/indisponível (no Android com a integração ligada, o fluxo é o do Health Connect, também SÓ LEITURA: disponibilidade,
// permissões por categoria, desconectar), e menores de 18 não veem a conexão. Nada pede permissão ao sistema antes do consentimento.
export default function HealthConnectScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { minor, integrationEnabled, provider, connection, changeConnection, update, health, sync, lastSyncAt } = useHealth();
  const [picked, setPicked] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [askErase, setAskErase] = useState(false);
  const [availability, setAvailability] = useState('checking'); // Android: 'available' | 'update_required' | 'unavailable'
  const [perms, setPerms] = useState(null); // Android: categoria -> 'granted' | 'denied'
  const [notice, setNotice] = useState('');

  const os = Platform.OS;
  const target = CONNECT_COPY.providers[os] || null; // web: sem provedor
  const enabled = integrationEnabled && !!target && !minor;
  const android = os === 'android';
  const A = android ? ANDROID_COPY : null;
  const reads = A ? A.reads : CONNECT_COPY.reads;
  const hcReady = !android || availability === 'available';

  // Android: o Health Connect pode faltar (Android 13 e abaixo) ou precisar de atualização; e as permissões podem ter mudado fora do app.
  useEffect(() => {
    if (!(android && enabled) || typeof provider.availability !== 'function') return undefined;
    let alive = true;
    (async () => {
      const av = await provider.availability();
      if (!alive) return;
      setAvailability(av);
      if (av === 'available' && connection.provider) {
        const p = await provider.getPermissions(CATEGORIES.map((c) => c.id));
        if (alive) setPerms(p);
      }
    })();
    return () => { alive = false; };
  }, [android, enabled, provider, connection.provider]);

  const openPlayStore = async () => {
    setNotice('');
    if (!(await openHealthConnectInPlayStore())) setNotice(ANDROID_COPY.playStoreError);
  };
  const openPrivacy = async () => {
    setNotice('');
    if (!PRIVACY_URL) { setNotice(ANDROID_COPY.rationaleSoon); return; }
    if (!(await openUrl(PRIVACY_URL))) setNotice(ANDROID_COPY.rationaleError);
  };
  const picks = Object.keys(picked).filter((k) => picked[k]);
  const canConnect = enabled && hcReady && picks.length > 0 && !busy;
  const connectLabel = enabled && os === 'ios' ? CONNECT_COPY.connectButtonApple : A ? A.connectButton : CONNECT_COPY.connectButton;

  const connect = async () => {
    if (!canConnect) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await provider.requestPermissions(picks); // só depois do consentimento marcado; só leitura
      if (A && !res.unavailable && res.granted.length === 0) { setMsg({ kind: 'info', text: A.noneGranted }); return; } // Android: o app sabe que nada foi concedido
      if (res.unavailable || res.granted.length === 0) {
        setMsg({ kind: 'error', text: CONNECT_COPY.connectError });
        return;
      }
      await changeConnection(grantConsent(connection, { provider: target.id, categories: res.granted }));
      const r = await sync({ force: true }); // lê os últimos 30 dias; sem bloquear as outras telas
      if (!r || r.skipped) { setMsg({ kind: 'info', text: CONNECT_COPY.connectedNoRead }); return; }
      const sum = summarizeReport(r.report);
      if (A) {
        setPerms(Object.fromEntries(CATEGORIES.map((c) => [c.id, res.granted.includes(c.id) ? 'granted' : 'denied'])));
        if (res.denied.length > 0) { setMsg({ kind: 'info', text: `${A.partial}${sum.allEmpty ? ` ${A.noDataHelp}` : ''}` }); return; }
        if (sum.allEmpty) { setMsg({ kind: 'info', text: `${CONNECT_COPY.connectedEmpty} ${A.noDataHelp}` }); return; }
      }
      // vazio NÃO é erro nem "negado" (o iOS não diz): "sem dados ainda" e onde conferir
      if (sum.allEmpty) setMsg({ kind: 'info', text: `${CONNECT_COPY.connectedEmpty} ${CONNECT_COPY.noDataHelp}` });
      else if (sum.failed > 0) setMsg({ kind: 'info', text: `${CONNECT_COPY.connectedOk} ${CONNECT_COPY.connectedFailed}` });
      else setMsg({ kind: 'success', text: CONNECT_COPY.connectedOk });
    } catch (e) {
      setMsg({ kind: 'error', text: CONNECT_COPY.connectError });
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
    if (A) {
      // Android: retira as permissões pelo método da biblioteca. Só vale depois de reiniciar o app (limite do Health Connect); se não houver
      // o método, explica como retirar nas configurações do Health Connect.
      const rv = typeof provider.revokeAll === 'function' ? await provider.revokeAll() : { revoked: false };
      setPerms(null);
      setBusy(false);
      setMsg({ kind: 'success', text: `${r.removed > 0 ? `Desconectado. ${r.removed} registros importados foram apagados.` : 'Desconectado. Não havia dados importados.'} ${rv.revoked ? A.revokedNote : A.revokeManualNote}` });
      return;
    }
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
          <Text style={styles.subtitle}>{A ? A.subtitle : target ? target.name : 'Apple Saúde e Health Connect'}</Text>
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

            {A && enabled && availability === 'update_required' ? (
              <View style={styles.card} testID="connect-update">
                <Text style={styles.cardTitle}>{A.updateTitle}</Text>
                <Text style={styles.muted}>{A.updateText}</Text>
                <TouchableOpacity testID="connect-playstore" style={styles.okBtn} onPress={openPlayStore} accessibilityRole="button" accessibilityLabel={A.updateButton}>
                  <Text style={styles.okBtnText}>{A.updateButton}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {A && enabled && availability === 'unavailable' ? (
              <View style={styles.card} testID="connect-unavailable" accessible accessibilityLabel={`${A.unavailableTitle}. ${A.unavailableText}`}>
                <Text style={styles.cardTitle}>{A.unavailableTitle}</Text>
                <Text style={styles.muted}>{A.unavailableText}</Text>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{CONNECT_COPY.readsTitle}</Text>
              {reads.map((r) => (
                <View key={r.category} style={styles.readRow}>
                  <Text style={styles.readLabel}>{r.label}</Text>
                  <Text style={styles.readItems}>{r.items.join(', ')}</Text>
                  <Text style={styles.muted}>{r.why}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{CONNECT_COPY.permissionsTitle}</Text>
              {(A ? A.permissions : CONNECT_COPY.permissions).map((p) => (
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

            {A ? (
              <View style={styles.card} testID="connect-rationale">
                <Text style={styles.cardTitle}>{A.rationaleTitle}</Text>
                <Text style={styles.muted}>{A.rationaleText}</Text>
                <TouchableOpacity testID="connect-privacy-link" style={styles.linkBtn} onPress={openPrivacy} accessibilityRole="link" accessibilityLabel={A.rationaleButton}>
                  <Text style={styles.linkText}>{A.rationaleButton}</Text>
                </TouchableOpacity>
                {notice ? <Text style={styles.muted} accessibilityLiveRegion="polite" testID="connect-notice">{notice}</Text> : null}
              </View>
            ) : null}

            <View style={[styles.card, !enabled && styles.dim]} testID="connect-consent">
              <Text style={styles.cardTitle}>{CONNECT_COPY.consentTitle}</Text>
              <Text style={styles.muted}>{CONNECT_COPY.consentIntro}</Text>
              {reads.filter((r) => !(r.category === 'body' && minor)).map((r) => {
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
                accessibilityLabel={`${connectLabel}${integrationEnabled && target ? '' : ' (indisponível: em breve)'}`}
              >
                <Text style={styles.okBtnText}>{connectLabel}</Text>
              </TouchableOpacity>
              {msg ? <Notice kind={msg.kind} text={msg.text} testID="connect-msg" /> : null}
            </View>

            {connection.provider ? (
              <View style={styles.card} testID="connect-status">
                <Text style={styles.cardTitle}>{A ? A.connectedTitle : CONNECT_COPY.connectedTitle}</Text>
                {lastSyncAt ? <Text style={styles.muted} testID="connect-updated">{updatedAtLabel(lastSyncAt)}</Text> : null}
                {A && perms ? (
                  <View testID="connect-perms">
                    <Text style={styles.readLabel}>{A.statusTitle}</Text>
                    {CATEGORIES.filter((c) => !(c.id === 'body' && minor)).map((c) => (
                      <View key={c.id} style={styles.statusRow} accessible accessibilityLabel={`${c.label}: ${perms[c.id] === 'granted' ? A.active : A.inactive}`} testID={`perm-${c.id}`}>
                        <Ionicons name={perms[c.id] === 'granted' ? 'checkmark-circle' : 'remove-circle-outline'} size={18} color={perms[c.id] === 'granted' ? COLORS.success : COLORS.textSecondary} />
                        <Text style={styles.checkText}>{c.label}</Text>
                        <Text style={styles.muted}>{perms[c.id] === 'granted' ? A.active : A.inactive}</Text>
                      </View>
                    ))}
                    {CATEGORIES.some((c) => perms[c.id] !== 'granted') ? <Text style={styles.muted}>{A.inactiveHelp}</Text> : null}
                  </View>
                ) : null}
                <Text style={styles.muted}>{A ? A.watchText : CONNECT_COPY.watchText}</Text>
                {A ? <Text style={styles.muted} testID="connect-sync-hint">{A.syncHint}</Text> : null}
                <Text style={styles.muted} testID="connect-nodata-help">{A ? A.noDataHelp : CONNECT_COPY.noDataHelp}</Text>
              </View>
            ) : null}

            {connection.provider ? (
              <View style={styles.card} testID="connect-disconnect">
                <Text style={styles.cardTitle}>{CONNECT_COPY.disconnectTitle}</Text>
                <Text style={styles.muted}>{A ? A.disconnectText : CONNECT_COPY.disconnectText}</Text>
                {A ? (
                  <TouchableOpacity testID="connect-open-settings" style={styles.linkBtn} onPress={() => provider.openSettings && provider.openSettings()} accessibilityRole="button" accessibilityLabel={A.openSettingsButton}>
                    <Text style={styles.linkText}>{A.openSettingsButton}</Text>
                  </TouchableOpacity>
                ) : null}
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
        <Text style={styles.muted}>{A ? A.disconnectText : CONNECT_COPY.disconnectText}</Text>
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
  linkBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.primary, textDecorationLine: 'underline' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 36 },
  dangerBtn: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.error },
  dangerText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.error },
});
