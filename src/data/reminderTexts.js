// Textos dos lembretes. Neutros e gentis, em português, SEM dado de saúde, peso, aparência, nome da pessoa nem tom de cobrança (aparecem na tela de bloqueio).
// Valem para todas as idades (menores de 18 recebem os mesmos). Escolha determinística (ver reminders.js). Um teste varre estes textos atrás de termos proibidos.
export const REMINDER_TITLE = 'Duo Fitness';

// Lembrete de treino (dia de treino escolhido)
export const TRAINING_TEXTS = [
  'Hoje é dia de treino. Sua série está pronta quando você quiser.',
  'Que tal um treino hoje? Dá para começar com calma.',
  'Seu treino de hoje está esperando por você.',
  'Um treino de cada vez: sua série está no app quando quiser.',
  'Hora de se movimentar um pouco? Sua série está aí.',
];

// Inatividade (3º, 7º e 14º dia desde o último acesso)
export const INACTIVITY_TEXTS = [
  'Sua série continua aqui, quando você quiser voltar.',
  'Sem pressa: seu treino está disponível no app.',
  'Quando der, a academia do condomínio está à sua espera.',
  'Voltar aos poucos também vale. Sua série está pronta.',
];

// Explicação mostrada ANTES do pedido do sistema (depois de gerar a primeira série)
export const OFFER_TITLE = 'Quer receber lembretes?';
export const OFFER_MESSAGE = 'Posso avisar nos seus dias de treino e, se você ficar alguns dias sem abrir o app, mandar um lembrete gentil. No máximo um aviso por dia, nunca à noite, e tudo fica só no seu aparelho.';
