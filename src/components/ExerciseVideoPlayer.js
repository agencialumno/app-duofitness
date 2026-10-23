import React, { useEffect, useState } from 'react';
import { AppState, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { COLORS, RADIUS, SPACING } from '../utils/theme';

// Player do vídeo de demonstração do exercício (expo-video). Quadrado (1:1), cover, loop, SEM áudio (muted) e sem
// interromper a música do usuário, sem controles nativos e sem Picture-in-Picture. Só reprodução em primeiro plano.
//
// - Autoplay ao abrir a tela; pausa ao perder o foco da tela e ao ir para o segundo plano; libera o player ao sair.
// - "Reduzir movimento": mostra a capa e só toca quando a pessoa tocar no botão.
// - Falha ao carregar o vídeo: chama onFail (o ExerciseMedia volta à capa/placeholder), sem erro na tela.
export default function ExerciseVideoPlayer({ media, exercise, reduceMotion, motionKnown = true, onFail }) {
  const name = exercise?.name || 'exercício';
  const focused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false); // só toca depois de pronto (play() em fonte que falha gera rejeição na web)
  const [userChoice, setUserChoice] = useState(null); // null = segue o padrão (toca, a menos que reduzir movimento)

  const player = useVideoPlayer(media.video, (p) => {
    p.loop = true;
    p.muted = true;
    try { p.audioMixingMode = 'mixWithOthers'; } catch (e) { /* versão sem o modo: segue mudo, sem foco de áudio */ }
    p.showNowPlayingNotification = false;
    p.staysActiveInBackground = false;
  });

  const wantsPlay = userChoice === null ? !reduceMotion : userChoice;

  // segundo plano / volta ao app
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub?.remove?.();
  }, []);

  // estado do player (tocando e erro)
  useEffect(() => {
    const subs = [];
    try {
      subs.push(player.addListener('playingChange', (e) => setPlaying(!!e?.isPlaying)));
      subs.push(player.addListener('statusChange', (e) => {
        if (e?.status === 'readyToPlay') setReady(true);
        if (e?.status === 'error') onFail?.();
      }));
      if (player.status === 'readyToPlay') setReady(true);
      if (player.status === 'error') onFail?.();
    } catch (e) {
      onFail?.();
    }
    return () => subs.forEach((s) => s?.remove?.());
  }, [player, onFail]);

  // toca só com o vídeo pronto, foco da tela, app ativo, preferência de movimento conhecida e a pessoa não ter pausado
  useEffect(() => {
    try {
      if (ready && motionKnown && wantsPlay && focused && appActive) player.play();
      else player.pause();
    } catch (e) { /* player já liberado */ }
  }, [player, ready, motionKnown, wantsPlay, focused, appActive]);

  // ao sair da tela: para (o expo-video libera o player junto com o componente)
  useEffect(() => () => { try { player.pause(); } catch (e) { /* já liberado */ } }, [player]);

  const label = wantsPlay ? `Pausar vídeo de demonstração de ${name}` : `Tocar vídeo de demonstração de ${name}`;

  return (
    <View style={styles.fill}>
      <VideoView
        player={player}
        style={styles.fill}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
        allowsFullscreen={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      {/* capa (ou fundo escuro) por cima enquanto o vídeo não está tocando: sem quadro preto nem salto */}
      {!playing && (
        <View style={styles.cover} pointerEvents="none" testID="exercise-video-cover">
          {media.poster ? (
            <Image source={media.poster} style={styles.fill} resizeMode="cover" accessibilityIgnoresInvertColors accessible={false} />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="play-circle-outline" size={56} color={COLORS.primary} />
            </View>
          )}
        </View>
      )}
      <TouchableOpacity
        style={styles.control}
        onPress={() => setUserChoice(!wantsPlay)}
        accessibilityRole="button"
        accessibilityLabel={label}
        testID="exercise-video-toggle"
      >
        <Ionicons name={wantsPlay ? 'pause' : 'play'} size={20} color={COLORS.black} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  cover: { ...StyleSheet.absoluteFillObject },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bgCardAlt },
  control: { position: 'absolute', right: SPACING.sm, bottom: SPACING.sm, width: 44, height: 44, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary },
});
