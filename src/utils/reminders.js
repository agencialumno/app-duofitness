// Agenda dos lembretes (PURA: sem React Native, sem notificações, sem armazenamento; o relógio entra por parâmetro). Fuso America/Sao_Paulo.
//
// Regras:
//  - NO MÁXIMO 1 notificação por dia, POR CONSTRUÇÃO: a agenda é um mapa dia -> uma notificação.
//  - Lembrete de treino: nos dias da semana escolhidos, no horário escolhido (padrão 18h), por 7 dias contados do último acesso.
//  - Inatividade: no 3º, 7º e 14º dia desde o último acesso, no mesmo horário; depois, silêncio total.
//  - Dia de treino escolhido: VENCE o lembrete de treino; o marco de inatividade desse dia é DESCARTADO (não adiado).
//  - Silêncio de 21h às 8h: nada nesse intervalo; o horário vai para o próximo válido (8h do mesmo dia, ou do dia seguinte se passou das 21h).
//  - Ao abrir o app, o chamador cancela tudo e reagenda com `lastOpen` = agora (remindersService.js).
import { REMINDER_TITLE, INACTIVITY_TEXTS, TRAINING_TEXTS } from '../data/reminderTexts';
import { addDaysKey, dayKeySP } from './saoPauloDay';

export const INACTIVITY_MARKS = [3, 7, 14];
export const TRAINING_WINDOW_DAYS = 7;
export const QUIET_START_HOUR = 21;
export const QUIET_END_HOUR = 8;
export const DEFAULT_HOUR = 18;
export const DEFAULT_MINUTE = 0;
export const SP_OFFSET_HOURS = 3; // America/Sao_Paulo = UTC-3, sem horário de verão desde 2019
const LEAD_MS = 60 * 1000; // não agenda para o próximo minuto

export const DEFAULT_PREFS = Object.freeze({
  version: 1,
  enabled: true, // ligados por padrão (só agendam depois da permissão)
  hour: DEFAULT_HOUR,
  minute: DEFAULT_MINUTE,
  days: null, // null = derivar dos dias da série; lista de 0 (domingo) a 6 (sábado) = escolha da pessoa
  permission: 'unknown', // 'unknown' | 'granted' | 'denied' (último estado conhecido)
  askedAt: null, // quando a explicação foi mostrada (nunca insistir)
  lastOpen: null, // ISO do último acesso
});

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const int = (v, lo, hi, fallback) => (Number.isInteger(v) && v >= lo && v <= hi ? v : fallback);
const isoOrNull = (v) => (typeof v === 'string' && Number.isFinite(new Date(v).getTime()) ? v : null);

export function sanitizePrefs(v) {
  if (!isObj(v)) return undefined;
  const days = Array.isArray(v.days) ? [...new Set(v.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b) : null;
  return {
    version: 1,
    enabled: v.enabled !== false,
    hour: int(v.hour, 0, 23, DEFAULT_HOUR),
    minute: int(v.minute, 0, 59, DEFAULT_MINUTE),
    days,
    permission: ['unknown', 'granted', 'denied'].includes(v.permission) ? v.permission : 'unknown',
    askedAt: isoOrNull(v.askedAt),
    lastOpen: isoOrNull(v.lastOpen),
  };
}

// Dias da semana padrão pelos dias por semana da série (0 = domingo). Sem a informação (séries migradas): 3 dias = segunda, quarta e sexta.
export function defaultWeekdays(daysPerWeek) {
  const n = Number(daysPerWeek);
  if (n === 1) return [3];
  if (n === 2) return [1, 4];
  return [1, 3, 5];
}

const parts = (key) => String(key).split('-').map(Number);
export const weekdayOfKey = (key) => { const [y, m, d] = parts(key); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
export const epochDay = (key) => { const [y, m, d] = parts(key); return Math.floor(Date.UTC(y, m - 1, d) / 86400000); };
// O instante em que o relógio de São Paulo marca hour:minute no dia `key`.
export const instantSP = (key, hour, minute) => { const [y, m, d] = parts(key); return new Date(Date.UTC(y, m - 1, d, hour + SP_OFFSET_HOURS, minute)); };

// Silêncio 21h-8h: devolve o próximo horário válido { key, hour, minute }.
export function shiftQuiet(key, hour, minute) {
  const m = hour * 60 + minute;
  if (m >= QUIET_START_HOUR * 60) return { key: addDaysKey(key, 1), hour: QUIET_END_HOUR, minute: 0 };
  if (m < QUIET_END_HOUR * 60) return { key, hour: QUIET_END_HOUR, minute: 0 };
  return { key, hour, minute };
}

export const isQuietTime = (hour, minute) => hour * 60 + minute >= QUIET_START_HOUR * 60 || hour * 60 + minute < QUIET_END_HOUR * 60;

const pick = (list, seed) => list[((seed % list.length) + list.length) % list.length];

/**
 * Agenda: lista ordenada de { id, kind: 'treino'|'inatividade', dayKey, when: Date, title, body }, no máximo uma por dia.
 * `prefs` (sanitizados), `now` (Date), `seriesDays` (dias por semana da série atual, opcional).
 */
export function buildSchedule({ prefs, now = new Date(), seriesDays } = {}) {
  const p = prefs || DEFAULT_PREFS;
  if (!p.enabled) return [];
  const nowMs = now.getTime();
  const today = dayKeySP(now);
  let lastKey = dayKeySP(p.lastOpen || now);
  if (!lastKey || lastKey > today) lastKey = today;
  const weekdays = Array.isArray(p.days) ? p.days : defaultWeekdays(seriesDays);
  const byDay = new Map();

  // inatividade primeiro; o treino do mesmo dia a SUBSTITUI (a de inatividade é descartada, não adiada)
  for (const mark of INACTIVITY_MARKS) {
    const t = shiftQuiet(addDaysKey(lastKey, mark), p.hour, p.minute);
    const when = instantSP(t.key, t.hour, t.minute);
    if (when.getTime() <= nowMs + LEAD_MS) continue;
    byDay.set(t.key, {
      id: `duo-inat-${t.key}`, kind: 'inatividade', dayKey: t.key, when, mark,
      title: REMINDER_TITLE, body: pick(INACTIVITY_TEXTS, epochDay(t.key) + mark),
    });
  }
  for (let off = 0; off <= TRAINING_WINDOW_DAYS; off++) {
    const base = addDaysKey(lastKey, off);
    if (!weekdays.includes(weekdayOfKey(base))) continue;
    const t = shiftQuiet(base, p.hour, p.minute);
    const when = instantSP(t.key, t.hour, t.minute);
    if (when.getTime() <= nowMs + LEAD_MS) continue;
    // se o silêncio empurrou um treino para o dia seguinte, o treino daquele dia (processado depois, em ordem) o substitui: continua 1 por dia
    byDay.set(t.key, {
      id: `duo-treino-${t.key}`, kind: 'treino', dayKey: t.key, when,
      title: REMINDER_TITLE, body: pick(TRAINING_TEXTS, epochDay(t.key)),
    });
  }
  return [...byDay.values()].sort((a, b) => a.when - b.when).map(({ mark, ...rest }) => rest);
}
