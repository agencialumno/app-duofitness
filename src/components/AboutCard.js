import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Application from 'expo-application';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { BUILD_INFO } from '../data/buildInfo';
import { buildAboutInfo } from '../utils/aboutInfo';

// Cartão "Sobre" do Perfil: "Versão 1.0.0 (33)" para todos. Em canais de teste (dev, beta, rc) mostra também o nome SemVer completo, a branch e o commit
// curto, com um botão (44 pt) para ocultar os detalhes. `application` e `buildInfo` são injetáveis nos testes.
export default function AboutCard({ application = Application, buildInfo = BUILD_INFO }) {
  const [hidden, setHidden] = useState(false);
  const info = buildAboutInfo({
    version: application.nativeApplicationVersion,
    build: application.nativeBuildVersion,
    channel: buildInfo.channel,
    branch: buildInfo.branch,
    sha: buildInfo.sha,
    prerelease: buildInfo.prerelease,
  });
  const showDetails = info.showDetails && !hidden;
  return (
    <View style={styles.card} testID="about-card">
      <Text style={styles.title} accessibilityRole="header">Sobre</Text>
      <View accessible accessibilityLabel={info.a11y} testID="about-info">
        <Text style={styles.version} testID="about-version">{info.versionLine}</Text>
        {showDetails ? info.details.map((d) => (
          <Text key={d.id} style={styles.detail} testID={`about-${d.id}`}>{`${d.label}: ${d.value}`}</Text>
        )) : null}
      </View>
      {info.showDetails ? (
        <TouchableOpacity
          style={styles.toggle}
          onPress={() => setHidden((h) => !h)}
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Mostrar detalhes da build' : 'Ocultar detalhes da build'}
          testID="about-toggle"
        >
          <Text style={styles.toggleText}>{hidden ? 'Mostrar detalhes da build' : 'Ocultar detalhes da build'}</Text>
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
