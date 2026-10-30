// Nome da pessoa (puro, sem React nem armazenamento). O nome da conta vem do cadastro por e-mail ("Nome completo") ou do displayName
// do Google/Apple e é guardado SÓ no aparelho (@duo_account_name, entra no snapshot por conta). Nunca é impresso em log nem enviado
// a lugar nenhum além do que o Firebase Authentication já guarda para a conta.

export const MAX_NAME_LENGTH = 60;
export const MIN_NAME_LENGTH = 2; // o onboarding já exigia mais de 1 caractere

const codePoints = (s) => Array.from(s);

// Tira espaços das pontas, junta espaços repetidos e remove caracteres de controle. Não é um nome válido se vazio.
export function cleanName(raw) {
  if (typeof raw !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  const t = raw.replace(/[\u0000-\u001F\u007F-\u009F​-‍﻿]/g, ' ').replace(/\s+/g, ' ').trim();
  return codePoints(t).slice(0, MAX_NAME_LENGTH).join('').trim();
}

export function isUsableName(raw) {
  return codePoints(cleanName(raw)).length >= MIN_NAME_LENGTH;
}

// Cadastro: só não pode estar vazio nem só espaços, com o limite de tamanho. Sobrenome NÃO é exigido (a dica só orienta).
export function validateFullName(raw) {
  const text = typeof raw === 'string' ? raw : '';
  if (!text.trim()) return 'Informe o seu nome completo.';
  if (codePoints(text.trim()).length > MAX_NAME_LENGTH) return `Use até ${MAX_NAME_LENGTH} caracteres no nome.`;
  return '';
}

export const NAME_HINT = 'Nome e sobrenome';

// Primeiro nome utilizável entre: o guardado no aparelho, o digitado no cadastro nesta sessão e o displayName da conta.
export function resolveAccountName({ stored, pending, displayName } = {}) {
  for (const c of [stored, pending, displayName]) {
    if (isUsableName(c)) return cleanName(c);
  }
  return '';
}

// Valor que o armazenamento aceita ao ler (corrompido vira ausente).
export function sanitizeStoredName(v) {
  return isUsableName(v) ? cleanName(v) : undefined;
}
