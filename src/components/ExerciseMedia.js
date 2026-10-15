import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { getExerciseMedia } from '../data/exerciseVideos';

// Área "Como fazer" do exercício: quadrada (1:1, proporção fixa), com a capa se existir ou um placeholder
// escuro com ícone amarelo e o selo "Vídeo em breve".
//
// PONTO DE EXTENSÃO DO PLAYER: quando o expo-video entrar (dependência nativa, exige novo build), passe
// `renderVideo` (ou troque o miolo deste componente). Ele recebe { media, exercise, autoplay } e devolve o player
// (usando media.video e media.poster). Sem `renderVideo`, ou sem arquivo de vídeo, aparece a capa/placeholder.
// Formato e como adicionar arquivos: docs/videos-exercicios.md.

// "Reduzir movimento" do sistema: o player futuro não deve iniciar sozinho nem ficar em loop com ele ligado.
function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { if (alive) setReduce(!!v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => setReduce(!!v));
    return () => { alive = false; sub?.remove?.(); };
  }, []);
  return reduce;
}

export default function ExerciseMedia({ exercise, renderVideo }) {
  const media = getExerciseMedia(exercise?.id);
  const name = exercise?.name || 'exercício';
  const reduceMotion = useReduceMotion();

  // `autoplay` é falso com "Reduzir movimento": o player mostra a capa parada e o usuário toca para reproduzir.
  if (media?.video && typeof renderVideo === 'function') {
    return <View style={styles.box}>{renderVideo({ media, exercise, autoplay: !reduceMotion })}</View>;
  }

  // Texto lido pelo VoiceOver/TalkBack (e texto alternativo da capa).
  const label = `${media?.alt || `Vídeo de demonstração de ${name}`} em breve`;

  return (
    <View style={styles.box} accessible accessibilityRole="image" accessibilityLabel={label} testID="exercise-media">
      {media?.poster ? (
        <Image source={media.poster} style={styles.fill} resizeMode="cover" accessibilityIgnoresInvertColors accessible={false} />
      ) : (
        <View style={styles.placeholder} testID="exercise-media-placeholder">
          <Ionicons name="play-circle-outline" size={56} color={COLORS.primary} />
        </View>
      )}
      <View style={styles.badge}>
        <Ionicons name="videocam-outline" size={14} color={COLORS.black} />
        <Text style={styles.badgeText}>Vídeo em breve</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', aspectRatio: 1, borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  fill: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgCardAlt },
  badge: { position: 'absolute', left: SPACING.sm, bottom: SPACING.sm, maxWidth: '90%', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.black, flexShrink: 1 },
});
