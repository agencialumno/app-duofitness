import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../utils/theme';

// Faixa opaca da altura da área segura do topo (relógio, entalhe). Vai FORA e ACIMA do ScrollView, fixa, para o conteúdo não passar por baixo do relógio ao rolar.
// Para telas que não usam o ScreenHeader (raiz de aba sem título, ou com cabeçalho próprio). Veja docs/visual-cabecalho.md.
export default function ScreenTopInset() {
  const insets = useSafeAreaInsets();
  return <View testID="screen-top-inset" style={[styles.strip, { height: insets.top }]} />;
}

const styles = StyleSheet.create({
  strip: { backgroundColor: COLORS.bg },
});
