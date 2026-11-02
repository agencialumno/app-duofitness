import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';
import { FAMILY, getExerciseIcon } from '../data/exerciseIcons';

// Ícone do exercício (mapa em src/data/exerciseIcons.js; id desconhecido usa o ícone de reserva). DECORATIVO para leitor de tela: o nome do exercício
// já está ao lado, então o ícone não é lido nem focado. A cor padrão é a do tema.
export default function ExerciseIcon({ exerciseId, size = 20, color = COLORS.primary }) {
  const icon = getExerciseIcon(exerciseId);
  const Icon = icon.family === FAMILY.MCI ? MaterialCommunityIcons : Ionicons;
  return (
    <Icon
      name={icon.name}
      size={size}
      color={color}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
