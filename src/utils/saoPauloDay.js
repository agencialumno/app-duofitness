// Helper ÚNICO de "dia" do histórico de séries: a virada de dia é em America/Sao_Paulo, qualquer que seja o fuso do aparelho. Puro (sem React Native).
// Não substitui o dayKey da Saúde nem o computeStreak, que seguem no dia local do aparelho.
// Usa Intl com o fuso IANA; se o motor não tiver Intl com fuso, cai em UTC-3 fixo (o Brasil não tem horário de verão desde 2019).
const TZ = 'America/Sao_Paulo';
const FALLBACK_OFFSET_MS = 3 * 60 * 60 * 1000;

let formatter;
function getFormatter() {
  if (formatter === undefined) {
    try {
      formatter = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
      if (typeof formatter.formatToParts !== 'function') formatter = null;
      else formatter.formatToParts(new Date(0));
    } catch {
      formatter = null;
    }
  }
  return formatter;
}

// "AAAA-MM-DD" do instante `date` no fuso de São Paulo; null se a data for inválida.
export function dayKeySP(date = new Date()) {
  const d = new Date(date);
  if (!Number.isFinite(d.getTime())) return null;
  const f = getFormatter();
  if (f) {
    const p = {};
    for (const part of f.formatToParts(d)) p[part.type] = part.value;
    if (p.year && p.month && p.day) return `${p.year}-${p.month}-${p.day}`;
  }
  const s = new Date(d.getTime() - FALLBACK_OFFSET_MS);
  return `${s.getUTCFullYear()}-${String(s.getUTCMonth() + 1).padStart(2, '0')}-${String(s.getUTCDate()).padStart(2, '0')}`;
}

// Soma dias a uma chave "AAAA-MM-DD" (aritmética de calendário pura, sem fuso).
export function addDaysKey(key, delta) {
  const [y, m, d] = String(key).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

// "AAAA-MM-DD" -> "dd/mm/aaaa"
export function formatDayBR(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}
