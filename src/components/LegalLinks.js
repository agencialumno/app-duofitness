import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONTS, SPACING } from '../utils/theme';
import { TERMS_URL, PRIVACY_URL } from '../data/authConfig';
import { legalLinks } from '../utils/legalLinks';
import { openUrl } from '../utils/externalLinks';

// Links "Termos de Uso" e "Política de Privacidade". Só aparece o que tem URL válida (EXPO_PUBLIC_TERMS_URL / EXPO_PUBLIC_PRIVACY_URL); sem nenhuma,
// não mostra nada (ou só `emptyNote`). Alvos de 44 pt, com rótulo de acessibilidade ("Abrir os Termos de Uso"). `termsUrl` e `privacyUrl`
// são injetáveis para os testes.
export default function LegalLinks({ termsUrl = TERMS_URL, privacyUrl = PRIVACY_URL, testIDPrefix = 'legal', emptyNote = '', style }) {
  const [failed, setFailed] = useState('');
  const links = legalLinks({ termsUrl, privacyUrl });
  if (links.length === 0) return emptyNote ? <Text style={styles.note} testID={`${testIDPrefix}-empty`}>{emptyNote}</Text> : null;
  const open = async (l) => {
    setFailed('');
    if (!(await openUrl(l.url))) setFailed(`Não foi possível abrir ${l.id === 'terms' ? 'os Termos de Uso' : 'a Política de Privacidade'} agora.`);
  };
  return (
    <View style={[styles.wrap, style]} testID={`${testIDPrefix}-links`}>
      <View style={styles.row}>
        {links.map((l) => (
          <TouchableOpacity
            key={l.id}
            style={styles.link}
            onPress={() => open(l)}
            accessibilityRole="link"
            accessibilityLabel={l.accessibilityLabel}
            testID={`${testIDPrefix}-${l.id}-link`}
          >
            <Text style={styles.linkText}>{l.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {failed ? <Text style={styles.note} accessibilityLiveRegion="polite" testID={`${testIDPrefix}-error`}>{failed}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: SPACING.md },
  link: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.sm },
  linkText: { fontSize: FONTS.sizes.md, color: COLORS.primary, textDecorationLine: 'underline', textAlign: 'center' },
  note: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center' },
});
