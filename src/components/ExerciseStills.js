import React, { useEffect, useRef, useState } from 'react';
import { AppState, Animated, Easing, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { COLORS, FONTS, RADIUS, SPACING } from '../utils/theme';
import { useReduceMotionState } from '../hooks/useReduceMotion';

// "Animação" simples do exercício: alterna duas fotos (posição inicial e final) com fade cruzado, em loop. Leve: só a opacidade da foto de cima
// anima, com o driver nativo (sem re-render a cada quadro). Para (e libera o timer) quando a tela perde o foco, o app vai para o segundo plano
// ou o sistema pede "Reduzir movimento".
//   - Proporção fixa 3:2 (as fotos são 720x480) e `contain` sobre fundo neutro: o layout nunca pula e nada é cortado.
//   - Reduzir movimento: foto inicial fixa e o botão "Ver posição final" / "Ver posição inicial" (alvo de 44 pt) alterna à mão.
//   - Legenda discreta "Imagens ilustrativas": não promete que o aparelho é o do condomínio.
// `images` = [fotoInicial, fotoFinal] (de getExerciseStills). Sem as duas, não desenha nada.
export const HOLD_MS = 1200; // tempo parado em cada pose
export const FADE_MS = 400; // fade cruzado entre as poses

export default function ExerciseStills({ exercise, images }) {
  const name = exercise?.name || 'exercício';
  const { reduce: reduceMotion, known: motionKnown } = useReduceMotionState();
  const focused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [showEnd, setShowEnd] = useState(false); // só no modo "reduzir movimento": qual foto está fixa
  const fade = useRef(new Animated.Value(0)).current; // 0 = só a inicial, 1 = só a final

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub?.remove?.();
  }, []);

  const hasImages = Array.isArray(images) && images.length === 2 && !!images[0] && !!images[1];
  const animate = hasImages && motionKnown && !reduceMotion && focused && appActive;

  useEffect(() => {
    if (!animate) return undefined;
    const ease = Easing.inOut(Easing.ease);
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(HOLD_MS),
      Animated.timing(fade, { toValue: 1, duration: FADE_MS, easing: ease, useNativeDriver: true }),
      Animated.delay(HOLD_MS),
      Animated.timing(fade, { toValue: 0, duration: FADE_MS, easing: ease, useNativeDriver: true }),
    ]));
    loop.start();
    return () => { loop.stop(); };
  }, [animate, fade]);

  // reduzir movimento: o valor segue a escolha manual; fora dele, volta ao começo quando para
  useEffect(() => {
    if (motionKnown && reduceMotion) fade.setValue(showEnd ? 1 : 0);
  }, [motionKnown, reduceMotion, showEnd, fade]);

  if (!hasImages) return null;

  const manual = motionKnown && reduceMotion;
  const label = manual
    ? (showEnd ? `Posição final do exercício ${name}` : `Posição inicial do exercício ${name}`)
    : `Demonstração do exercício ${name}, alternando entre a posição inicial e a posição final`;

  return (
    <View testID="exercise-stills">
      <View style={styles.box} accessible accessibilityRole="image" accessibilityLabel={label} testID="exercise-stills-image">
        <Image source={images[0]} style={styles.fill} resizeMode="contain" accessibilityIgnoresInvertColors accessible={false} testID="exercise-still-start" />
        <Animated.Image source={images[1]} style={[styles.fill, styles.top, { opacity: fade }]} resizeMode="contain" accessibilityIgnoresInvertColors accessible={false} testID="exercise-still-end" />
      </View>
      {manual ? (
        <TouchableOpacity
          style={styles.toggle}
          onPress={() => setShowEnd((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={showEnd ? 'Ver posição inicial' : 'Ver posição final'}
          testID="exercise-stills-toggle"
        >
          <Text style={styles.toggleText}>{showEnd ? 'Ver posição inicial' : 'Ver posição final'}</Text>
        </TouchableOpacity>
      ) : null}
      <Text style={styles.caption} testID="exercise-stills-caption">Imagens ilustrativas</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', aspectRatio: 3 / 2, borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: '#F4F4F4', borderWidth: 1, borderColor: COLORS.border },
  fill: { width: '100%', height: '100%' },
  top: { position: 'absolute', left: 0, top: 0 },
  toggle: { minHeight: 44, minWidth: 44, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.xs, paddingHorizontal: SPACING.md, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.primary },
  toggleText: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.primary },
  caption: { marginTop: SPACING.xs, fontSize: FONTS.sizes.xs, color: COLORS.textMuted, textAlign: 'center' },
});
