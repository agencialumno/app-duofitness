import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, HEALTH_UI } from '../../utils/theme';
import { scoreBand } from '../../utils/health';
import { scorePhrase } from '../../utils/healthView';
import { COACH_TEXTS } from '../../data/healthCoachTexts';
import InfoButton from '../InfoButton';

const { space, type, card, minTouch } = HEALTH_UI;
const BAND_COLOR = { great: COLORS.success, good: COLORS.primary, fair: COLORS.warning, low: COLORS.error, none: COLORS.textSecondary };

// ---- (a) Cabeçalho: Duo Score em destaque (barra feita com Views), nota e uma frase curta ----
export function ScoreHero({ loading, result, score, minor }) {
  const band = scoreBand(score);
  const color = BAND_COLOR[band.id];
  return (
    <View style={styles.card} testID="health-summary">
      <View style={styles.rowBetween}>
        <Text style={[styles.sectionTitle, styles.flex]}>Duo Score</Text>
        <InfoButton tema="duoScore" />
      </View>
      {loading || !result ? (
        <Text style={styles.support}>Carregando…</Text>
      ) : (
        <>
          <View style={styles.scoreRow} accessible accessibilityLabel={score === null ? 'Duo Score: sem dados ainda' : `Duo Score ${score} de 100, ${band.label}`}>
            <Text style={[styles.scoreNumber, { color }]}>{score === null ? '—' : score}</Text>
            <View style={styles.scoreSide}>
              <Text style={styles.caption}>de 100</Text>
              <Text style={[styles.band, { color }]}>{band.label}</Text>
            </View>
          </View>
          <View style={styles.bar} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <View style={[styles.barFill, { width: `${score ?? 0}%`, backgroundColor: color }]} />
          </View>
          <Text style={styles.support} testID="health-phrase">{scorePhrase(score, { missing: result.missing.length })}</Text>
        </>
      )}
      {minor ? <Text style={styles.caption}>Só hábitos: atividade, sono, coração e recuperação e hidratação.</Text> : null}
    </View>
  );
}

// ---- (b) Ações rápidas (alvos de pelo menos 44 pt; quebram em duas linhas com texto grande) ----
export function QuickActions({ minor, onRegister, onWater, waterText, onConnect }) {
  return (
    <View style={styles.quickRow} testID="health-quick">
      <QuickButton testID="quick-register" icon="create-outline" label={minor ? 'Registrar sono' : 'Registrar peso'} onPress={onRegister} />
      <QuickButton
        testID="quick-water"
        icon="water-outline"
        label="Água +1"
        sub={waterText}
        onPress={onWater}
        accessibilityLabel={`Adicionar um copo de água.${waterText ? ` ${waterText}.` : ''}`}
      />
      {!minor ? (
        <QuickButton testID="health-connect-card" icon="link-outline" label="Conectar" sub="Em breve" onPress={onConnect} muted accessibilityLabel="Conectar dispositivos: em breve. Abre a tela de conexão, hoje indisponível." />
      ) : null}
    </View>
  );
}

function QuickButton({ icon, label, sub, onPress, muted, testID, accessibilityLabel }) {
  return (
    <TouchableOpacity
      testID={testID}
      style={[styles.quick, muted && styles.quickMuted]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
    >
      <Ionicons name={icon} size={20} color={muted ? COLORS.textSecondary : COLORS.primary} />
      <View style={styles.quickText}>
        <Text style={[styles.quickLabel, muted && { color: COLORS.textSecondary }]}>{label}</Text>
        {sub ? <Text style={styles.caption}>{sub}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

// ---- (c) Chips que rolam a tela até cada categoria ----
export function CategoryChips({ items, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.chips} testID="health-chips" accessibilityLabel="Ir para uma categoria">
      {items.map((v) => (
        <TouchableOpacity
          key={v.id}
          testID={`chip-${v.id}`}
          style={styles.chip}
          onPress={() => onSelect(v.id)}
          accessibilityRole="button"
          accessibilityLabel={`Ir para ${v.label}${v.hasData ? '' : ', sem dados'}`}
        >
          <Text style={styles.chipText}>{v.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ---- (d) Cartão de sugestões: até 3 itens, a ação visível e o motivo recolhido ----
export function SuggestionsCard({ coach, onToggle }) {
  const [open, setOpen] = useState({});
  if (!coach) return null;
  const list = coach.insufficient ? [] : coach.suggestions.slice(0, 3);
  return (
    <View style={styles.card} testID="health-coach">
      <Text style={styles.sectionTitle}>{COACH_TEXTS.title}</Text>
      {coach.insufficient ? (
        <Text style={styles.support}>{coach.message}</Text>
      ) : (
        list.map((s) => (
          <View key={s.id} style={styles.sugRow}>
            <View style={styles.sugHead}>
              <Ionicons name="bulb-outline" size={18} color={COLORS.primary} />
              <Text style={styles.sugAction}>{s.action}</Text>
            </View>
            <TouchableOpacity
              style={styles.whyBtn}
              onPress={() => { if (onToggle) onToggle(); setOpen((o) => ({ ...o, [s.id]: !o[s.id] })); }}
              accessibilityRole="button"
              accessibilityState={{ expanded: !!open[s.id] }}
              accessibilityLabel={open[s.id] ? 'Esconder o motivo' : 'Ver o motivo'}
            >
              <Text style={styles.whyText}>Por quê?</Text>
              <Ionicons name={open[s.id] ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.primary} />
            </TouchableOpacity>
            {open[s.id] ? <Text style={styles.support}>{s.reason}</Text> : null}
          </View>
        ))
      )}
    </View>
  );
}

// ---- (e) Categorias sem dados: agrupadas e recolhidas em "Sem dados ainda" ----
export function NoDataGroup({ views, open, onToggle, onOpenCategory, onLayout }) {
  if (!views || views.length === 0) return null;
  return (
    <View style={styles.card} testID="health-nodata" onLayout={onLayout}>
      <TouchableOpacity
        style={styles.collapseHead}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Sem dados ainda, ${views.length} ${views.length === 1 ? 'categoria' : 'categorias'}. ${open ? 'Recolher' : 'Mostrar'}`}
      >
        <Text style={[styles.sectionTitle, styles.flex]}>Sem dados ainda · {views.length}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.primary} />
      </TouchableOpacity>
      {open
        ? views.map((v) => (
          <TouchableOpacity
            key={v.id}
            testID={`health-card-${v.id}`}
            style={styles.emptyRow}
            onPress={() => onOpenCategory(v.id)}
            accessibilityRole="button"
            accessibilityLabel={`${v.label}: sem dados. ${v.empty.action.label}. Toque para abrir.`}
          >
            <Ionicons name={v.icon} size={20} color={COLORS.primary} />
            <Text style={styles.emptyLabel}>{v.label}</Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{v.empty.action.label}</Text>
            </View>
          </TouchableOpacity>
        ))
        : null}
    </View>
  );
}

// ---- (f) Relatório semanal, recolhido por padrão ----
export function WeeklyReport({ result, notes, onToggle }) {
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState(false);
  if (!result) return null;
  const toggle = () => { if (onToggle) onToggle(); setOpen((v) => !v); };
  return (
    <View style={styles.card} testID="health-report">
      <TouchableOpacity style={styles.collapseHead} onPress={toggle} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`Relatório semanal. ${open ? 'Recolher' : 'Mostrar'}`}>
        <Text style={[styles.sectionTitle, styles.flex]}>Relatório semanal</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.primary} />
      </TouchableOpacity>
      {open ? (
        <>
          {notes.map((c) => (
            <View key={c.id} style={styles.noteRow} accessible accessibilityLabel={`${c.label}: ${c.value === null ? 'sem dados' : `${c.value} de 100, ${c.grade}`}`}>
              <View style={styles.rowBetween}>
                <Text style={[styles.label, styles.flex]}>{c.label}</Text>
                <Text style={styles.support}>{c.value === null ? 'Sem dados' : `${c.value} · ${c.grade}`}</Text>
              </View>
              <View style={styles.barSmall}>
                <View style={[styles.barFill, { width: `${c.value ?? 0}%`, backgroundColor: BAND_COLOR[scoreBand(c.value).id] }]} />
              </View>
            </View>
          ))}
          {result.missing.length > 0 ? (
            <View style={styles.missing}>
              <Text style={styles.label}>O que falta</Text>
              {result.missing.map((m) => (
                <View key={m} style={styles.missingRow}>
                  <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
                  <Text style={[styles.support, styles.flex, { color: COLORS.white }]}>{m.charAt(0).toUpperCase() + m.slice(1)}</Text>
                </View>
              ))}
              <Text style={styles.caption}>Categoria sem dados não entra na conta e não diminui o seu score.</Text>
            </View>
          ) : null}
          <TouchableOpacity style={styles.whyBtn} onPress={() => setWhy((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: why }} accessibilityLabel="Por que este número?">
            <Text style={styles.whyText}>Por que este número?</Text>
            <Ionicons name={why ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.primary} />
          </TouchableOpacity>
          {why ? (
            <View style={styles.missing}>
              <Text style={styles.support}>O score é a média ponderada só dos itens que têm dados. Item sem registro não conta contra você.</Text>
              {result.components.map((c) => (
                <View key={c.id} style={styles.compRow}>
                  <View style={styles.rowBetween}>
                    <Text style={[styles.label, styles.flex]}>{c.label}</Text>
                    <Text style={[styles.label, { color: COLORS.primary }]}>{c.present ? `${c.value}/100` : 'sem dados'}</Text>
                  </View>
                  <Text style={styles.caption}>
                    {c.present ? `${c.detail}. Peso no cálculo: ${c.share}%, soma ${String(c.points).replace('.', ',')} pontos.` : `Fora do cálculo: ${c.detail}.`}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { backgroundColor: COLORS.bgCard, borderRadius: card.radius, borderWidth: card.borderWidth, borderColor: COLORS.border, padding: space.cardPadding, gap: space.cardGap },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.inner },
  sectionTitle: { ...type.section, color: COLORS.white },
  label: { ...type.label, color: COLORS.white },
  support: { ...type.support, color: COLORS.textSecondary },
  caption: { ...type.caption, color: COLORS.textSecondary },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.screen },
  scoreNumber: { fontSize: 56, lineHeight: 64, fontWeight: '700' },
  scoreSide: { paddingBottom: space.inner },
  band: { ...type.section },
  bar: { height: 12, borderRadius: 6, backgroundColor: COLORS.bgCardAlt, overflow: 'hidden' },
  barSmall: { height: 8, borderRadius: 4, backgroundColor: COLORS.bgCardAlt, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.cardGap },
  quick: { flexGrow: 1, flexBasis: 120, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.inner, paddingHorizontal: space.screen, paddingVertical: space.inner, borderRadius: card.radius, borderWidth: card.borderWidth, borderColor: COLORS.border, backgroundColor: COLORS.bgCard },
  quickMuted: { backgroundColor: COLORS.bg },
  quickText: { flexShrink: 1 },
  quickLabel: { ...type.label, color: COLORS.white },
  chips: { gap: space.inner, paddingRight: space.screen },
  chip: { minHeight: minTouch, justifyContent: 'center', paddingHorizontal: space.screen, borderRadius: 999, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  chipText: { ...type.support, fontWeight: '600', color: COLORS.white },
  sugRow: { gap: space.tight },
  sugHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.inner },
  sugAction: { flex: 1, ...type.label, color: COLORS.primary },
  whyBtn: { minHeight: minTouch, flexDirection: 'row', alignItems: 'center', gap: space.tight },
  whyText: { ...type.support, fontWeight: '700', color: COLORS.primary },
  collapseHead: { minHeight: minTouch, flexDirection: 'row', alignItems: 'center', gap: space.inner },
  emptyRow: { minHeight: minTouch, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.inner, paddingVertical: space.tight },
  emptyLabel: { flex: 1, ...type.label, color: COLORS.white },
  pill: { minHeight: minTouch, justifyContent: 'center', paddingHorizontal: space.screen, borderRadius: 999, backgroundColor: COLORS.primary },
  pillText: { ...type.support, fontWeight: '700', color: COLORS.black },
  noteRow: { gap: space.tight },
  missing: { gap: space.inner },
  missingRow: { flexDirection: 'row', alignItems: 'center', gap: space.tight },
  compRow: { gap: 2, paddingVertical: space.tight, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
});
