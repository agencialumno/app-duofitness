import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { EXERCISES, CATEGORIES } from '../data/exercises';
import { Ionicons } from '@expo/vector-icons';

export default function CreateWorkoutScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { addWorkout } = useApp();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Full Body');
  const [selected, setSelected] = useState([]);
  const [filterCat, setFilterCat] = useState('Todos');

  const allCats = ['Todos', ...CATEGORIES];
  const filtered = filterCat === 'Todos' ? EXERCISES : EXERCISES.filter(e => e.category === filterCat);
  const isSelected = (id) => selected.find(s => s.id === id);

  const toggleExercise = (ex) => {
    if (isSelected(ex.id)) {
      setSelected(selected.filter(s => s.id !== ex.id));
    } else {
      setSelected([...selected, { ...ex, sets: ex.defaultSets || 3, reps: ex.defaultReps || '12', rest: ex.defaultRest || 60 }]);
    }
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert('Atenção', 'Dê um nome ao treino.');
    if (selected.length === 0) return Alert.alert('Atenção', 'Selecione ao menos um exercício.');
    await addWorkout({ name: name.trim(), category, exercises: selected });
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.title}>Novo Treino</Text>
        <TouchableOpacity onPress={save}>
          <Text style={styles.saveBtn}>Salvar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Nome do treino"
          placeholderTextColor={COLORS.textMuted}
          maxLength={40}
        />

        <Text style={styles.label}>Categoria</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {[...CATEGORIES, 'Full Body'].map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, category === c && styles.chipActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.exHeader}>
          <Text style={styles.label}>Exercícios</Text>
          {selected.length > 0 && <Text style={styles.selectedCount}>{selected.length} selecionado(s)</Text>}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {allCats.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.filterChip, filterCat === c && styles.filterChipActive]}
                onPress={() => setFilterCat(c)}
              >
                <Text style={[styles.filterChipText, filterCat === c && styles.filterChipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.exercises}>
          {filtered.map(ex => {
            const sel = isSelected(ex.id);
            return (
              <TouchableOpacity
                key={ex.id}
                style={[styles.exCard, sel && styles.exCardActive]}
                onPress={() => toggleExercise(ex)}
              >
                <View style={[styles.exIconWrap, sel && styles.exIconWrapActive]}>
                  <Ionicons name="fitness-outline" size={20} color={sel ? COLORS.black : COLORS.textSecondary} />
                </View>
                <View style={styles.exInfo}>
                  <Text style={styles.exName}>{ex.name}</Text>
                  <Text style={styles.exMeta}>{ex.category} · {ex.difficulty}</Text>
                </View>
                <View style={[styles.checkBox, sel && styles.checkBoxActive]}>
                  {sel && <Ionicons name="checkmark" size={14} color={COLORS.black} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  closeBtn: { padding: SPACING.xs },
  title: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.white },
  saveBtn: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.primary },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  input: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, color: COLORS.white, fontSize: FONTS.sizes.md },
  label: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', gap: SPACING.xs, paddingBottom: SPACING.xs },
  chip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextActive: { color: COLORS.black },
  exHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectedCount: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '600' },
  filterChip: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full, backgroundColor: COLORS.bgCardAlt },
  filterChipActive: { backgroundColor: '#1A1700' },
  filterChipText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  filterChipTextActive: { color: COLORS.primary },
  exercises: { gap: SPACING.sm },
  exCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  exCardActive: { borderColor: COLORS.primary, backgroundColor: '#141200' },
  exIconWrap: { width: 40, height: 40, borderRadius: RADIUS.sm, backgroundColor: COLORS.bgCardAlt, justifyContent: 'center', alignItems: 'center' },
  exIconWrapActive: { backgroundColor: COLORS.primary },
  exInfo: { flex: 1 },
  exName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.white },
  exMeta: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  checkBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  checkBoxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
});
