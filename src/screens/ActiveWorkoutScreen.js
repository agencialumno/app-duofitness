import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Animated } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Ionicons } from '@expo/vector-icons';

export default function ActiveWorkoutScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { workout } = route.params;
  const { completeSession } = useApp();
  const exercises = workout.exercises || [];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [resting, setResting] = useState(false);
  const [restSeconds, setRestSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const restTimer = useRef(null);
  const totalTimer = useRef(null);
  const flashAnim = useRef(new Animated.Value(1)).current;
  const currentEx = exercises[currentIdx];
  const progress = exercises.length > 0 ? ((currentIdx * 100) + ((currentSet - 1) / (currentEx?.sets || 1) * 100)) / exercises.length : 0;

  useEffect(() => {
    totalTimer.current = setInterval(() => setTotalSeconds(s => s + 1), 1000);
    return () => clearInterval(totalTimer.current);
  }, []);

  useEffect(() => { return () => clearInterval(restTimer.current); }, []);

  const flash = () => {
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.5, duration: 100, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const startRest = (seconds) => {
    setResting(true);
    setRestSeconds(seconds);
    restTimer.current = setInterval(() => {
      setRestSeconds(s => {
        if (s <= 1) { clearInterval(restTimer.current); setResting(false); flash(); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const nextSet = () => {
    const ex = exercises[currentIdx];
    if (currentSet < ex.sets) {
      setCurrentSet(s => s + 1);
      startRest(ex.rest);
    } else if (currentIdx < exercises.length - 1) {
      setCurrentIdx(i => i + 1);
      setCurrentSet(1);
      startRest(60);
    } else {
      finishWorkout();
    }
  };

  const finishWorkout = async () => {
    clearInterval(totalTimer.current);
    const session = await completeSession(workout.id);
    setXpEarned(session.xpEarned);
    setDone(true);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (done) {
    return (
      <View style={styles.doneContainer}>
        <View style={styles.doneIconWrap}>
          <Ionicons name="checkmark" size={40} color={COLORS.black} />
        </View>
        <Text style={styles.doneTitle}>Treino concluído</Text>
        <Text style={styles.doneSub}>{workout.name}</Text>
        <View style={styles.doneStats}>
          {[
            { value: `+${xpEarned}`, label: 'XP ganho' },
            { value: formatTime(totalSeconds), label: 'Tempo' },
            { value: exercises.length, label: 'Exercícios' },
          ].map((s, i) => (
            <View key={i} style={styles.doneStat}>
              <Text style={styles.doneStatValue}>{s.value}</Text>
              <Text style={styles.doneStatLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.popToTop()}>
          <Text style={styles.doneBtnText}>Concluir</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => Alert.alert('Sair do treino', 'Seu progresso será perdido.', [
          { text: 'Continuar', style: 'cancel' },
          { text: 'Sair', style: 'destructive', onPress: () => navigation.goBack() },
        ])}>
          <Ionicons name="close" size={26} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.timer}>{formatTime(totalSeconds)}</Text>
        <Text style={styles.exCounter}>{currentIdx + 1}/{exercises.length}</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Animated.View style={{ opacity: flashAnim }}>
          <View style={styles.exerciseCard}>
            <View style={styles.exerciseIconWrap}>
              <Ionicons name="fitness-outline" size={36} color={COLORS.primary} />
            </View>
            <Text style={styles.exName}>{currentEx?.name}</Text>
            <Text style={styles.exCategory}>{currentEx?.category}</Text>

            <View style={styles.setTracker}>
              {Array.from({ length: currentEx?.sets || 0 }).map((_, i) => (
                <View key={i} style={[styles.setDot, i < currentSet - 1 ? styles.setDotDone : i === currentSet - 1 ? styles.setDotActive : null]} />
              ))}
            </View>
            <Text style={styles.setInfo}>Série {currentSet} de {currentEx?.sets}</Text>

            <View style={styles.repsDisplay}>
              <Text style={styles.repsNumber}>{currentEx?.reps}</Text>
              <Text style={styles.repsLabel}>{currentEx?.isTime ? 'segundos' : 'repetições'}</Text>
            </View>
            <Text style={styles.restInfo}>Descanso: {currentEx?.rest}s</Text>
          </View>
        </Animated.View>

        {resting && (
          <View style={styles.restCard}>
            <Text style={styles.restTitle}>Descansando</Text>
            <Text style={styles.restTimer}>{restSeconds}s</Text>
            <TouchableOpacity onPress={() => { clearInterval(restTimer.current); setResting(false); }}>
              <Text style={styles.skipRest}>Pular descanso</Text>
            </TouchableOpacity>
          </View>
        )}

        {!resting && (
          <TouchableOpacity style={styles.nextBtn} onPress={nextSet}>
            <Ionicons name={currentIdx === exercises.length - 1 && currentSet === currentEx?.sets ? 'trophy-outline' : 'checkmark'} size={20} color={COLORS.black} />
            <Text style={styles.nextBtnText}>
              {currentIdx === exercises.length - 1 && currentSet === currentEx?.sets ? 'Finalizar treino' : 'Série concluída'}
            </Text>
          </TouchableOpacity>
        )}

        {exercises[currentIdx + 1] && (
          <View style={styles.nextPreview}>
            <Text style={styles.nextPreviewLabel}>Próximo</Text>
            <Text style={styles.nextPreviewName}>{exercises[currentIdx + 1].name}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg },
  timer: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.white },
  exCounter: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
  progressBar: { height: 3, backgroundColor: COLORS.border, marginHorizontal: SPACING.lg },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  exerciseCard: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm },
  exerciseIconWrap: { width: 80, height: 80, borderRadius: RADIUS.xl, backgroundColor: '#1A1700', justifyContent: 'center', alignItems: 'center' },
  exName: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.white, textAlign: 'center' },
  exCategory: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  setTracker: { flexDirection: 'row', gap: SPACING.sm, marginVertical: SPACING.sm },
  setDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.border },
  setDotDone: { backgroundColor: COLORS.primary },
  setDotActive: { backgroundColor: COLORS.bgCardAlt, borderWidth: 2, borderColor: COLORS.primary },
  setInfo: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  repsDisplay: { alignItems: 'center', marginVertical: SPACING.sm },
  repsNumber: { fontSize: 52, fontWeight: '700', color: COLORS.primary, lineHeight: 60 },
  repsLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  restInfo: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  restCard: { backgroundColor: '#141200', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: '#2A2400', padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm },
  restTitle: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, fontWeight: '600' },
  restTimer: { fontSize: 52, fontWeight: '700', color: COLORS.primary },
  skipRest: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, textDecorationLine: 'underline' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: SPACING.md },
  nextBtnText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.black },
  nextPreview: { backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  nextPreviewLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: '600' },
  nextPreviewName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textSecondary },
  doneContainer: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl, gap: SPACING.lg },
  doneIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  doneTitle: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },
  doneSub: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  doneStats: { flexDirection: 'row', gap: SPACING.xl, marginVertical: SPACING.md },
  doneStat: { alignItems: 'center', gap: 4 },
  doneStatValue: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.primary },
  doneStatLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  doneBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xxl, width: '100%', alignItems: 'center' },
  doneBtnText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.black },
});
