import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { Ionicons } from '@expo/vector-icons';

export default function WorkoutDetailScreen({ navigation, route }) {
  const { workout } = route.params;
  const { deleteWorkout, completedSessions } = useApp();
  const sessionCount = completedSessions.filter(s => s.workoutId === workout.id).length;

  const handleDelete = () => {
    Alert.alert('Deletar treino', `Tem certeza que quer deletar "${workout.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Deletar', style: 'destructive', onPress: async () => { await deleteWorkout(workout.id); navigation.goBack(); } },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {workout.serie && (
          <Text style={styles.serieLabel}>SÉRIE {workout.serie}</Text>
        )}
        <Text style={styles.workoutName}>{workout.name}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{workout.category}</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{workout.exercises?.length} exercícios</Text>
          {sessionCount > 0 && <><Text style={styles.metaDot}>·</Text><Text style={styles.metaText}>{sessionCount}x realizado</Text></>}
        </View>

        <TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('ActiveWorkout', { workout })}>
          <Ionicons name="play-circle-outline" size={22} color={COLORS.black} />
          <Text style={styles.startBtnText}>Iniciar treino</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Exercícios</Text>
        <View style={styles.exercises}>
          {workout.exercises?.map((ex, i) => (
            <TouchableOpacity
              key={ex.id || i}
              style={styles.exRow}
              onPress={() => navigation.navigate('Exercises', { screen: 'ExerciseDetail', params: { exercise: ex } })}
            >
              <View style={styles.exNum}><Text style={styles.exNumText}>{i + 1}</Text></View>
              <View style={styles.exIcon}>
                <Ionicons name="fitness-outline" size={18} color={COLORS.primary} />
              </View>
              <View style={styles.exInfo}>
                <Text style={styles.exName}>{ex.name}</Text>
                <Text style={styles.exMeta}>{ex.sets} séries · {ex.reps} reps · {ex.rest}s descanso</Text>
              </View>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, paddingTop: SPACING.xl + SPACING.xl },
  backBtn: { padding: SPACING.xs },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  serieLabel: { fontSize: FONTS.sizes.xs, color: COLORS.primary, fontWeight: '700', letterSpacing: 2, marginBottom: 4 },
  workoutName: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white, marginBottom: SPACING.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.lg },
  metaText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  metaDot: { color: COLORS.textMuted },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: RADIUS.full, paddingVertical: SPACING.md, marginBottom: SPACING.xl },
  startBtnText: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.black },
  sectionTitle: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SPACING.md, letterSpacing: 0.5 },
  exercises: { gap: SPACING.sm },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  exNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#1A1700', justifyContent: 'center', alignItems: 'center' },
  exNumText: { fontSize: FONTS.sizes.xs, fontWeight: '700', color: COLORS.primary },
  exIcon: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: '#1A1700', justifyContent: 'center', alignItems: 'center' },
  exInfo: { flex: 1, gap: 2 },
  exName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.white },
  exMeta: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
});
