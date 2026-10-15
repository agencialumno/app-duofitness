import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MarketplaceImage from '../components/MarketplaceImage';
import { MARKETPLACE_CONFIG } from '../data/marketplaceConfig';
import {
  CATEGORIAS,
  MARKETPLACE_ITEMS,
  TODAS,
  countByCategory,
  filterByCategory,
  getCategoria,
} from '../data/marketplace';

// Loja = VITRINE de parceiros: sem pagamento nem entrega no app. Funciona 100% offline (dados locais).
export default function StoreScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [categoria, setCategoria] = useState(TODAS);

  const counts = useMemo(() => countByCategory(MARKETPLACE_ITEMS), []);
  const items = useMemo(() => filterByCategory(MARKETPLACE_ITEMS, categoria), [categoria]);

  const chips = [{ id: TODAS, label: 'Todos' }, ...CATEGORIAS];

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
          <Text style={styles.title} accessibilityRole="header">Loja</Text>
          <Text style={styles.subtitle}>Vitrine de parceiros do Duo Fitness</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.chips} accessibilityRole="tablist">
          {chips.map((c) => {
            const active = c.id === categoria;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCategoria(c.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${c.label}, ${counts[c.id] ?? 0} ${counts[c.id] === 1 ? 'item' : 'itens'}`}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="storefront-outline" size={36} color={COLORS.primary} />
            <Text style={styles.emptyTitle}>Nenhum item nesta categoria</Text>
            <Text style={styles.emptyText}>Escolha outra categoria para ver os anúncios dos parceiros.</Text>
          </View>
        ) : (
          items.map((item) => {
            const cat = getCategoria(item.categoria);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => navigation.navigate('LojaDetalhe', { itemId: item.id })}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${item.titulo}. ${item.descricaoCurta}${item.preco ? `. Preço: ${item.preco}` : ''}`}
                accessibilityHint="Abre os detalhes do item"
              >
                <MarketplaceImage imagem={item.imagem} categoria={item.categoria} />
                <View style={styles.cardBody}>
                  <View style={styles.tagRow}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{cat?.label}</Text>
                    </View>
                    {item.exemplo && (
                      <View style={styles.tagMuted}>
                        <Text style={styles.tagMutedText}>Exemplo</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardTitle}>{item.titulo}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>{item.descricaoCurta}</Text>
                  <View style={styles.cardFooter}>
                    {item.preco ? <Text style={styles.price}>{item.preco}</Text> : <View />}
                    <View style={styles.more}>
                      <Text style={styles.moreText}>Ver detalhes</Text>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <Text style={styles.notice}>{MARKETPLACE_CONFIG.partnerNotice}</Text>
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
  content: { padding: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.xxl, gap: SPACING.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: { minHeight: 44, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, justifyContent: 'center', borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textPrimary },
  chipTextActive: { color: COLORS.black },
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  cardBody: { padding: SPACING.md, gap: SPACING.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  tag: { backgroundColor: '#1A1700', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 4 },
  tagText: { fontSize: FONTS.sizes.xs, color: COLORS.primary, fontWeight: '600' },
  tagMuted: { backgroundColor: COLORS.bgCardAlt, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 4 },
  tagMutedText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontWeight: '600' },
  cardTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  cardDesc: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 19 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: SPACING.sm },
  price: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.primary },
  more: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  moreText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.primary },
  empty: { alignItems: 'center', gap: SPACING.sm, padding: SPACING.xl },
  emptyTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white, textAlign: 'center' },
  emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center' },
  notice: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 16, marginTop: SPACING.sm },
});
