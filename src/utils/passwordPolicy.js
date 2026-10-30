// Política de senha do cadastro (puro, sem dependências). O servidor (Firebase) impõe comprimento e
// complexidade; "sem espaços" e "não conter e-mail ou nome" ficam só no app (decisão da conta).
//
// checkPassword(senha, { email, name }) devolve { rules, allOk, score, strength, common }.
// `rules` é a checklist (mesma ordem na tela); `score` vai de 0 a 100 (força, só informativa).

export const MIN_LENGTH = 10;
export const COMMON_MAX_LEVEL = 2; // 'Razoável'

// Lista pequena de senhas comuns (já normalizadas: minúsculas, sem acento). Só limita o NÍVEL de força exibido (no máximo "Razoável"); não bloqueia o cadastro.
export const COMMON_PASSWORDS = [
  'password', 'senha', 'senha123', 'senhasenha', 'qwerty', 'qwertyuiop', 'abc123', 'abcd1234', 'admin', 'letmein',
  'welcome', 'iloveyou', 'monkey', 'dragon', 'master', 'login', 'passw0rd', 'trustno1', 'football', 'futebol',
  'flamengo', 'corinthians', 'palmeiras', 'brasil', 'brasil123', 'mudar123', 'mudar@123', 'academia',
  'musculacao', 'duofitness', 'duo123', '123456', '1234567', '12345678', '123456789', '1234567890', '0123456789',
  '111111', '000000', 'abcdef', 'asdfgh', 'zxcvbn', 'amorzinho', 'meuamor', 'deusefiel', 'teamo', 'gabriel',
  'qwerty123', 'password1', 'password123', 'senha1234', 'senha@123', 'abc12345', '123123', '123321', '654321', '1q2w3e4r', 'q1w2e3r4', 'iloveyou1',
  'minhasenha', 'senha12345', 'academia123', 'treino123', 'abcd@1234', 'meusegredo', 'saude123', 'mudar@123456', 'admin123', 'user123',
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

// Tira número(s), símbolo(s) e espaços do FINAL ("senha2026!" -> "senha"): variação óbvia de uma senha comum.
const stripTail = (text) => text.replace(/[\p{N}\p{P}\p{S}\s]+$/u, '');

export function isCommonPassword(password) {
  const f = fold(password);
  const leet = Array.from(f).map((c) => LEET[c] ?? c).join('');
  const bases = [f, leet, stripTail(f), stripTail(leet)].filter((b) => b.length > 0);
  return COMMON_PASSWORDS.some((c) => bases.includes(c) || (c.length >= 6 && (f.includes(c) || leet.includes(c))));
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
  // Senha comum (ou variação óbvia dela) nunca passa de "Razoável", mesmo cumprindo todos os requisitos. Só limita o nível exibido:
  // a senha continua aceita se atender ao mínimo.
  let strength = strengthFromRules(rules, pwd.length === 0);
  if (common && strength.level > COMMON_MAX_LEVEL) strength = { level: COMMON_MAX_LEVEL, label: 'Razoável' };
  return { rules, allOk, score, strength, common };
}

// NÍVEL EXPLÍCITO pela checklist (os mesmos 7 requisitos obrigatórios que a senha precisa cumprir para ser aceita):
//   0 a 2 atendidos = Fraca (1) | 3 a 5 = Razoável (2) | 6 = Boa (3) | todos (7) = Muito forte (4, barra cheia).
// O nível máximo existe SÓ com todos os requisitos atendidos, então "allOk" e "Muito forte" sempre andam juntos.
export function strengthFromRules(rules, empty = false) {
  if (empty) return { level: 0, label: '' };
  const total = rules.length;
  const met = rules.filter((r) => r.ok).length;
  if (met === total) return { level: 4, label: 'Muito forte' };
  if (met === total - 1) return { level: 3, label: 'Boa' };
  if (met >= 3) return { level: 2, label: 'Razoável' };
  return { level: 1, label: 'Fraca' };
}

// Pontuação informativa antiga (0 a 100) -> { level, label }. Não decide mais o nível mostrado na tela.
export function strengthOf(score, empty = false) {
  if (empty) return { level: 0, label: '' };
  if (score < 35) return { level: 1, label: 'Fraca' };
  if (score < 60) return { level: 2, label: 'Razoável' };
  if (score < 85) return { level: 3, label: 'Boa' };
  return { level: 4, label: 'Forte' };
}

export const metCount = (rules) => rules.filter((r) => r.ok).length;
