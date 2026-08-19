// Dados fictícios usados no "Modo Demo" — carregados instantaneamente
// para demonstrações em feiras/eventos, sem precisar preencher o onboarding
// nem depender de internet.

export const DEMO_USER = {
  name: 'Rafael Souza',
  goals: ['gain_muscle', 'health'],
  gender: 'male',
  ageGroup: '26-35',
  weight: 76,
  height: 179,
  imc: '23.7',
  imcCategory: 'normal',
  level: 'intermediate',
  joinedAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
};

function ex(id, name, muscleGroup, difficulty, equipment, sets, reps, rest, category, instructions, tips, isTime) {
  return {
    id, name, muscleGroup, difficulty, equipment, sets, reps, rest, category,
    instructions, tips,
    ...(isTime ? { isTime: true } : {}),
  };
}

export const DEMO_WORKOUTS = [
  {
    id: 'demo_serie_a',
    serie: 'A',
    name: 'Série A — Peito, Ombros e Tríceps',
    category: 'Peito',
    focus: 'Peito e Ombros',
    generatedByAI: true,
    createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
    personalNotes: [
      'Progrida a carga a cada 2 semanas',
      'Priorize exercícios compostos para ganho de massa',
    ],
    exercises: [
      ex('db_press', 'Supino com Halteres', ['Peitoral', 'Tríceps'], 'Intermediário', 'dumbbells', 4, '8–12', 90, 'Peito',
        ['Deite no banco com um haltere em cada mão', 'Empurre os halteres para cima até quase se tocarem', 'Desça controlado até o peito'],
        'Não trave os cotovelos no topo do movimento.'),
      ex('db_fly', 'Crucifixo com Halteres', ['Peitoral', 'Deltóide'], 'Intermediário', 'dumbbells', 3, '10–12', 60, 'Peito',
        ['Deite com halteres acima do peito, cotovelos levemente flexionados', 'Abra os braços em arco até sentir alongamento no peito', 'Volte controlando o movimento'],
        'Mantenha uma leve flexão nos cotovelos o tempo todo.'),
      ex('shoulder_press', 'Desenvolvimento com Halteres', ['Deltóide', 'Tríceps'], 'Intermediário', 'dumbbells', 4, '10–12', 90, 'Ombros',
        ['Sente com halteres na altura dos ombros', 'Empurre para cima até estender os braços', 'Desça controlado'],
        'Evite arquear demais a lombar.'),
      ex('lateral_raise', 'Elevação Lateral', ['Deltóide lateral'], 'Iniciante', 'dumbbells', 3, '12–15', 45, 'Ombros',
        ['Em pé, halteres ao lado do corpo', 'Eleve os braços até a altura dos ombros', 'Desça controlado'],
        'Cotovelos levemente flexionados, sem usar embalo.'),
      ex('tricep_dip', 'Tríceps no Banco', ['Tríceps'], 'Iniciante', 'bench', 3, '10–15', 45, 'Braços',
        ['Apoie as mãos no banco atrás do corpo', 'Desça flexionando os cotovelos', 'Empurre de volta para cima'],
        'Mantenha os cotovelos apontando para trás, não para os lados.'),
      ex('plank', 'Prancha Isométrica', ['Core', 'Abdômen'], 'Iniciante', 'bodyweight', 3, '30–45s', 45, 'Core',
        ['Apoie antebraços e pontas dos pés no chão', 'Mantenha o corpo alinhado, sem elevar o quadril', 'Segure a posição contraindo o abdômen'],
        'Não deixe o quadril cair — core sempre contraído.', true),
    ],
  },
  {
    id: 'demo_serie_b',
    serie: 'B',
    name: 'Série B — Costas e Bíceps',
    category: 'Costas',
    focus: 'Costas e Bíceps',
    generatedByAI: true,
    createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
    personalNotes: [
      'Progrida a carga a cada 2 semanas',
      'Foque na conexão mente-músculo na fase excêntrica',
    ],
    exercises: [
      ex('row_db', 'Remada Unilateral', ['Grande dorsal', 'Rombóide', 'Bíceps'], 'Iniciante', 'dumbbells', 3, '10–12 cada', 60, 'Costas',
        ['Apoie um joelho e mão no banco', 'Puxe o haltere em direção ao quadril', 'Desça controlado'],
        'Puxe com o cotovelo, não com o braço.'),
      ex('pullover', 'Pullover com Haltere', ['Grande dorsal', 'Serrátil'], 'Intermediário', 'dumbbells', 3, '12', 60, 'Costas',
        ['Deite perpendicular ao banco, apenas os ombros apoiados', 'Leve o haltere para trás da cabeça', 'Traga de volta contraindo as costas'],
        'Mantenha os braços levemente flexionados.'),
      ex('reverse_fly', 'Voador Invertido', ['Rombóide', 'Trapézio médio'], 'Iniciante', 'dumbbells', 3, '12–15', 45, 'Costas',
        ['Incline o tronco à frente, halteres pendendo', 'Abra os braços elevando até a linha do ombro', 'Desça controlado'],
        'Aperte as escápulas no topo do movimento.'),
      ex('bicep_curl', 'Rosca Bíceps', ['Bíceps'], 'Iniciante', 'dumbbells', 3, '12', 45, 'Braços',
        ['Em pé, halteres ao lado do corpo, palmas para frente', 'Flexione os cotovelos elevando os halteres', 'Desça controlado'],
        'Evite balançar o tronco para ajudar o movimento.'),
      ex('hammer_curl', 'Rosca Martelo', ['Bíceps', 'Braquial'], 'Iniciante', 'dumbbells', 3, '12', 45, 'Braços',
        ['Halteres com pegada neutra (palmas de frente uma para outra)', 'Flexione os cotovelos', 'Desça controlado'],
        'Cotovelos fixos ao lado do corpo.'),
      ex('russian_twist', 'Giro Russo', ['Oblíquos'], 'Iniciante', 'bodyweight', 3, '20 total', 30, 'Core',
        ['Sente com os joelhos flexionados, tronco levemente reclinado', 'Gire o tronco de um lado para o outro', 'Mantenha o core contraído'],
        'Quanto mais lento, mais intenso.'),
    ],
  },
  {
    id: 'demo_serie_c',
    serie: 'C',
    name: 'Série C — Pernas e Core',
    category: 'Pernas',
    focus: 'Pernas e Core',
    generatedByAI: true,
    createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
    personalNotes: [
      'Progrida a carga a cada 2 semanas',
      'Amplitude completa gera mais resultado que carga alta',
    ],
    exercises: [
      ex('squat', 'Agachamento Livre', ['Quadríceps', 'Glúteos', 'Isquiotibiais'], 'Iniciante', 'bodyweight', 4, '12–15', 90, 'Pernas',
        ['Pés na largura dos ombros', 'Desça como se fosse sentar em uma cadeira', 'Suba empurrando os calcanhares contra o chão'],
        'Joelhos alinhados com os pés, sem cair para dentro.'),
      ex('rdl', 'Levantamento Terra Romeno', ['Isquiotibiais', 'Glúteos', 'Lombar'], 'Intermediário', 'dumbbells', 3, '10–12', 90, 'Pernas',
        ['Halteres à frente das coxas, leve flexão nos joelhos', 'Desça o tronco levando o quadril para trás', 'Suba contraindo glúteos e isquiotibiais'],
        'Costas retas o tempo todo, sem arredondar.'),
      ex('goblet_squat', 'Agachamento Goblet', ['Quadríceps', 'Glúteos', 'Core'], 'Intermediário', 'dumbbells', 3, '12', 75, 'Pernas',
        ['Segure um haltere junto ao peito', 'Agache mantendo o tronco ereto', 'Suba controlado'],
        'Cotovelos passam por dentro dos joelhos na descida.'),
      ex('lunge', 'Avanço', ['Quadríceps', 'Glúteos'], 'Iniciante', 'bodyweight', 3, '10 cada', 60, 'Pernas',
        ['Dê um passo à frente', 'Flexione os dois joelhos até 90°', 'Volte à posição inicial'],
        'Joelho da frente não deve ultrapassar a ponta do pé.'),
      ex('calf_raise', 'Elevação de Panturrilha', ['Panturrilha'], 'Iniciante', 'bodyweight', 3, '20', 30, 'Pernas',
        ['Em pé, eleve os calcanhares o máximo possível', 'Segure um instante no topo', 'Desça controlado'],
        'Amplitude completa, sem pressa.'),
      ex('leg_raise', 'Elevação de Pernas', ['Abdômen inferior'], 'Intermediário', 'bodyweight', 3, '12–15', 45, 'Core',
        ['Deitado, pernas estendidas', 'Eleve as pernas até 90°', 'Desça sem tocar o chão totalmente'],
        'Lombar sempre apoiada no chão.'),
    ],
  },
];

// Gera 9 sessões concluídas nos últimos ~12 dias, alternando entre as 3 séries.
function buildDemoSessions() {
  const workoutIds = ['demo_serie_a', 'demo_serie_b', 'demo_serie_c'];
  const daysAgo = [12, 10, 9, 7, 6, 4, 3, 2, 1];
  return daysAgo.map((d, i) => ({
    id: `demo_session_${i}`,
    workoutId: workoutIds[i % workoutIds.length],
    completedAt: new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString(),
    xpEarned: 50,
  }));
}

export const DEMO_SESSIONS = buildDemoSessions();

// 9 sessões × 50 XP = 450 — de propósito deixado logo abaixo do marco de 500 XP,
// assim se o vendedor concluir mais 1 treino ao vivo na demo, a conquista
// "500 XP acumulado" desbloqueia na hora, na frente do cliente.
export const DEMO_XP = 450;
export const DEMO_STREAK = 8;

export const DEMO_ACHIEVEMENTS = [
  { id: 'first_workout', title: 'Primeira série!', icon: '🏆', unlockedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'streak_3', title: '3 dias seguidos', icon: '⚡', unlockedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'week_warrior', title: 'Guerreiro da semana', icon: '🔥', unlockedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'streak_7', title: 'Semana perfeita', icon: '🌟', unlockedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
];