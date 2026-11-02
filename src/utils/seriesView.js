// Visão do histórico de séries (puro): agrupa para a tela Meus Treinos, calcula treinos concluídos e sequência de dias NA HORA a partir das sessões
// (@duo_sessions, atribuídas ao registro pelo id do treino) e monta os textos da linha do tempo, com alternativa textual para leitor de tela.
// Dados novos não são inventados: objetivo/nível/combo de série migrada = "desconhecido"; peso ausente = "sem registro". Menor de 18 nunca vê peso.
import { COMBOS } from '../data/combosEquipment';
import { GOAL_OPTIONS, LEVEL_OPTIONS } from './planOptions';
import { addDaysKey, dayKeySP, formatDayBR } from './saoPauloDay';
import { isAdultAge } from './seriesHistory';

export const UNKNOWN = 'desconhecido';
export const DELETE_SERIES_TITLE = 'Excluir esta série?';
export const DELETE_SERIES_MESSAGE = 'Tem certeza? Esta série e a linha do tempo dela serão apagadas. Seus treinos realizados continuam contando no perfil. Não dá para desfazer.';

// Confirmação obrigatória, igual para a série atual e as anteriores. Nada é apagado antes de tocar em "Excluir série".
export function confirmDeleteSeries(Alert, onConfirm) {
  Alert.alert(DELETE_SERIES_TITLE, DELETE_SERIES_MESSAGE, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir série', style: 'destructive', onPress: onConfirm },
  ]);
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const fmtKg = (kg) => `${String(Math.round(kg * 10) / 10).replace('.', ',')} kg`;

// Dias (AAAA-MM-DD, fuso de São Paulo) com treino concluído desta série, em ordem.
export function seriesTrainingDays(record, sessions) {
  const ids = new Set(record.workoutIds);
  const days = new Set();
  for (const s of Array.isArray(sessions) ? sessions : []) {
    if (!s || !ids.has(String(s.workoutId))) continue;
    const k = s.completedAt ? dayKeySP(s.completedAt) : null;
    if (k) days.add(k);
  }
  return [...days].sort();
}

// Maior sequência de dias seguidos com treino desta série.
export function bestStreakOf(days) {
  let best = 0;
  let run = 0;
  let prev = null;
  for (const d of days) {
    run = prev && addDaysKey(prev, 1) === d ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }
  return best;
}

// Sequência de dias seguidos até hoje (ou até ontem) com treino, no fuso de São Paulo, sobre QUALQUER lista de sessões.
export function currentStreakSP(sessions, now = new Date()) {
  const days = new Set((Array.isArray(sessions) ? sessions : []).map((s) => (s?.completedAt ? dayKeySP(s.completedAt) : null)).filter(Boolean));
  let key = dayKeySP(now);
  if (!days.has(key)) key = addDaysKey(key, -1);
  let n = 0;
  while (days.has(key)) { n++; key = addDaysKey(key, -1); }
  return n;
}

const labelOf = (list, id) => list.find((o) => o.id === id)?.label;

export function describeSeries({ record, workouts, sessions, ageGroup }) {
  const ids = new Set(record.workoutIds);
  const mine = (Array.isArray(sessions) ? sessions : []).filter((s) => s && ids.has(String(s.workoutId)));
  const days = seriesTrainingDays(record, sessions);
  const streak = bestStreakOf(days);
  const dateKey = dayKeySP(record.createdAt);
  const dateText = formatDayBR(dateKey);
  const goalsText = record.goals ? record.goals.map((g) => labelOf(GOAL_OPTIONS, g) || g).join(' e ') : UNKNOWN;
  const levelText = record.level ? labelOf(LEVEL_OPTIONS, record.level) || record.level : UNKNOWN;
  const comboText = record.combo ? (COMBOS.find((c) => c.id === record.combo)?.label || record.combo) : UNKNOWN;

  // Peso: só maiores de 18. Peso inicial sempre que houver; variação só com 2 ou mais pontos.
  const showWeight = isAdultAge(ageGroup);
  const points = showWeight ? record.weights : [];
  let weightText = null;
  let weightDelta = null;
  if (showWeight) {
    if (points.length === 0) weightText = 'Peso: sem registro';
    else if (points.length === 1) weightText = `Peso inicial: ${fmtKg(points[0].kg)}`;
    else {
      weightDelta = Math.round((points[points.length - 1].kg - points[0].kg) * 10) / 10;
      const change = weightDelta === 0 ? 'sem variação' : weightDelta < 0 ? `diminuiu ${fmtKg(-weightDelta)}` : `aumentou ${fmtKg(weightDelta)}`;
      weightText = `Peso inicial: ${fmtKg(points[0].kg)}; variação: ${change}`;
    }
  }

  const lines = [
    `Objetivo: ${goalsText}`,
    `Nível: ${levelText}`,
    `Combo: ${comboText}`,
    `Treinos concluídos: ${mine.length}`,
    `Maior sequência: ${plural(streak, 'dia', 'dias')}`,
    ...(weightText ? [weightText] : []),
  ];
  const a11y = `Série de ${dateText}. ${lines.join('. ')}.`;
  const present = (Array.isArray(workouts) ? workouts : []).filter((w) => ids.has(String(w.id)));
  const order = { A: 0, B: 1, C: 2 };
  present.sort((a, b) => (order[a.serie] ?? 9) - (order[b.serie] ?? 9));
  return { id: record.id, dateKey, dateText, goalsText, levelText, comboText, completed: mine.length, trainingDays: days.length, bestStreak: streak, weightText, weightDelta, lines, a11y, workouts: present, migrated: record.migrated === true };
}

// Tudo o que a tela Meus Treinos e a linha do tempo mostram.
export function buildHistoryView({ store, workouts, sessions, ageGroup }) {
  const items = store?.items || [];
  const all = Array.isArray(workouts) ? workouts : [];
  const inRecords = new Set(items.flatMap((r) => r.workoutIds));
  const described = items.map((record) => describeSeries({ record, workouts: all, sessions, ageGroup }));
  const newestFirst = described.slice().reverse();
  return {
    current: newestFirst[0] || null,
    previous: newestFirst.slice(1),
    others: all.filter((w) => !inRecords.has(String(w.id))), // treinos criados à mão (ou sem registro) ficam fora das séries anteriores
    timeline: newestFirst,
    count: items.length,
  };
}
