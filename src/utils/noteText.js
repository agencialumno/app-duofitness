// Texto das "notas do personal" (personalNotes) na hora de EXIBIR.
//
// As séries já salvas guardam as notas com o texto da época em @duo_workouts. Frases antigas que foram
// reescritas (sem déficit calórico nem promessa de resultado, ver imc.js) são trocadas AQUI, só na exibição:
// o dado salvo NÃO é alterado e não há migração. A troca é por frase EXATA.
export const LEGACY_NOTES = {
  'Déficit calórico + treino = resultado mais rápido':
    'Treinar com regularidade e dormir bem ajudam mais do que intensidade pontual',
  'Glúteos e pernas têm resposta excelente a volume alto':
    'A série dá atenção extra a glúteos e pernas',
  'Sua recuperação é ótima — aproveite para progredir rápido':
    'Aumente a carga aos poucos, respeitando o descanso entre os treinos',
  'Aquecimento longo é essencial para proteger as articulações':
    'Faça um aquecimento mais longo e vá no seu ritmo',
  'Priorize exercícios compostos para ganho de massa':
    'Priorize exercícios compostos, com boa técnica',
  'Amplitude completa gera mais resultado que carga alta':
    'Amplitude completa e boa técnica valem mais do que carga alta',
};

export function displayNote(note) {
  return typeof note === 'string' && Object.prototype.hasOwnProperty.call(LEGACY_NOTES, note) ? LEGACY_NOTES[note] : note;
}

// Lista nova (não muda a original). Entrada que não é lista vira lista vazia.
export function displayNotes(notes) {
  return Array.isArray(notes) ? notes.map(displayNote) : [];
}
