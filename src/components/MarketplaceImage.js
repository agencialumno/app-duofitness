import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';
import { getCategoria } from '../data/marketplace';
import { getMarketplaceImage } from '../data/marketplaceImages';

// Imagem de um item da vitrine. Se o item não tem imagem (ou a chave não existe em marketplaceImages.js),
// mostra um placeholder: fundo escuro com o ícone da categoria em amarelo (#fed205).
// Decorativa: fica fora da leitura do leitor de tela (o título do item já descreve o cartão).
// `exemplo` mostra o selo "Exemplo" sobre a imagem (para as telas que não têm a etiqueta do cartão, como a Home): as fotos de produto são
// artes de exemplo e não podem parecer anúncios reais.
export default function MarketplaceImage({ imagem, categoria, style, iconSize = 40, exemplo = false }) {
  const source = getMarketplaceImage(imagem);
  const icone = getCategoria(categoria)?.icone || 'storefront-outline';

  return (
    <View
      style={[styles.box, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {source ? (
        <Image source={source} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : (
        <View style={styles.placeholder} testID="marketplace-placeholder">
          <Ionicons name={icone} size={iconSize} color={COLORS.primary} />
        </View>
      )}
      {exemplo ? (
        <View style={styles.badge} testID="marketplace-image-exemplo">
          <Text style={styles.badgeText}>Exemplo</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', aspectRatio: 3 / 2, backgroundColor: COLORS.bgCardAlt, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 6, left: 6, backgroundColor: COLORS.black, borderRadius: 999, borderWidth: 1, borderColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  placeholder: { flex: 1, backgroundColor: COLORS.bgCardAlt, alignItems: 'center', justifyContent: 'center' },
});
