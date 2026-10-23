// Regras das conquistas (puro, sem estado). Chamado por AppContext.completeSession.
//
// "3 dias seguidos" e "Semana perfeita" usam a sequência POR DATAS (computeStreak, de health.js: a mesma da
// Home, do Perfil e da Saúde). As demais regras continuam por total de sessões ou XP. Conquistas já
// desbloqueadas nunca são revogadas: só se acrescenta.
import { computeStreak } from './health';

export const ACHIEVEMENT_RULES = [
  { id: 'first_workout', title: 'Primeira série!', icon: '🏆', test: (c) => c.sessions.length >= 1 },
  { id: 'week_warrior', title: 'Guerreiro da semana', icon: '🔥', test: (c) => c.sessions.length >= 7 },
  { id: 'monthly_beast', title: 'Besta mensal', icon: '💪', test: (c) => c.sessions.length >= 30 },
  { id: 'streak_3', title: '3 dias seguidos', icon: '⚡', test: (c) => c.dateStreak >= 3 },
  { id: 'streak_7', title: 'Semana perfeita', icon: '🌟', test: (c) => c.dateStreak >= 7 },
  { id: 'xp_500', title: '500 XP acumulado', icon: '🎯', test: (c) => c.xp >= 500 },
  { id: 'xp_1000', title: 'Mestre do XP', icon: '👑', test: (c) => c.xp >= 1000 },
];

// Devolve { list, changed }. `list` é uma lista nova (a original não é alterada).
export function evaluateAchievements({ current, sessions, xp, now = new Date() }) {
  const done = Array.isArray(current) ? current : [];
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const ctx = { sessions: safeSessions, xp: Number(xp) || 0, dateStreak: computeStreak(safeSessions, now) };
  const list = [...done];
  let changed = false;
  for (const rule of ACHIEVEMENT_RULES) {
    if (list.some((a) => a.id === rule.id) || !rule.test(ctx)) continue;
    list.push({ id: rule.id, title: rule.title, icon: rule.icon, unlockedAt: new Date(now).toISOString() });
    changed = true;
  }
  return { list, changed };
}
