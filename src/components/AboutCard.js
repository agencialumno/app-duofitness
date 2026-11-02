import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Application from 'expo-application';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { BUILD_INFO } from '../data/buildInfo';
import { buildAboutInfo } from '../utils/aboutInfo';
import { createTapCounter } from '../utils/tapCounter';

// Cartão "Sobre" do Perfil: "Versão 1.0.0" para todos. Em canais de teste (dev, beta, rc) os detalhes (canal, build, nome SemVer, branch e commit curto)
// aparecem de saída, com um botão (44 pt) para ocultar. Em build de loja (store ou sem a variável) ficam ocultos; em QUALQUER canal, 7 toques seguidos
// no texto da versão revelam ou ocultam os detalhes (suporte), sem dica visual nem rótulo de acessibilidade sobre o gesto. `application`, `buildInfo` e
// `now` são injetáveis nos testes.
export default function AboutCard({ application = Application, buildInfo = BUILD_INFO, now }) {
  const info = buildAboutInfo({
    version: application.nativeApplicationVersion,
    build: application.nativeBuildVersion,
    channel: buildInfo.channel,
    branch: buildInfo.branch,
    sha: buildInfo.sha,
    prerelease: buildInfo.prerelease,
  });
  const [visible, setVisible] = useState(info.showDetails);
  const counter = useRef(null);
  if (!counter.current) counter.current = createTapCounter({ count: 7, gapMs: 2000, ...(now ? { now } : {}) });
  const onVersionPress = () => { if (info.available && counter.current.hit()) setVisible((v) => !v); };
  const showDetails = info.available && visible;
  return (
    <View style={styles.card} testID="about-card">
      <Text style={styles.title} accessibilityRole="header">Sobre</Text>
      {/* Os 7 toques usam onTouchEnd num View comum (não é um botão para o leitor de tela): o rótulo continua só "Versão X.Y.Z" e não há dica nem papel. */}
      <View accessible accessibilityLabel={info.a11yFor(showDetails)} onTouchEnd={onVersionPress} testID="about-info">
        <Text style={styles.version} testID="about-version">{info.versionLine}</Text>
        {showDetails ? info.details.map((d) => (
          <Text key={d.id} style={styles.detail} testID={`about-${d.id}`}>{`${d.label}: ${d.value}`}</Text>
        )) : null}
      </View>
      {info.showDetails ? (
        <TouchableOpacity
          style={styles.toggle}
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar detalhes da build' : 'Mostrar detalhes da build'}
          testID="about-toggle"
        >
          <Text style={styles.toggleText}>{visible ? 'Ocultar detalhes da build' : 'Mostrar detalhes da build'}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.xs },
  title: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  version: { fontSize: FONTS.sizes.md, color: COLORS.white },
  detail: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  toggle: { minHeight: 44, minWidth: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: SPACING.sm },
  toggleText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary, textDecorationLine: 'underline' },
});
