// Opções e parsers de palavras-chave compartilhados entre o chat do Personal Trainer
// (AIPersonalTrainerScreen) e a série guiada (GuidedPlanScreen). Módulo puro, sem React Native.
import { COMBOS } from '../data/combosEquipment';

export const GOAL_OPTIONS = [
  { id: 'lose_weight', label: 'Emagrecer', keywords: ['emagre', 'perder peso', 'queimar', 'secar'] },
  { id: 'gain_muscle', label: 'Ganhar massa', keywords: ['massa', 'hipertro', 'muscul', 'força', 'forca'] },
  { id: 'maintain', label: 'Condicionamento', keywords: ['condic', 'resistê', 'resist', 'fôlego', 'folego'] },
  { id: 'health', label: 'Saúde geral', keywords: ['saúde', 'saude', 'bem-estar', 'bem estar', 'qualidade de vida'] },
];

export const LEVEL_OPTIONS = [
  { id: 'beginner', label: 'Iniciante', keywords: ['inici', 'começando', 'comecando', 'novo no treino', 'nunca treinei'] },
  { id: 'intermediate', label: 'Intermediário', keywords: ['intermed'] },
  { id: 'advanced', label: 'Avançado', keywords: ['avan'] },
];

export const LIMITATION_OPTIONS = [
  { id: 'none', label: 'Nenhuma', keywords: ['nenhuma', 'não tenho', 'nao tenho', 'sem limita', 'sem lesão', 'sem lesao'] },
  { id: 'knee', label: 'Joelho', keywords: ['joelho'] },
  { id: 'shoulder', label: 'Ombro', keywords: ['ombro'] },
  { id: 'back', label: 'Lombar/Costas', keywords: ['lombar', 'costas'] },
];

export const COMBO_OPTIONS = COMBOS.map((c) => ({ id: c.id, label: c.label, keywords: [c.id, c.label.toLowerCase()] }));

export function matchMulti(text, options) {
  const t = text.toLowerCase();
  return options.filter((o) => o.keywords.some((k) => t.includes(k))).map((o) => o.id);
}

export function matchSingle(text, options) {
  return matchMulti(text, options)[0];
}

export function extractNumbers(text) {
  const found = text.match(/\d+(?:[.,]\d+)?/g);
  return found ? found.map((n) => parseFloat(n.replace(',', '.'))) : [];
}
