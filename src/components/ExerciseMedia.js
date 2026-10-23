import React, { useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { getExerciseMedia } from '../data/exerciseVideos';
import { useReduceMotionState } from '../hooks/useReduceMotion';
import { getTestVideoSource } from '../utils/mediaTestFlag';
import ExerciseVideoPlayer from './ExerciseVideoPlayer';

// Área "Como fazer" do exercício: quadrada (1:1, proporção fixa).
//   - Com vídeo no mapa gerado (src/data/exerciseVideos.js): player (ExerciseVideoPlayer, expo-video).
//   - Sem vídeo: a capa se existir, senão um placeholder escuro com ícone amarelo e o selo "Vídeo em breve".
//   - Vídeo que falha ao carregar: volta à capa/placeholder, sem mensagem de erro.
// `renderVideo` (opcional) substitui o player: recebe { media, exercise, autoplay, onFail } e devolve o elemento
// (usado nos testes). Formato e como adicionar arquivos: docs/videos-exercicios.md.
export default function ExerciseMedia({ exercise, renderVideo }) {
  const name = exercise?.name || 'exercício';
  const { reduce: reduceMotion, known: motionKnown } = useReduceMotionState();
  const [failed, setFailed] = useState(false);

  let media = getExerciseMedia(exercise?.id);
  // Teste na web (?duoTestVideo=1): um vídeo criado pelo próprio teste no navegador. Inerte em iOS e Android.
  const testVideo = getTestVideoSource({
    platformOS: Platform.OS,
    search: typeof window !== 'undefined' && window.location ? window.location.search : '',
    uri: typeof window !== 'undefined' ? window.__duoTestVideoUri : undefined,
  });
  if (!media && testVideo) media = { video: testVideo, poster: null, duracaoSeg: null, alt: `Vídeo de demonstração de ${name}` };

  if (media?.video && !failed) {
    const onFail = () => setFailed(true);
    return (
      <View style={styles.box} testID="exercise-media-video">
        {typeof renderVideo === 'function'
          ? renderVideo({ media, exercise, autoplay: !reduceMotion, onFail })
          : <ExerciseVideoPlayer media={media} exercise={exercise} reduceMotion={reduceMotion} motionKnown={motionKnown} onFail={onFail} />}
      </View>
    );
  }

  // Capa ou placeholder. Se havia vídeo e ele falhou, não há selo "em breve" (o arquivo existe).
  const base = media?.alt || `Vídeo de demonstração de ${name}`;
  const label = failed ? `${base} indisponível no momento` : `${base} em breve`;

  return (
    <View style={styles.box} accessible accessibilityRole="image" accessibilityLabel={label} testID="exercise-media">
      {media?.poster ? (
        <Image source={media.poster} style={styles.fill} resizeMode="cover" accessibilityIgnoresInvertColors accessible={false} />
      ) : (
        <View style={styles.placeholder} testID="exercise-media-placeholder">
          <Ionicons name="play-circle-outline" size={56} color={COLORS.primary} />
        </View>
      )}
      {!failed && (
        <View style={styles.badge}>
          <Ionicons name="videocam-outline" size={14} color={COLORS.black} />
          <Text style={styles.badgeText}>Vídeo em breve</Text>
        </View>
      )}
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
