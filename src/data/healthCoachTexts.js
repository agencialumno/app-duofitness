// Textos do "coach" de hábitos da Saúde (regras, NÃO é IA). TODO o texto fica aqui, para revisão por um profissional de saúde.
// Regras: só hábitos, tom neutro e sem culpa; cada sugestão tem o MOTIVO (com o número da pessoa) e uma AÇÃO pequena e concreta.
// PROIBIDO: dieta, calorias, déficit, metas de peso ou de gordura, prazos, suplementos, doses, diagnóstico e alerta clínico.
// Um teste (healthcoach.test.ts) varre estes textos e as sugestões geradas em busca desses termos.
// Marcadores {nome} são trocados por números reais da pessoa (ex.: {avg} vira "5h40").

export const COACH_TEXTS = {
  title: 'Sugestões para você',
  intro: 'Ideias pequenas, só sobre hábitos. Você decide o que faz sentido para a sua rotina.',
  insufficient: 'Ainda não há dados suficientes para sugerir algo. Registre água, sono ou treinos por alguns dias e as sugestões aparecem aqui.',
  keepGoing: {
    reason: 'Seus hábitos recentes estão num bom ritmo.',
    action: 'Mantenha a rotina e registre a água, o sono ou o treino de hoje.',
  },

  sleepShort: {
    reason: 'Você dormiu em média {avg} nos últimos 7 dias ({nights} noites registradas).',
    action: 'Esta noite, tente apagar a luz 15 minutos mais cedo que o seu horário de costume.',
  },
  sleepShortTeen: {
    reason: 'Você dormiu em média {avg} nos últimos 7 dias ({nights} noites registradas). Nessa idade, o sono costuma pedir de 8 a 10 horas.',
    action: 'Esta noite, tente deixar o celular longe da cama 30 minutos antes de dormir.',
  },
  sleepIrregular: {
    reason: 'O seu horário de dormir variou cerca de {spread} nos últimos 7 dias.',
    action: 'Escolha um horário para apagar a luz e tente repeti-lo nas próximas 3 noites.',
  },
  hydrationLow: {
    reason: 'Nos últimos 7 dias você registrou em média {avg} de {goal} copos de água por dia.',
    action: 'Deixe uma garrafa de água por perto e beba um copo assim que acordar.',
  },
  stepsLow: {
    reason: 'Sua média foi de {avg} passos por dia nos últimos 7 dias ({days} dias com registro).',
    action: 'Faça uma caminhada de 10 minutos hoje, no horário que for mais fácil.',
  },
  exerciseLow: {
    reason: 'Você registrou cerca de {week} de exercício por semana nos últimos 7 dias.',
    action: 'Reserve 15 minutos hoje para se mexer: uma série curta de treino já conta.',
  },
  trainingLow: {
    reason: 'Você treinou {days} {dayWord} nos últimos 7.',
    action: 'Marque no calendário um treino curto para amanhã.',
  },
  trainingLowMuscle: {
    reason: 'Você treinou {days} {dayWord} nos últimos 7.',
    action: 'Escolha agora quais dias da semana vão ser de treino de força e deixe a série separada.',
  },
  recoveryHeartRate: {
    reason: 'Sua frequência cardíaca em repouso ficou cerca de {delta} bpm acima da semana anterior.',
    action: 'Hoje, escolha um treino mais leve e mantenha o horário de dormir de sempre.',
  },
};

// Todas as frases (modelos e textos soltos), achatadas, para o scanner.
export function allCoachStrings() {
  const out = [];
  for (const v of Object.values(COACH_TEXTS)) {
    if (typeof v === 'string') out.push(v);
    else if (v && typeof v === 'object') out.push(...Object.values(v).filter((x) => typeof x === 'string'));
  }
  return out;
}

export function fill(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : String(vars[k])));
}
