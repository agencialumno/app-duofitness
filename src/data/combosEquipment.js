// Equipamentos disponíveis por combo Duo Fitness — extraído das apresentações
// oficiais (uno.pptx, duo.pptx, triple.pptx, prime.pptx, elite.pptx).
// Cada "bucket" é usado pelo gerador de treino (workoutGenerator.js) para
// decidir quais exercícios entram no plano — quanto maior o combo, mais
// buckets ficam disponíveis e mais variado o treino gerado fica.
//
// Futuro: quando o app buscar o combo automaticamente pelo nome do
// condomínio, essa função getComboEquipment continua sendo o ponto único
// de conversão combo -> equipamentos, só muda de onde o comboId vem.

export const COMBOS = [
  {
    id: 'uno',
    label: 'UNO',
    description: 'Esteira, bike, estação multifuncional, banco e pesos livres',
    equipment: ['bodyweight', 'dumbbells', 'barbell', 'bench', 'cable', 'cardio_machine'],
  },
  {
    id: 'duo',
    label: 'DUO',
    description: 'UNO + Cross com Smith e cadeiras de perna',
    equipment: ['bodyweight', 'dumbbells', 'barbell', 'bench', 'cable', 'cardio_machine', 'smith', 'leg_machine'],
  },
  {
    id: 'triple',
    label: 'TRIPLE',
    description: 'DUO + Leg Press, Peitoral Dorsal e Pulley com Remada',
    equipment: ['bodyweight', 'dumbbells', 'barbell', 'bench', 'cable', 'cardio_machine', 'smith', 'leg_machine', 'leg_press', 'chest_back_machine'],
  },
  {
    id: 'prime',
    label: 'PRIME',
    description: 'TRIPLE + Cross Angular e Glúteo Máximo',
    equipment: ['bodyweight', 'dumbbells', 'barbell', 'bench', 'cable', 'cardio_machine', 'smith', 'leg_machine', 'leg_press', 'chest_back_machine', 'glute_machine'],
  },
  {
    id: 'elite',
    label: 'ELITE',
    description: 'PRIME + Desenvolvimento, Puxada Alta/Supino e Elevação Pélvica — linha completa',
    equipment: ['bodyweight', 'dumbbells', 'barbell', 'bench', 'cable', 'cardio_machine', 'smith', 'leg_machine', 'leg_press', 'chest_back_machine', 'glute_machine', 'shoulder_machine', 'lat_pulldown', 'hip_machine'],
  },
];

export function getComboEquipment(comboId) {
  const combo = COMBOS.find(c => c.id === comboId);
  return combo ? combo.equipment : ['bodyweight'];
}