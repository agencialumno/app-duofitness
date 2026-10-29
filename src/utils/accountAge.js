// Etapa de idade (logo depois do primeiro login de uma conta nova, para TODOS os métodos de entrada).
// Puro: sem React e sem armazenamento. A idade fica só no aparelho (@duo_age, entra no snapshot da conta); nunca vai a servidor.
import { ADULT_AGE, MAX_AGE, MIN_ACCOUNT_AGE } from '../config/account';

// Faixas que o app já usa no perfil (onboarding, edição e tudo que depende de `under18`).
export function ageGroupFor(age) {
  if (age < ADULT_AGE) return 'under18';
  if (age <= 25) return '18-25';
  if (age <= 35) return '26-35';
  if (age <= 45) return '36-45';
  return '46+';
}

// "15" -> 15. Vazio, letras, negativo, decimal, 0 e acima de MAX_AGE (120+) viram null.
export function parseAge(text) {
  const t = String(text ?? '').trim();
  if (!/^\d{1,3}$/.test(t)) return null;
  const n = parseInt(t, 10);
  return n >= 1 && n <= MAX_AGE ? n : null;
}

// status: 'invalid' | 'blocked' (abaixo da idade mínima) | 'guardian' (da mínima até 17) | 'ok' (18 ou mais)
export function evaluateAge(text, minAge = MIN_ACCOUNT_AGE) {
  const age = parseAge(text);
  if (age === null) return { status: 'invalid', message: `Informe a sua idade em anos (um número de 1 a ${MAX_AGE}).` };
  if (age < minAge) {
    return { status: 'blocked', age, message: `O Duo Fitness é para pessoas a partir de ${minAge} anos, então não conseguimos criar a sua conta agora. Obrigado pela compreensão.` };
  }
  return { status: age < ADULT_AGE ? 'guardian' : 'ok', age, ageGroup: ageGroupFor(age) };
}

// Só avança com idade válida (e, para menores, a confirmação do responsável marcada).
export function canContinueAge(result, guardianChecked) {
  if (!result) return false;
  if (result.status === 'ok') return true;
  if (result.status === 'guardian') return !!guardianChecked;
  return false;
}

// O que é guardado no aparelho.
export function buildAgeInfo(result, guardianChecked) {
  if (!canContinueAge(result, guardianChecked)) return null;
  return { age: result.age, ageGroup: result.ageGroup, guardianConfirmed: result.status === 'guardian' };
}

// Validação ao LER do armazenamento (valor corrompido ou adulterado vira ausente, e a etapa de idade aparece de novo).
export function sanitizeAgeInfo(v, minAge = MIN_ACCOUNT_AGE) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const { age, ageGroup, guardianConfirmed } = v;
  if (!Number.isInteger(age) || age < minAge || age > MAX_AGE) return undefined;
  if (ageGroup !== ageGroupFor(age)) return undefined;
  if (age < ADULT_AGE && guardianConfirmed !== true) return undefined;
  return { age, ageGroup, guardianConfirmed: guardianConfirmed === true };
}
