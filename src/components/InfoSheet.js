import React, { useCallback, useRef } from 'react';
import {
  AccessibilityInfo, findNodeHandle, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import useReduceMotion from '../hooks/useReduceMotion';

// Folha de ajuda: cartão na parte de baixo da tela (Modal do React Native, sem dependência nova).
// Fecha ao tocar fora, no botão "Fechar" e no botão voltar do Android (onRequestClose). Ao abrir, o foco do leitor
// de tela vai para o título. Sem animação com "Reduzir movimento". O texto vem de src/data/infoContent.js.
export default function InfoSheet({ visible, onClose, titulo, blocks }) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const titleRef = useRef(null);

  // Foco do leitor de tela no título ao abrir. Na web o findNodeHandle não existe; nunca deve derrubar a tela.
  const focusTitle = useCallback(() => {
    try {
      if (Platform.OS === 'web') { titleRef.current?.focus?.(); return; }
      const node = titleRef.current && findNodeHandle(titleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus?.(node);
    } catch (e) { /* sem foco automático: a folha continua utilizável */ }
  }, []);

  return (
    <Modal
      visible={!!visible}
      transparent
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
      onShow={focusTitle}
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar ajuda" />
        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.md }]}
          accessibilityViewIsModal
          testID="info-sheet"
        >
          <View style={styles.grabber} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          <Text ref={titleRef} style={styles.title} accessibilityRole="header" accessible>{titulo}</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.content}>
            {(blocks || []).map((b, i) => <Block key={i} block={b} />)}
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar">
            <Text style={styles.closeText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Block({ block }) {
  switch (block.type) {
    case 'heading':
      return <Text style={styles.heading} accessibilityRole="header">{block.text}</Text>;
    case 'text':
      return <Text style={styles.text}>{block.text}</Text>;
    case 'list':
      return (
        <View style={styles.list}>
          {block.items.map((it, i) => (
            <View key={i} style={styles.listRow}>
              <Text style={styles.bullet} accessibilityElementsHidden importantForAccessibility="no">•</Text>
              <Text style={styles.listText}>{it}</Text>
            </View>
          ))}
        </View>
      );
    case 'steps':
      return (
        <View style={styles.list}>
          {block.items.map((s, i) => (
            <View key={i} style={styles.stepRow} accessible accessibilityLabel={`Passo ${i + 1}: ${s.titulo}. ${s.conta}`}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
              <View style={styles.stepBody}>
                <Text style={styles.stepTitle}>{s.titulo}</Text>
                <Text style={styles.stepConta}>{s.conta}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    case 'scale':
      return <Scale block={block} />;
    case 'notice':
      return (
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.noticeText}>{block.text}</Text>
        </View>
      );
    default:
      return null;
  }
}

// Escala de faixas do IMC: barra com a posição marcada e, abaixo, cada faixa em TEXTO (não só cor).
function Scale({ block }) {
  const here = block.bands.find((b) => b.here);
  return (
    <View accessible accessibilityLabel={`Seu IMC, ${block.value}, está na faixa ${here?.label}, ${here?.range}`}>
      <View style={styles.scaleBar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {block.bands.map((b) => (
          <View key={b.id} style={[styles.scaleSeg, { backgroundColor: b.color, opacity: b.here ? 1 : 0.35 }]} />
        ))}
        <View style={[styles.marker, { left: `${Math.round(block.position * 100)}%` }]}>
          <View style={styles.markerDot} />
        </View>
      </View>
      <View style={styles.bands}>
        {block.bands.map((b) => (
          <View key={b.id} style={[styles.bandRow, b.here && styles.bandRowHere]}>
            <View style={[styles.bandSwatch, { backgroundColor: b.color }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            <View style={styles.bandText}>
              <Text style={[styles.bandLabel, b.here && styles.bandLabelHere]}>{b.label}</Text>
              <Text style={styles.bandRange}>{b.range}</Text>
            </View>
            {b.here && <Text style={styles.hereTag}>{`Você: ${block.value}`}</Text>}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { maxHeight: '88%', backgroundColor: COLORS.bgCard, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: SPACING.sm },
  title: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.white, marginBottom: SPACING.sm },
  scroll: { flexGrow: 0 },
  content: { gap: SPACING.sm, paddingBottom: SPACING.md },
  heading: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.primary, marginTop: SPACING.sm },
  text: { fontSize: FONTS.sizes.md, color: COLORS.textPrimary, lineHeight: 23 },
  list: { gap: SPACING.xs },
  listRow: { flexDirection: 'row', gap: SPACING.sm },
  bullet: { fontSize: FONTS.sizes.md, color: COLORS.primary, lineHeight: 23 },
  listText: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textPrimary, lineHeight: 23 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1A1700', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stepNumText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },
  stepBody: { flex: 1 },
  stepTitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  stepConta: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white, lineHeight: 22 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs, marginTop: SPACING.sm },
  noticeText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 19 },
  scaleBar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'visible', marginVertical: SPACING.sm },
  scaleSeg: { flex: 1, marginHorizontal: 1 },
  marker: { position: 'absolute', top: -4, width: 0, alignItems: 'center' },
  markerDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.white, borderWidth: 3, borderColor: COLORS.black },
  bands: { gap: SPACING.xs, marginTop: SPACING.sm },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.sm, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'transparent' },
  bandRowHere: { borderColor: COLORS.primary, backgroundColor: '#1A1700' },
  bandSwatch: { width: 12, height: 12, borderRadius: 6 },
  bandText: { flex: 1 },
  bandLabel: { fontSize: FONTS.sizes.md, color: COLORS.textPrimary },
  bandLabelHere: { fontWeight: '700', color: COLORS.white },
  bandRange: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  hereTag: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },
  closeBtn: { minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, marginTop: SPACING.xs },
  closeText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.black },
});

