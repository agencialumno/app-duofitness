import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';
import { getCategoria } from '../data/marketplace';
import { getMarketplaceImage } from '../data/marketplaceImages';

// Imagem de um item da vitrine. Se o item não tem imagem (ou a chave não existe em marketplaceImages.js),
// mostra um placeholder: fundo escuro com o ícone da categoria em amarelo (#fed205).
// Decorativa: fica fora da leitura do leitor de tela (o título do item já descreve o cartão).
export default function MarketplaceImage({ imagem, categoria, style, iconSize = 40 }) {
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
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', aspectRatio: 16 / 9, backgroundColor: COLORS.bgCardAlt, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, backgroundColor: COLORS.bgCardAlt, alignItems: 'center', justifyContent: 'center' },
});
