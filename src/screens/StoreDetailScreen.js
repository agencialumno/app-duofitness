import React from 'react';
import { Alert, Linking, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MarketplaceImage from '../components/MarketplaceImage';
import { MARKETPLACE_CONFIG } from '../data/marketplaceConfig';
import { getCategoria, getItem, resolveContact } from '../data/marketplace';

// Detalhe de um item da vitrine. O contato acontece FORA do app (WhatsApp ou site do parceiro):
// o Duo Fitness não vende nem entrega os itens.
export default function StoreDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const item = getItem(route.params?.itemId);

  const back = (
    <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );

  if (!item) {
    return (
      <View style={styles.container}>
        {back}
        <View style={styles.missing}>
          <Text style={styles.missingTitle}>Item não encontrado</Text>
          <Text style={styles.missingText}>Este anúncio não está mais disponível na vitrine.</Text>
        </View>
      </View>
    );
  }

  const cat = getCategoria(item.categoria);
  const isWhatsApp = item.contato?.tipo === 'whatsapp';

  const openContact = async () => {
    const contact = resolveContact(item);
    if (!contact) {
      Alert.alert(
        'Contato ainda não configurado',
        isWhatsApp
          ? 'O número de WhatsApp deste parceiro ainda não foi configurado no app.'
          : 'O link deste parceiro não está disponível.',
      );
      return;
    }
    try {
      await Linking.openURL(contact.url);
    } catch (e) {
      Alert.alert(
        'Não foi possível abrir',
        isWhatsApp ? 'Verifique se o WhatsApp está instalado e tente de novo.' : 'Tente de novo em instantes.',
      );
    }
  };

  return (
    <View style={styles.container}>
      {back}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.imageWrap}>
          <MarketplaceImage imagem={item.imagem} categoria={item.categoria} iconSize={56} />
        </View>

        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{cat?.label}</Text>
          </View>
          {item.exemplo && (
            <View style={styles.tagMuted}>
              <Text style={styles.tagMutedText}>Item de exemplo</Text>
            </View>
          )}
        </View>

        <Text style={styles.title} accessibilityRole="header">{item.titulo}</Text>
        {item.preco ? <Text style={styles.price}>{item.preco}</Text> : null}

        <Text style={styles.sectionTitle}>Sobre o item</Text>
        <Text style={styles.description}>{item.descricaoCompleta}</Text>

        <TouchableOpacity
          style={styles.cta}
          onPress={openContact}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isWhatsApp ? 'Falar no WhatsApp' : 'Abrir o site do parceiro'}
          accessibilityHint={isWhatsApp ? 'Abre o WhatsApp em uma conversa com o parceiro' : 'Abre o site do parceiro no navegador'}
        >
          <Ionicons name={isWhatsApp ? 'logo-whatsapp' : 'open-outline'} size={22} color={COLORS.black} />
          <Text style={styles.ctaText}>{isWhatsApp ? 'Falar no WhatsApp' : 'Abrir o site do parceiro'}</Text>
        </TouchableOpacity>

        <View style={styles.notice} accessibilityRole="text">
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.noticeText}>{MARKETPLACE_CONFIG.partnerNotice}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  backBtn: { minWidth: 44, minHeight: 44, alignItems: 'flex-start', justifyContent: 'center' },
  content: { padding: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.xxl, gap: SPACING.md },
  imageWrap: { borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  tag: { backgroundColor: '#1A1700', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 4 },
  tagText: { fontSize: FONTS.sizes.xs, color: COLORS.primary, fontWeight: '600' },
  tagMuted: { backgroundColor: COLORS.bgCardAlt, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 4 },
  tagMutedText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontWeight: '600' },
  title: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.white },
  price: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.primary },
  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white, marginTop: SPACING.sm },
  description: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 24 },
  cta: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, marginTop: SPACING.md },
  ctaText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.black, flexShrink: 1, textAlign: 'center' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.xs },
  noticeText: { flex: 1, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, lineHeight: 16 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.lg },
  missingTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.white },
  missingText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center' },
});
