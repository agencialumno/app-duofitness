import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';
import { getInfoTheme } from '../data/infoContent';
import InfoSheet from './InfoSheet';

// Ícone "i" em círculo (área de toque de 44x44) que abre a folha de ajuda do tema (texto em infoContent.js).
// `blocks` opcional: conteúdo calculado na hora (ex.: o passo a passo do IMC com os dados da pessoa).
// O texto fica FORA do toque do cartão que o contém: use em linhas de título, nunca dentro de outro botão.
export default function InfoButton({ tema, blocks, titulo, label, color = COLORS.primary, style, size = 20 }) {
  const [open, setOpen] = useState(false);
  // `tema` existente em infoContent.js, ou um conteúdo próprio (blocks + titulo + label), como as ajudas da Saúde por categoria.
  const theme = getInfoTheme(tema) || (blocks && titulo ? { label: label || titulo, titulo, blocks } : null);
  if (!theme) return null; // tema inexistente: nada na tela (um teste confere que todos existem)

  return (
    <View style={style}>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Saiba mais sobre ${theme.label}`}
        accessibilityHint="Abre uma explicação"
        hitSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
      >
        <View style={[styles.circle, { borderColor: color }]}>
          <Ionicons name="information" size={size - 6} color={color} />
        </View>
      </TouchableOpacity>
      <InfoSheet
        visible={open}
        onClose={() => setOpen(false)}
        titulo={titulo || theme.titulo}
        blocks={blocks || theme.blocks}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  circle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
