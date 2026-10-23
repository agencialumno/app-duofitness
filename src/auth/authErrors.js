// Mensagens de erro de conta em português. Regras:
//  - nunca revelam se um e-mail existe (entrar e cadastrar usam textos que servem nos dois casos);
//  - o conflito de provedor (mesmo e-mail por outro método) tem texto próprio e orienta o caminho;
//  - cancelar o login do Google/Apple não é erro (mensagem vazia).
// `context`: 'signIn' | 'signUp' | 'social' | 'reset' | 'verify' | 'delete' | 'general'

export const GENERIC = 'Algo deu errado. Tente de novo em instantes.';

const BY_CODE = {
  'auth/invalid-email': 'Confira o e-mail digitado.',
  'auth/network-request-failed': 'Sem conexão com a internet. Confira a rede e tente de novo.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  'auth/user-disabled': 'Não foi possível entrar com esta conta. Fale com o suporte.',
  'auth/weak-password': 'Escolha uma senha mais forte, seguindo os requisitos da lista.',
  'auth/account-exists-with-different-credential':
    'Já existe uma conta com este e-mail, criada por outro método de entrada. Entre pelo método que você usou antes (e-mail e senha, Google ou Apple).',
  'auth/requires-recent-login': 'Por segurança, confirme a sua identidade e tente de novo.',
  'auth/unavailable': 'Conta indisponível nesta versão do app. Você pode continuar sem conta.',
  'auth/no-current-user': 'Você não está com a sessão iniciada.',
};

// Credenciais erradas, e-mail desconhecido ou senha errada: o MESMO texto, para não revelar quem tem conta.
const CREDENTIAL_CODES = new Set(['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials']);
const CANCEL_CODES = new Set(['auth/cancelled-popup-request', 'auth/popup-closed-by-user', 'auth/user-cancelled', 'auth/cancelled', 'ERR_REQUEST_CANCELED', 'SIGN_IN_CANCELLED', '12501']);

export function isCancel(error) {
  return CANCEL_CODES.has(String(error?.code ?? ''));
}

export function authErrorMessage(error, context = 'general') {
  const code = String(error?.code ?? '');
  if (isCancel(error)) return '';
  if (CREDENTIAL_CODES.has(code)) {
    if (context === 'delete') return 'Senha incorreta. Confira e tente de novo.';
    return 'E-mail ou senha incorretos.';
  }
  if (code === 'auth/email-already-in-use') {
    // não confirma que o e-mail existe
    return 'Não foi possível criar a conta com esses dados. Se você já tem conta, entre ou recupere a senha.';
  }
  return BY_CODE[code] || GENERIC;
}

// Resposta única da recuperação de senha, exista ou não a conta.
export const RESET_SENT = 'Se existir uma conta com este e-mail, enviamos as instruções para criar uma nova senha. Confira também a caixa de spam.';

// Erros que significam "tente depois" (entram no intervalo entre tentativas).
export function isThrottle(error) {
  return String(error?.code ?? '') === 'auth/too-many-requests';
}

export function validateEmail(email) {
  const e = String(email || '').trim();
  if (!e) return 'Informe o seu e-mail.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(e)) return 'Confira o e-mail digitado.';
  return '';
}
