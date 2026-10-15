// Lista de gravação dos vídeos: todos os exercícios de EXERCISE_DB, com equipamento, combos em que aparecem
// e quantas séries A, B e C os usam. Função pura: recebe o gerador por parâmetro (o script usa um carregador
// com Babel; o teste do Vitest importa os módulos direto), então não depende de Node ESM puro.

const FOCUSES = [undefined, 'upper', 'lower', 'core'];
const LEVELS = ['beginner', 'intermediate'];

// Cenário fixo e determinístico: cada combo x foco x nível, 3 séries de 90 min, sem limitação.
export function computeUsage({ generateWorkoutPlan, COMBOS }) {
  const usage = {}; // id -> { A, B, C, total }
  for (const combo of COMBOS) {
    for (const focus of FOCUSES) {
      for (const level of LEVELS) {
        const plan = generateWorkoutPlan({
          goals: ['health'], level, days: 3, time: 90, equipment: combo.equipment, focus,
          limitation: 'none', imcCategory: 'normal', gender: 'male', ageGroup: '26-35',
        });
        for (const w of plan) {
          for (const ex of w.exercises) {
            const u = (usage[ex.id] ||= { A: 0, B: 0, C: 0, total: 0 });
            u[w.serie] += 1;
            u.total += 1;
          }
        }
      }
    }
  }
  return usage;
}

export function buildRecordingRows({ EXERCISE_DB, generateWorkoutPlan, COMBOS }) {
  const usage = computeUsage({ generateWorkoutPlan, COMBOS });
  const rows = [];
  for (const list of Object.values(EXERCISE_DB)) {
    for (const ex of list) {
      const combos = COMBOS.filter((c) => ex.equipment === 'bodyweight' || c.equipment.includes(ex.equipment)).map((c) => c.label);
      const u = usage[ex.id] || { A: 0, B: 0, C: 0, total: 0 };
      rows.push({ id: ex.id, name: ex.name, category: ex.category, equipment: ex.equipment, combos, A: u.A, B: u.B, C: u.C, total: u.total });
    }
  }
  // mais usados primeiro; empate: nome
  return rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR'));
}

export const LIST_START = '<!-- gen:lista:inicio -->';
export const LIST_END = '<!-- gen:lista:fim -->';

function comboText(combos) {
  if (combos.length === 5) return 'todos (UNO a ELITE)';
  return `${combos[0]} a ${combos[combos.length - 1]}`.replace(/^(\w+) a \1$/, '$1');
}

export function renderRecordingList(rows, existingIds = new Set()) {
  const lines = [
    `Total: **${rows.length}** exercícios. Ordem: quantas séries A, B e C usam o exercício (somando todos os combos, focos e níveis do cenário de contagem), do mais usado para o menos usado. Marque ✅ quando o vídeo e a capa estiverem em \`assets/exercicios/\`.`,
    '',
    '| # | Gravado | Arquivo (id) | Exercício | Equipamento | Combos | A | B | C | Total |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ];
  rows.forEach((r, i) => {
    lines.push(`| ${i + 1} | ${existingIds.has(r.id) ? '✅' : '⬜'} | \`${r.id}\` | ${r.name} | ${r.equipment} | ${comboText(r.combos)} | ${r.A} | ${r.B} | ${r.C} | ${r.total} |`);
  });
  return lines.join('\n');
}

// Troca o trecho entre os marcadores do documento.
export function replaceList(doc, list) {
  const a = doc.indexOf(LIST_START);
  const b = doc.indexOf(LIST_END);
  if (a < 0 || b < 0 || b < a) throw new Error('Marcadores da lista de gravação não encontrados em docs/videos-exercicios.md');
  return `${doc.slice(0, a + LIST_START.length)}\n\n${list}\n\n${doc.slice(b)}`;
}
