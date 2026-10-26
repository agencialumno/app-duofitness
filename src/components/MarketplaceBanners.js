import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { MARKETPLACE_BANNERS, getVisibleBanners } from '../data/marketplaceBanners';
import { getBannerImage } from '../data/marketplaceBannerImages';

// Carrossel de banners do topo do marketplace: ScrollView horizontal paginado (sem módulo nativo).
// Não gira sozinho (respeita "Reduzir movimento" por construção): só muda de página quando a pessoa desliza
// ou toca nos pontos. Sem nenhuma imagem disponível, a área inteira some.
// `banners` e `onOpen` são injetáveis para os testes.
export default function MarketplaceBanners({ banners = MARKETPLACE_BANNERS, onOpen }) {
  const visible = useMemo(() => getVisibleBanners(banners, getBannerImage), [banners]);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const scrollRef = useRef(null);

  const onScroll = useCallback(
    (e) => {
      if (!width) return;
      const p = Math.round(e.nativeEvent.contentOffset.x / width);
      setPage((cur) => (p === cur ? cur : Math.max(0, Math.min(visible.length - 1, p))));
    },
    [width, visible.length],
  );

  const goTo = (i) => {
    setPage(i);
    scrollRef.current?.scrollTo({ x: i * width, animated: false });
  };

  if (visible.length === 0) return null;

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
      testID="marketplace-banners"
    >
      {width > 0 && (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          accessibilityLabel={`Banners do marketplace, ${visible.length} ${visible.length === 1 ? 'página' : 'páginas'}`}
        >
          {visible.map((b, i) => (
            <TouchableOpacity
              key={b.id}
              style={{ width }}
              activeOpacity={0.9}
              onPress={() => onOpen && onOpen(b)}
              testID={`marketplace-banner-${b.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${b.titulo}${b.subtitulo ? `. ${b.subtitulo}` : ''}. ${b.exemplo ? 'Banner de exemplo. ' : ''}Banner ${i + 1} de ${visible.length}. ${b.alt || ''}`.trim()}
              accessibilityHint="Abre o formulário para anunciar no marketplace"
            >
              <View style={styles.card}>
                <View style={styles.imageBox}>
                  <Image source={getBannerImage(b.imagem)} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
                  {b.exemplo && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Exemplo</Text>
                    </View>
                  )}
                </View>
                <View style={styles.caption}>
                  <Text style={styles.title}>{b.titulo}</Text>
                  {!!b.subtitulo && <Text style={styles.subtitle}>{b.subtitulo}</Text>}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {visible.length > 1 && (
        <View style={styles.dots}>
          {visible.map((b, i) => (
            <TouchableOpacity
              key={b.id}
              onPress={() => goTo(i)}
              hitSlop={{ top: 14, bottom: 14, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={`Ir ao banner ${i + 1} de ${visible.length}`}
              accessibilityState={{ selected: i === page }}
              testID={`marketplace-banner-dot-${i}`}
              style={styles.dotHit}
            >
              <View style={[styles.dot, i === page && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  imageBox: { width: '100%', aspectRatio: 2, backgroundColor: COLORS.black },
  image: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: SPACING.sm, left: SPACING.sm, backgroundColor: COLORS.black, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.primary },
  caption: { padding: SPACING.md, gap: 2 },
  title: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: SPACING.xs },
  dotHit: { minWidth: 28, minHeight: 28, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  dotActive: { width: 22, backgroundColor: COLORS.primary },
});
