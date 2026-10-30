import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { EXERCISES, CATEGORIES } from '../data/exercises';
import { Ionicons } from '@expo/vector-icons';

const CATEGORY_ICONS = {
  'Pernas':   'walk-outline',
  'Peito':    'body-outline',
  'Costas':   'arrow-back-outline',
  'Ombros':   'accessibility-outline',
  'Braços':   'hand-left-outline',
  'Core':     'ellipse-outline',
  'Glúteos':  'stats-chart-outline',
  'Cardio':   'heart-outline',
};

const DIFFICULTY_COLORS = {
  'Iniciante':     { bg: '#0D1A0D', text: COLORS.success },
  'Intermediário': { bg: '#1A1200', text: COLORS.warning },
  'Avançado':      { bg: '#1A0A0A', text: COLORS.error },
};

export default function ExercisesScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');

  const filtered = EXERCISES.filter(ex => {
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'Todos' || ex.category === activeCategory;
    return matchSearch && matchCat;
  });

  const diffStyle = (difficulty) => DIFFICULTY_COLORS[difficulty] || { bg: COLORS.bgCardAlt, text: COLORS.textMuted };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header fixo */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Exercícios</Text>
          <Text style={styles.count}>{filtered.length} de {EXERCISES.length}</Text>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar exercício..."
            placeholderTextColor={COLORS.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Limpar busca" onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          horizontal
          data={['Todos', ...CATEGORIES]}
          keyExtractor={item => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.catChip, activeCategory === item && styles.catChipActive]}
              onPress={() => setActiveCategory(item)}
            >
              <Text style={[styles.catChipText, activeCategory === item && styles.catChipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Lista separada do header */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={32} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Nenhum exercício encontrado</Text>
          </View>
        }
        renderItem={({ item }) => {
          const diff = diffStyle(item.difficulty);
          const iconName = CATEGORY_ICONS[item.category] || 'fitness-outline';
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('ExerciseDetail', { exercise: item })}
              activeOpacity={0.8}
            >
              <View style={styles.cardIcon}>
                <Ionicons name={iconName} size={22} color={COLORS.primary} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{item.name}</Text>
                <View style={styles.cardTags}>
                  <View style={styles.tagCategory}>
                    <Text style={styles.tagCategoryText}>{item.category}</Text>
                  </View>
                  <View style={[styles.tagDiff, { backgroundColor: diff.bg }]}>
                    <Text style={[styles.tagDiffText, { color: diff.text }]}>{item.difficulty}</Text>
                  </View>
                </View>
                <Text style={styles.equipment}>{item.equipment}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'baseline', marginBottom: SPACING.sm,
  },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.white },
  count: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, marginBottom: SPACING.sm,
  },
  searchInput: { flex: 1, color: COLORS.white, fontSize: FONTS.sizes.md, paddingVertical: 10 },
  catList: { gap: SPACING.xs, paddingBottom: 2 },
  catChip: {
    paddingHorizontal: SPACING.md, paddingVertical: 6,
    borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '500' },
  catChipTextActive: { color: COLORS.black, fontWeight: '700' },
  list: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.xxl },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, gap: SPACING.md,
  },
  cardIcon: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    backgroundColor: '#1A1700', justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1, gap: 4 },
  cardName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.white },
  cardTags: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  tagCategory: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: RADIUS.full, backgroundColor: '#1A1700',
  },
  tagCategoryText: { fontSize: 11, fontWeight: '500', color: COLORS.primary },
  tagDiff: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  tagDiffText: { fontSize: 11, fontWeight: '500' },
  equipment: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  empty: { alignItems: 'center', paddingTop: SPACING.xxl, gap: SPACING.md },
  emptyText: { color: COLORS.textMuted, fontSize: FONTS.sizes.md },
});
