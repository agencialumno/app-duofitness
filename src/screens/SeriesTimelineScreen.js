import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { buildHistoryView } from '../utils/seriesView';

// "Evolução das séries": linha do tempo por série (data, objetivo, combo, treinos concluídos, sequência de dias e, só para maiores de 18, o peso).
// Cada item é UM bloco para leitor de tela, com todo o texto (não depende de gráfico nem de cor). Dados só do aparelho.
export default function SeriesTimelineScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { seriesStore, workouts, completedSessions, user, ageInfo } = useApp();
  const ageGroup = ageInfo?.ageGroup ?? user?.ageGroup;
  const view = useMemo(() => buildHistoryView({ store: seriesStore, workouts, sessions: completedSessions, ageGroup }), [seriesStore, workouts, completedSessions, ageGroup]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">Evolução das séries</Text>
      </View>
      {view.timeline.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Quando você gerar uma série, ela aparece aqui com os treinos concluídos.</Text>
        </View>
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={view.timeline}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <View style={styles.item} accessible accessibilityLabel={`${index === 0 ? 'Série atual. ' : ''}${item.a11y}`} testID={`timeline-${item.id}`}>
              <View style={styles.dot} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden />
              <View style={styles.itemBody}>
                <Text style={styles.date}>{`${item.dateText}${index === 0 ? ' · série atual' : ''}`}</Text>
                {item.lines.map((l) => <Text key={l} style={styles.line}>{l}</Text>)}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  backBtn: { width: 44, height: 44, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgCard },
  title: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.white, flex: 1 },
  list: { padding: SPACING.lg, paddingTop: 0, gap: SPACING.md },
  item: { flexDirection: 'row', gap: SPACING.md, borderLeftWidth: 2, borderLeftColor: COLORS.border, paddingLeft: SPACING.md },
  dot: { position: 'absolute', left: -7, top: 4, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  itemBody: { flex: 1, gap: 2, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  date: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.white },
  line: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  emptyText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
});
