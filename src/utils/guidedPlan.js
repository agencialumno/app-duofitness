// Série guiada: lógica pura (sem React Native), testável em Node.
// Usa só o que o workoutGenerator.js já exporta; os ajustes pedidos pelo morador são feitos
// DEPOIS do gerador (nunca dentro dele). Roda 100% no aparelho, sem rede.
import {
  EXERCISE_DB,
  LIMITATION_BLOCKED,
  filterByEquipment,
  filterByLevel,
  filterByLimitation,
  filterHighImpact,
  generateWorkoutPlan,
} from './workoutGenerator';
import { calculateIMC, getIMCCategory, getIMCRecommendations } from './imc';
import { COMBOS, getComboEquipment } from '../data/combosEquipment';
import { GOAL_OPTIONS, LEVEL_OPTIONS, LIMITATION_OPTIONS } from './planOptions';

export const PLAN_LABEL = 'Personal Trainer Duo';

export const DAYS_OPTIONS = [
  { id: 1, label: '1 dia', hint: 'Só a série A' },
  { id: 2, label: '2 dias', hint: 'Séries A e B' },
  { id: 3, label: '3 dias', hint: 'Séries A, B e C' },
];
export const TIME_OPTIONS = [
  { id: 30, label: '30 min', hint: 'Treino rápido' },
  { id: 45, label: '45 min', hint: 'Equilibrado' },
  { id: 60, label: '60 min', hint: 'Completo' },
  { id: 90, label: '90 min', hint: 'Mais volume' },
];
// id === valor aceito por generateWorkoutPlan({ focus }); 'balanced' = sem foco (undefined).
export const FOCUS_OPTIONS = [
  { id: 'balanced', label: 'Equilibrado', hint: 'Corpo todo, sem prioridade' },
  { id: 'upper', label: 'Parte superior', hint: 'Peito, ombros, costas e braços' },
  { id: 'lower', label: 'Pernas e glúteos', hint: 'Mais volume na parte de baixo' },
  { id: 'core', label: 'Core', hint: 'Abdômen e estabilidade na série C' },
];
export const SUGGESTION_CHIPS = ['Mais glúteo', 'Treino mais curto', 'Evitar impacto'];

const TIMES = TIME_OPTIONS.map((t) => t.id);

export const EQUIPMENT_LABELS = {
  bodyweight: 'peso do corpo',
  dumbbells: 'halteres',
  barbell: 'barra',
  bench: 'banco',
  cable: 'cabos',
  cardio_machine: 'esteira e bike',
  smith: 'Smith',
  leg_machine: 'cadeiras de perna',
  leg_press: 'Leg Press',
  chest_back_machine: 'Peitoral Dorsal',
  glute_machine: 'Glúteo Máximo',
  shoulder_machine: 'máquina de desenvolvimento',
  lat_pulldown: 'Puxada Alta',
  hip_machine: 'Elevação Pélvica',
};
// Equipamentos mais "exclusivos" primeiro: servem de exemplo na razão "usei X porque o seu combo tem".
const EQUIPMENT_PRIORITY = ['hip_machine', 'glute_machine', 'lat_pulldown', 'shoulder_machine', 'chest_back_machine', 'leg_press', 'smith', 'leg_machine', 'cable', 'barbell', 'dumbbells', 'bench', 'cardio_machine'];

const LIMITATION_NAMES = { knee: 'joelho', shoulder: 'ombro', back: 'lombar' };

const labelOf = (options, id) => options.find((o) => o.id === id)?.label;

// ---------- Perfil ----------

export function getProfileDefaults(user) {
  return {
    weight: user?.weight ? Number(user.weight) : null,
    height: user?.height ? Number(user.height) : null,
    goals: Array.isArray(user?.goals) && user.goals.length > 0 ? [...user.goals] : [],
    level: user?.level || null,
  };
}

export function missingProfileFields(profile) {
  const missing = [];
  if (!(profile?.weight > 0)) missing.push('weight');
  if (!(profile?.height > 0)) missing.push('height');
  if (!Array.isArray(profile?.goals) || profile.goals.length === 0) missing.push('goals');
  if (!profile?.level) missing.push('level');
  return missing;
}

// Chips do resumo de abertura. `field` diz qual campo o chip edita.
export function getProfileChips(profile) {
  return [
    { field: 'weight', label: 'Peso', value: profile?.weight > 0 ? `${profile.weight} kg` : null },
    { field: 'height', label: 'Altura', value: profile?.height > 0 ? `${profile.height} cm` : null },
    {
      field: 'goals',
      label: 'Objetivos',
      value: profile?.goals?.length ? profile.goals.map((g) => labelOf(GOAL_OPTIONS, g) || g).join(', ') : null,
    },
    { field: 'level', label: 'Nível', value: labelOf(LEVEL_OPTIONS, profile?.level) || null },
  ];
}

// "78", "78,5", "78.5" -> número; fora de faixa ou inválido -> null.
export function parseMeasure(text, { min, max }) {
  const n = parseFloat(String(text ?? '').replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export function defaultSettings(profile) {
  return {
    weight: profile?.weight ?? null,
    height: profile?.height ?? null,
    goals: profile?.goals ?? [],
    level: profile?.level ?? null,
    days: 3,
    time: 45,
    combo: null,
    limitation: null,
    focus: 'balanced',
    avoidImpact: false,
    extraGlutes: false,
  };
}

// ---------- Geração ----------

export function findGroupKey(exerciseId) {
  return Object.keys(EXERCISE_DB).find((k) => EXERCISE_DB[k].some((e) => e.id === exerciseId)) || null;
}

function getEquipment(settings) {
  return getComboEquipment(settings.combo);
}

// Exercícios do catálogo que valem para este morador (combo, nível, limitação e impacto).
function eligible(list, settings, recs) {
  let out = filterByEquipment(list, getEquipment(settings));
  out = filterByLevel(out, settings.level);
  out = filterByLimitation(out, settings.limitation);
  out = filterHighImpact(out, settings.avoidImpact || !!recs?.avoidHighImpact);
  return out;
}

function imcCategoryId(settings) {
  const imc = calculateIMC(settings.weight, settings.height);
  return imc ? getIMCCategory(imc).id : undefined;
}

function recsFor(settings, user) {
  return getIMCRecommendations(imcCategoryId(settings), settings.goals, user?.gender, user?.ageGroup);
}

// Troca exercícios do fim da série por glúteos do combo (até `perSerie` por série).
function addGlutes(workouts, settings, recs, perSerie = 2) {
  const glutes = eligible(EXERCISE_DB.glutes || [], settings, recs);
  const gluteIds = new Set((EXERCISE_DB.glutes || []).map((e) => e.id));
  return workouts.map((w) => {
    const exercises = [...w.exercises];
    const present = new Set(exercises.map((e) => e.id));
    const extras = glutes.filter((g) => !present.has(g.id)).slice(0, perSerie);
    for (const extra of extras) {
      let idx = -1;
      for (let i = exercises.length - 1; i >= 0; i--) {
        if (!gluteIds.has(exercises[i].id) && exercises[i].category !== 'Cardio') { idx = i; break; }
      }
      if (idx < 0) break;
      const old = exercises[idx];
      exercises[idx] = { ...extra, sets: old.sets, rest: old.rest };
    }
    return { ...w, exercises };
  });
}

// Gera a série guiada com o gerador local e aplica os ajustes (impacto e glúteos) por cima.
export function generateGuidedPlan(settings, user) {
  const imc = calculateIMC(settings.weight, settings.height);
  const imcInfo = imc ? getIMCCategory(imc) : null;
  const recs = recsFor(settings, user);

  let workouts = generateWorkoutPlan({
    goals: settings.goals,
    level: settings.level,
    days: settings.days,
    time: settings.time,
    equipment: getEquipment(settings),
    focus: settings.focus && settings.focus !== 'balanced' ? settings.focus : undefined,
    limitation: settings.limitation || 'none',
    imcCategory: imcInfo?.id,
    gender: user?.gender,
    ageGroup: user?.ageGroup,
  });

  if (settings.avoidImpact) {
    workouts = workouts.map((w) => ({ ...w, exercises: filterHighImpact(w.exercises, true) }));
  }
  if (settings.extraGlutes) {
    workouts = addGlutes(workouts, settings, recs);
  }

  return {
    // generatedByAI false: o selo "IA" da lista de treinos não aparece para séries do gerador local.
    workouts: workouts.map((w) => ({ ...w, generatedByAI: false })),
    imc: imc ? imc.toFixed(1) : null,
    imcCategoria: imcInfo?.id,
    source: 'local',
  };
}

// 'IA' só com a flag ligada, API configurada, fora do Modo Demo e série vinda da API.
export function getPlanBadge({ source = 'local', aiEnabled = false, apiConfigured = false, isDemo = false } = {}) {
  if (source === 'ai' && aiEnabled && apiConfigured && !isDemo) return 'IA';
  return null;
}

// ---------- Troca de exercício ----------

// Alternativas do MESMO grupo muscular, com equipamento do combo, respeitando nível, limitação e impacto,
// fora o próprio exercício e os que já estão na série. Prefere o mesmo músculo principal.
export function getAlternatives(workouts, serieIndex, exerciseId, settings, user) {
  const serie = workouts?.[serieIndex];
  const current = serie?.exercises?.find((e) => e.id === exerciseId);
  const key = findGroupKey(exerciseId);
  if (!serie || !current || !key) return [];
  const recs = recsFor(settings, user);
  const present = new Set(serie.exercises.map((e) => e.id));
  const pool = eligible(EXERCISE_DB[key], settings, recs).filter((e) => !present.has(e.id));
  const main = current.muscleGroup?.[0];
  const same = pool.filter((e) => e.muscleGroup?.[0] === main);
  return same.length > 0 ? same : pool;
}

// Troca um exercício mantendo séries e descanso do que saiu (já ajustados pelo objetivo e IMC).
export function swapExercise(workouts, serieIndex, exerciseId, newExerciseId, settings, user) {
  const alternatives = getAlternatives(workouts, serieIndex, exerciseId, settings, user);
  const replacement = alternatives.find((e) => e.id === newExerciseId);
  if (!replacement) return workouts;
  return workouts.map((w, i) => {
    if (i !== serieIndex) return w;
    return {
      ...w,
      exercises: w.exercises.map((e) => (e.id === exerciseId ? { ...replacement, sets: e.sets, rest: e.rest } : e)),
    };
  });
}

// ---------- "Quer ajustar algo?" (texto livre, por palavras-chave) ----------

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Devolve { actions, understood }. Ações: more_glutes, shorter, longer, time(value), days(value),
// avoid_impact, focus(value), limitation(value).
export function parseAdjustment(text) {
  const t = normalize(text);
  const actions = [];
  const push = (a) => {
    if (!actions.some((x) => x.type === a.type && x.value === a.value)) actions.push(a);
  };
  if (!t) return { actions, understood: false };

  // A negação precisa vir logo antes da palavra ("menos glúteo"); um "sem impacto" em outro trecho não conta.
  if (/\b(gluteo|gluteos|bumbum|bunda)\b/.test(t) && !/\b(menos|sem|tirar|remover)\s+(\w+\s+)?(gluteo|gluteos|bumbum|bunda)\b/.test(t)) push({ type: 'more_glutes' });

  const minutes = t.match(/(\d{2,3})\s*(min|minutos)\b/);
  if (minutes) {
    const v = Number(minutes[1]);
    const nearest = TIMES.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
    push({ type: 'time', value: nearest });
  } else if (/(mais curto|mais rapido|menos tempo|encurt|reduzir o tempo|diminuir o tempo|treino curto)/.test(t)) {
    push({ type: 'shorter' });
  } else if (/(mais longo|mais tempo|treino maior|mais completo|aumentar o tempo)/.test(t)) {
    push({ type: 'longer' });
  }

  const days = t.match(/\b([123])\s*(dia|dias)\b/);
  if (days) push({ type: 'days', value: Number(days[1]) });

  if (/(impacto|sem pular|sem salto|sem saltar|nao pular|nao saltar|pular corda)/.test(t)) push({ type: 'avoid_impact' });

  if (/\b(perna|pernas|inferior)\b/.test(t)) push({ type: 'focus', value: 'lower' });
  else if (/\b(superior|peito|braco|bracos|costas|dorsal)\b/.test(t) && !/(lombar|dor )/.test(t)) push({ type: 'focus', value: 'upper' });
  else if (/\b(core|abdomen|abdominal|barriga)\b/.test(t)) push({ type: 'focus', value: 'core' });

  // Limitação só com contexto de dor/cuidado (senão "mais ombro" seria lido como lesão).
  if (/(dor|lesao|machuc|evitar|proteger|cuidado|problema|limitacao|sensivel)/.test(t)) {
    if (/joelho/.test(t)) push({ type: 'limitation', value: 'knee' });
    else if (/ombro/.test(t)) push({ type: 'limitation', value: 'shoulder' });
    else if (/(lombar|costas)/.test(t)) {
      // "costas" aqui é dor; remove o foco "upper" que a palavra possa ter gerado.
      const i = actions.findIndex((a) => a.type === 'focus' && a.value === 'upper');
      if (i >= 0) actions.splice(i, 1);
      push({ type: 'limitation', value: 'back' });
    }
  }

  return { actions, understood: actions.length > 0 };
}

// Aplica as ações às configurações. Devolve { settings, changes, changed }.
export function applyAdjustment(settings, actions) {
  const next = { ...settings };
  const changes = [];
  const noop = [];
  for (const a of actions) {
    switch (a.type) {
      case 'more_glutes':
        if (next.extraGlutes) noop.push('Já reforcei os glúteos.');
        else { next.extraGlutes = true; changes.push('reforcei os glúteos'); }
        break;
      case 'avoid_impact':
        if (next.avoidImpact) noop.push('Já evitei exercícios de impacto.');
        else { next.avoidImpact = true; changes.push('tirei exercícios de impacto'); }
        break;
      case 'shorter':
      case 'longer': {
        const i = TIMES.indexOf(next.time);
        const j = a.type === 'shorter' ? i - 1 : i + 1;
        if (i < 0 || j < 0 || j >= TIMES.length) noop.push(a.type === 'shorter' ? `O treino já está no mínimo (${TIMES[0]} min).` : `O treino já está no máximo (${TIMES[TIMES.length - 1]} min).`);
        else { changes.push(`ajustei o tempo de ${next.time} para ${TIMES[j]} min`); next.time = TIMES[j]; }
        break;
      }
      case 'time':
        if (next.time === a.value) noop.push(`O treino já tem ${a.value} min.`);
        else { changes.push(`ajustei o tempo de ${next.time} para ${a.value} min`); next.time = a.value; }
        break;
      case 'days':
        if (next.days === a.value) noop.push(`Já são ${a.value} ${a.value === 1 ? 'dia' : 'dias'} por semana.`);
        else { changes.push(`passei para ${a.value} ${a.value === 1 ? 'dia' : 'dias'} por semana`); next.days = a.value; }
        break;
      case 'focus':
        if (next.focus === a.value) noop.push(`O foco já é "${labelOf(FOCUS_OPTIONS, a.value)}".`);
        else { changes.push(`mudei o foco para ${labelOf(FOCUS_OPTIONS, a.value).toLowerCase()}`); next.focus = a.value; }
        break;
      case 'limitation':
        if (next.limitation === a.value) noop.push(`Já considerei a limitação de ${LIMITATION_NAMES[a.value]}.`);
        else { changes.push(`passei a proteger o ${LIMITATION_NAMES[a.value]}`); next.limitation = a.value; }
        break;
      default:
        break;
    }
  }
  return { settings: next, changes, changed: changes.length > 0, notes: noop };
}

// ---------- "Por que esta série" e etapas do "Montando" ----------

function allExercises(workouts) {
  return workouts.flatMap((w) => w.exercises);
}

// 3 a 4 razões geradas dos dados reais do plano e do morador.
export function buildReasons(settings, plan, user) {
  const workouts = plan.workouts;
  const exercises = allExercises(workouts);
  const recs = recsFor(settings, user);
  const combo = COMBOS.find((c) => c.id === settings.combo);
  const reasons = [];

  // 1) Equipamento do combo
  const eq = getEquipment(settings);
  const bestEq = EQUIPMENT_PRIORITY.find((id) => eq.includes(id) && exercises.some((e) => e.equipment === id));
  if (bestEq) {
    const ex = exercises.find((e) => e.equipment === bestEq);
    reasons.push(`Usei ${ex.name} porque o seu combo ${combo?.label || ''} tem ${EQUIPMENT_LABELS[bestEq]}.`.replace('  ', ' '));
  } else {
    reasons.push(`O combo ${combo?.label || 'escolhido'} tem poucos equipamentos, então priorizei exercícios com o peso do corpo.`);
  }

  // 2) Limitação (com contagem real) ou equilíbrio muscular
  const lim = settings.limitation;
  const blockedIds = lim && lim !== 'none' ? LIMITATION_BLOCKED[lim] || [] : [];
  const universe = filterByLevel(filterByEquipment(Object.values(EXERCISE_DB).flat(), eq), settings.level);
  const blockedCount = universe.filter((e) => blockedIds.includes(e.id)).length;
  if (blockedCount > 0) {
    reasons.push(`Deixei de fora ${blockedCount} ${blockedCount === 1 ? 'exercício que sobrecarrega' : 'exercícios que sobrecarregam'} o seu ${LIMITATION_NAMES[lim]}.`);
  } else {
    const groups = [...new Set(exercises.filter((e) => e.category !== 'Cardio').map((e) => e.category))];
    reasons.push(`Distribuí ${groups.length} grupos musculares (${groups.join(', ').toLowerCase()}) entre as ${workouts.length} ${workouts.length === 1 ? 'série' : 'séries'}.`);
  }

  // 3) Objetivo
  const goals = settings.goals || [];
  const maxSets = Math.max(...exercises.map((e) => e.sets || 0), 0);
  const rests = exercises.map((e) => e.rest || 0).filter(Boolean);
  const avgRest = rests.length ? Math.round(rests.reduce((a, b) => a + b, 0) / rests.length) : 0;
  if (goals.includes('gain_muscle')) {
    reasons.push(`Como você quer ganhar massa, usei até ${maxSets} séries nos exercícios principais e descansos de ${avgRest}s em média.`);
  } else if (goals.includes('lose_weight')) {
    const cardioFirst = workouts.some((w) => w.exercises[0]?.category === 'Cardio');
    reasons.push(`Como você quer emagrecer, ${cardioFirst ? 'comecei com cardio e ' : ''}deixei o descanso curto (${avgRest}s em média).`);
  } else if (goals.length > 0) {
    const names = goals.map((g) => labelOf(GOAL_OPTIONS, g)?.toLowerCase()).filter(Boolean).join(' e ');
    reasons.push(`Pensando em ${names}, mantive volume moderado (até ${maxSets} séries) e descanso de ${avgRest}s em média.`);
  }

  // 4) Impacto, senão tempo e nível
  if (settings.avoidImpact || recs.avoidHighImpact) {
    reasons.push('Não incluí exercícios de impacto (saltos), para poupar as articulações.');
  } else {
    const maxLen = Math.max(...workouts.map((w) => w.exercises.length), 0);
    const level = labelOf(LEVEL_OPTIONS, settings.level)?.toLowerCase();
    reasons.push(`Com ${settings.time} min por sessão, cada série tem até ${maxLen} exercícios${level ? ` para o nível ${level}` : ''}.`);
  }

  return reasons.slice(0, 4);
}

// Etapas do "Montando sua série": cada uma mostra um número calculado de verdade.
export function getPlanSteps(settings, plan, user) {
  const exercises = allExercises(plan.workouts);
  const recs = recsFor(settings, user);
  const combo = COMBOS.find((c) => c.id === settings.combo);
  const poolCount = Object.values(EXERCISE_DB).reduce((n, list) => n + eligible(list, settings, recs).length, 0);
  const groups = new Set(exercises.filter((e) => e.category !== 'Cardio').map((e) => e.category));
  const lim = settings.limitation && settings.limitation !== 'none' ? labelOf(LIMITATION_OPTIONS, settings.limitation) : null;
  const goalNames = (settings.goals || []).map((g) => labelOf(GOAL_OPTIONS, g)).filter(Boolean).join(', ');

  return [
    {
      id: 'profile',
      label: 'Lendo o seu perfil',
      detail: [plan.imc ? `IMC ${plan.imc}` : null, labelOf(LEVEL_OPTIONS, settings.level)].filter(Boolean).join(' · '),
    },
    {
      id: 'equipment',
      label: `Conferindo os equipamentos do combo ${combo?.label || ''}`.trim(),
      detail: `${poolCount} exercícios disponíveis para você`,
    },
    {
      id: 'balance',
      label: 'Equilibrando os grupos musculares',
      detail: `${groups.size} grupos em ${plan.workouts.length} ${plan.workouts.length === 1 ? 'série' : 'séries'}`,
    },
    {
      id: 'goal',
      label: 'Ajustando objetivo e limitações',
      detail: [goalNames, lim ? `cuidado com ${LIMITATION_NAMES[settings.limitation]}` : 'sem limitações'].filter(Boolean).join(' · '),
    },
    {
      id: 'final',
      label: 'Montando as séries',
      detail: `${exercises.length} exercícios no total`,
    },
  ];
}
