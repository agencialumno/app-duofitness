// Política de senha do cadastro (puro, sem dependências). O servidor (Firebase) impõe comprimento e
// complexidade; "sem espaços" e "não conter e-mail ou nome" ficam só no app (decisão da conta).
//
// checkPassword(senha, { email, name }) devolve { rules, allOk, score, strength, common }.
// `rules` é a checklist (mesma ordem na tela); `score` vai de 0 a 100 (força, só informativa).

export const MIN_LENGTH = 10;

// Lista pequena de senhas comuns (já normalizadas: minúsculas, sem acento). Só penaliza a força.
export const COMMON_PASSWORDS = [
  'password', 'senha', 'senha123', 'senhasenha', 'qwerty', 'qwertyuiop', 'abc123', 'abcd1234', 'admin', 'letmein',
  'welcome', 'iloveyou', 'monkey', 'dragon', 'master', 'login', 'passw0rd', 'trustno1', 'football', 'futebol',
  'flamengo', 'corinthians', 'palmeiras', 'brasil', 'brasil123', 'mudar123', 'mudar@123', 'academia',
  'musculacao', 'duofitness', 'duo123', '123456', '1234567', '12345678', '123456789', '1234567890', '0123456789',
  '111111', '000000', 'abcdef', 'asdfgh', 'zxcvbn', 'amorzinho', 'meuamor', 'deusefiel', 'teamo', 'gabriel',
];

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's', '!': 'i' };

// minúsculas, sem acento (NFD sem marcas combinantes)
export function fold(text) {
  return String(text || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

const codePoints = (s) => Array.from(String(s || ''));

function personalParts(email, name) {
  const parts = [];
  const local = fold(String(email || '').split('@')[0]).replace(/[^\p{L}\p{N}]/gu, '');
  if (local.length >= 3) parts.push(local);
  for (const token of fold(name).split(/[^\p{L}\p{N}]+/u)) if (token.length >= 3) parts.push(token);
  return parts;
}

export function containsPersonal(password, { email, name } = {}) {
  const f = fold(password).replace(/[^\p{L}\p{N}]/gu, '');
  const raw = fold(password);
  return personalParts(email, name).some((p) => f.includes(p) || raw.includes(p));
}

export function isCommonPassword(password) {
  const f = fold(password);
  const leet = Array.from(f).map((c) => LEET[c] ?? c).join('');
  return COMMON_PASSWORDS.some((c) => f === c || leet === c || (c.length >= 6 && (f.includes(c) || leet.includes(c))));
}

export function checkPassword(password, { email, name } = {}) {
  const pwd = String(password ?? '');
  const chars = codePoints(pwd);
  const has = (re) => re.test(pwd);
  const rules = [
    { id: 'length', label: `Pelo menos ${MIN_LENGTH} caracteres`, ok: chars.length >= MIN_LENGTH },
    { id: 'upper', label: 'Uma letra maiúscula', ok: has(/\p{Lu}/u) },
    { id: 'lower', label: 'Uma letra minúscula', ok: has(/\p{Ll}/u) },
    { id: 'number', label: 'Um número', ok: has(/\p{Nd}/u) },
    { id: 'symbol', label: 'Um símbolo (por exemplo ! ? # @)', ok: has(/[^\p{L}\p{N}\s]/u) },
    { id: 'spaces', label: 'Sem espaços', ok: pwd.length > 0 && !has(/\s/u) },
    { id: 'personal', label: 'Sem o seu e-mail nem o seu nome', ok: pwd.length > 0 && !containsPersonal(pwd, { email, name }) },
  ];
  const allOk = rules.every((r) => r.ok);
  const common = pwd.length > 0 && isCommonPassword(pwd);

  // Força (0 a 100): comprimento + variedade de classes, com penalidades.
  let score = 0;
  if (pwd.length > 0) {
    score += Math.min(chars.length, 20) * 3; // até 60
    const classes = [/\p{Lu}/u, /\p{Ll}/u, /\p{Nd}/u, /[^\p{L}\p{N}\s]/u].filter((re) => re.test(pwd)).length;
    score += classes * 10; // até 40
    if (chars.length < MIN_LENGTH) score = Math.min(score, 20 + chars.length * 2); // curta demais não passa de "Fraca"/"Razoável"
    if (common) score = Math.min(score, 15);
    else if (new Set(chars).size <= Math.ceil(chars.length / 3)) score -= 25; // muita repetição
    if (!rules[6].ok) score = Math.min(score, 35);
    if (!rules[5].ok) score = Math.min(score, 50);
  }
  score = Math.max(0, Math.min(100, Math.round(score)));
  return { rules, allOk, score, strength: strengthOf(score, pwd.length === 0), common };
}

// { level: 0..4, label } para a barra de força.
export function strengthOf(score, empty = false) {
  if (empty) return { level: 0, label: '' };
  if (score < 35) return { level: 1, label: 'Fraca' };
  if (score < 60) return { level: 2, label: 'Razoável' };
  if (score < 85) return { level: 3, label: 'Boa' };
  return { level: 4, label: 'Forte' };
}

export const metCount = (rules) => rules.filter((r) => r.ok).length;
