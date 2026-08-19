export function calculateIMC(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm === 0) return null;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function getIMCCategory(imc) {
  if (imc < 18.5) return {
    id: 'underweight',
    label: 'Abaixo do peso',
    color: '#60a5fa',
    icon: 'arrow-down-circle-outline',
    tip: 'Foco em ganho de massa e força',
    cardioRatio: 0.1,
    strengthRatio: 0.9,
  };
  if (imc < 25.0) return {
    id: 'normal',
    label: 'Peso normal',
    color: '#22c55e',
    icon: 'checkmark-circle-outline',
    tip: 'Ótimo ponto de partida para qualquer objetivo',
    cardioRatio: 0.3,
    strengthRatio: 0.7,
  };
  if (imc < 30.0) return {
    id: 'overweight',
    label: 'Sobrepeso',
    color: '#f97316',
    icon: 'alert-circle-outline',
    tip: 'Combinação de cardio e musculação será ideal',
    cardioRatio: 0.5,
    strengthRatio: 0.5,
  };
  if (imc < 35.0) return {
    id: 'obese1',
    label: 'Obesidade grau I',
    color: '#ef4444',
    icon: 'warning-outline',
    tip: 'Exercícios de baixo impacto e cardio moderado',
    cardioRatio: 0.6,
    strengthRatio: 0.4,
  };
  return {
    id: 'obese2',
    label: 'Obesidade grau II+',
    color: '#dc2626',
    icon: 'warning-outline',
    tip: 'Consulte um médico antes de iniciar. Exercícios leves.',
    cardioRatio: 0.7,
    strengthRatio: 0.3,
  };
}

function normalizeGoals(goalsOrGoal) {
  if (Array.isArray(goalsOrGoal)) return goalsOrGoal;
  if (typeof goalsOrGoal === 'string' && goalsOrGoal) return [goalsOrGoal];
  return [];
}

export function getIMCRecommendations(imcCategory, goalsOrGoal, gender, ageGroup) {
  const goalList = normalizeGoals(goalsOrGoal);
  const recs = {
    weeklyFrequency: 3,
    sessionIntensity: 'moderada',
    restBetweenSets: 60,
    setsMultiplier: 1,
    cardioFirst: false,
    avoidHighImpact: false,
    focusCompound: true,
    notes: [],
  };

  if (imcCategory === 'underweight') {
    recs.restBetweenSets = 90;
    recs.setsMultiplier = 1.2;
    recs.notes.push('Priorize exercícios compostos para ganho de massa');
    recs.notes.push('Descanse bem entre as sessões');
  } else if (imcCategory === 'overweight') {
    recs.cardioFirst = true;
    recs.restBetweenSets = 45;
    recs.notes.push('Inicie cada sessão com 10min de cardio leve');
    recs.notes.push('Prefira circuitos com menos descanso');
  } else if (imcCategory === 'obese1' || imcCategory === 'obese2') {
    recs.avoidHighImpact = true;
    recs.restBetweenSets = 90;
    recs.sessionIntensity = 'leve';
    recs.setsMultiplier = 0.8;
    recs.notes.push('Evite exercícios de alto impacto nas articulações');
    recs.notes.push('Foque em movimentos controlados e amplitude segura');
  }

  if (goalList.includes('lose_weight')) {
    recs.restBetweenSets = Math.min(recs.restBetweenSets, 45);
    recs.cardioFirst = true;
    recs.notes.push('Déficit calórico + treino = resultado mais rápido');
  }
  if (goalList.includes('gain_muscle')) {
    recs.restBetweenSets = Math.max(recs.restBetweenSets, 90);
    recs.setsMultiplier = Math.max(recs.setsMultiplier, 1.2);
    recs.notes.push('Progrida a carga a cada 2 semanas');
  }
  if (goalList.includes('maintain')) {
    recs.notes.push('Consistência semanal é mais importante que intensidade aqui');
  }
  if (goalList.includes('health')) {
    recs.notes.push('Priorize a técnica correta antes de progredir a carga');
  }

  if (gender === 'female') {
    recs.notes.push('Glúteos e pernas têm resposta excelente a volume alto');
  }

  if (ageGroup === 'under18') {
    recs.setsMultiplier = Math.min(recs.setsMultiplier, 0.9);
    recs.avoidHighImpact = true;
    recs.notes.push('Priorize técnica e cargas leves — supervisão de um adulto responsável é recomendada');
  } else if (ageGroup === '46+') {
    recs.restBetweenSets = Math.max(recs.restBetweenSets, 90);
    recs.sessionIntensity = recs.sessionIntensity === 'leve' ? 'leve' : 'moderada';
    recs.notes.push('Aquecimento longo é essencial para proteger as articulações');
    recs.avoidHighImpact = true;
  } else if (ageGroup === '18-25') {
    recs.setsMultiplier = Math.min(recs.setsMultiplier * 1.1, 1.3);
    recs.notes.push('Sua recuperação é ótima — aproveite para progredir rápido');
  }

  return recs;
}