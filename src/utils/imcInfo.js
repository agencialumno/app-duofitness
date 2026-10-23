// Conteúdo do "i" do IMC: passo a passo com os valores reais da pessoa, escala de faixas e sugestões de hábitos.
// Módulo puro (sem React Native). Só LÊ e reutiliza calculateIMC e getIMCCategory de imc.js (a regra de cálculo
// não é duplicada nem alterada).
import { calculateIMC, getIMCCategory } from './imc';
import { IMC_BAND_ADVICE, IMC_TEXT } from '../data/infoContent';

// Faixas da escala (ids e cores vêm de getIMCCategory, amostras dentro de cada faixa)
const BANDS = [
  { sample: 17, range: 'Abaixo de 18,5' },
  { sample: 22, range: '18,5 a 24,9' },
  { sample: 27, range: '25,0 a 29,9' },
  { sample: 32, range: '30,0 a 34,9' },
  { sample: 40, range: '35,0 ou mais' },
];
export const SCALE_MIN = 15;
export const SCALE_MAX = 40;

const num = (v) => {
  const x = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
  return Number.isFinite(x) && x > 0 ? x : null;
};

// 78 -> "78", 78.5 -> "78,5"
export function fmt(value, maxDecimals = 4, minDecimals = 0) {
  const r = Math.round(value * 10 ** maxDecimals) / 10 ** maxDecimals;
  let s = r.toFixed(maxDecimals).replace(/0+$/, '').replace(/\.$/, '');
  const dec = (s.split('.')[1] || '').length;
  if (dec < minDecimals) s = r.toFixed(minDecimals);
  return s.replace('.', ',');
}

export function isMinor(ageGroup) {
  return ageGroup === 'under18';
}

// Menor de 18 anos: o app não mostra a categoria de adulto (rótulo, dica, cor/ícone de faixa).
export function showImcCategory(ageGroup) {
  return !isMinor(ageGroup);
}

// { kind: 'missing'|'adult'|'minor', value, steps, category, scale, ... }
export function describeImc({ weight, height, ageGroup } = {}) {
  const w = num(weight);
  const hCm = num(height);
  const imc = w && hCm ? calculateIMC(w, hCm) : null;
  if (imc === null) return { kind: 'missing' };

  const hM = Math.round((hCm / 100) * 1e6) / 1e6;
  const hSq = Math.round(hM * hM * 1e6) / 1e6;
  const shown = imc.toFixed(1).replace('.', ',');
  const steps = [
    { titulo: 'Peso', conta: `${fmt(w, 2)} kg` },
    { titulo: 'Altura em metros', conta: `${fmt(hCm, 2)} cm ÷ 100 = ${fmt(hM, 4, 2)} m` },
    { titulo: 'Altura ao quadrado', conta: `${fmt(hM, 4, 2)} × ${fmt(hM, 4, 2)} = ${fmt(hSq, 6, 2)}` },
    { titulo: 'Divisão', conta: `${fmt(w, 2)} ÷ ${fmt(hSq, 6, 2)} = ${fmt(imc, 4)}` },
    { titulo: 'Resultado, com 1 casa decimal', conta: shown },
  ];

  const base = { value: imc, shown, steps };
  if (isMinor(ageGroup)) return { kind: 'minor', ...base };

  const category = getIMCCategory(imc);
  const scale = BANDS.map((b) => {
    const c = getIMCCategory(b.sample);
    return { id: c.id, label: c.label, range: b.range, color: c.color, here: c.id === category.id };
  });
  // O app classifica pelo valor exato; se o valor arredondado cair em outra faixa, explica.
  const roundedCategory = getIMCCategory(Number(imc.toFixed(1)));
  const note = roundedCategory.id !== category.id
    ? `O cálculo usa o valor exato (${fmt(imc, 3)}), que fica na faixa "${category.label}".`
    : null;
  const position = Math.min(Math.max((imc - SCALE_MIN) / (SCALE_MAX - SCALE_MIN), 0), 1);
  return { kind: 'adult', ...base, category, scale, position, note };
}

// Sugestões de hábitos da faixa (só hábitos). Menor de 18 e sem dados: nenhuma.
export function suggestionsFor(info) {
  if (!info || info.kind !== 'adult') return [];
  const advice = IMC_BAND_ADVICE[info.category.id];
  if (advice === 'manter') return [IMC_TEXT.manter];
  return [...IMC_TEXT.habitos, IMC_TEXT.profissional];
}

// Blocos que o InfoSheet renderiza (ver InfoSheet.js).
export function buildImcSheet({ weight, height, ageGroup } = {}) {
  const info = describeImc({ weight, height, ageGroup });
  const blocks = [
    { type: 'heading', text: 'O que é o IMC' },
    { type: 'text', text: IMC_TEXT.oQueE },
    { type: 'heading', text: 'Como foi calculado para você' },
  ];

  if (info.kind === 'missing') {
    blocks.push({ type: 'text', text: IMC_TEXT.semDados });
  } else {
    blocks.push({ type: 'steps', items: info.steps });
    if (info.kind === 'adult') {
      if (info.note) blocks.push({ type: 'text', text: info.note });
      blocks.push({ type: 'heading', text: 'Onde você está na escala' });
      blocks.push({ type: 'scale', bands: info.scale, position: info.position, value: info.shown });
    } else {
      blocks.push({ type: 'heading', text: 'Sobre o IMC na sua idade' });
      blocks.push({ type: 'text', text: IMC_TEXT.menor });
    }
  }

  blocks.push({ type: 'heading', text: 'O que o IMC não mostra' });
  blocks.push({ type: 'list', items: IMC_TEXT.naoMostra });

  const sug = suggestionsFor(info);
  if (sug.length > 0) {
    blocks.push({ type: 'heading', text: 'Sugestões de hábitos' });
    blocks.push({ type: 'list', items: sug });
  }
  blocks.push({ type: 'notice', text: IMC_TEXT.aviso });
  return { titulo: 'Sobre o IMC', blocks, kind: info.kind };
}
