// Lógica pura do fluxo de conta (sem React): validação do cadastro e destino depois de entrar.
import { checkPassword } from '../utils/passwordPolicy';
import { validateEmail } from './authErrors';

// Campos do cadastro -> { errors: { campo: texto }, canSubmit }. Os erros só aparecem para campos já "tocados".
export function validateSignUp({ name, email, password, confirm, accepted }, touched = {}) {
  const errors = {};
  const pwd = checkPassword(password, { email, name });
  if (!String(name || '').trim()) errors.name = 'Informe o seu nome.';
  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;
  if (!pwd.allOk) errors.password = 'A senha ainda não cumpre todos os requisitos.';
  if (confirm !== password || !confirm) errors.confirm = 'As senhas precisam ser iguais.';
  const canSubmit = !!accepted && Object.keys(errors).length === 0; // a idade é pedida na etapa de idade, depois do primeiro login
  const shown = {};
  for (const k of Object.keys(errors)) if (touched[k]) shown[k] = errors[k];
  return { errors: shown, canSubmit, password: pwd };
}

// "Excluir conta": só habilita o botão final com a confirmação digitada e, para quem entra por e-mail, a senha.
export function canConfirmDelete({ providers = [], password = '', typed = '' }) {
  const needsPassword = providers.includes('password');
  return String(typed).trim().toUpperCase() === 'EXCLUIR' && (!needsPassword || password.length > 0);
}

// ---- verificação de e-mail ----------------------------------------------------------------------------------------

export const RESEND_WAIT_SECONDS = 60;

const hasPassword = (user) => (user?.providers || []).includes('password');
const PROVIDER_NAMES = { 'google.com': 'pelo Google', 'apple.com': 'pela Apple' };

// E-mail privado da Apple ("Ocultar meu e-mail"): o endereço é um relay que repassa as mensagens ao e-mail real.
export function isAppleRelayEmail(email) {
  return /@privaterelay\./i.test(String(email || ''));
}

// Só quem entra por e-mail e senha precisa verificar. Google e Apple já entregam o e-mail confirmado pelo provedor.
export function needsEmailVerification(user) {
  return !!user && hasPassword(user) && !user.emailVerified;
}

/**
 * O que o Perfil mostra sobre o e-mail. `checking` = recarga em andamento, `failed` = a última recarga falhou (rede),
 * `checkedOnce` = já houve uma recarga para este usuário nesta sessão.
 * Nunca mostra "não verificado" antes de ter conferido de verdade: antes disso é "Verificando…", e em erro é
 * "Não foi possível verificar agora". Sempre texto + ícone (nunca só cor).
 * kind: 'verified' | 'checking' | 'unavailable' | 'unverified' | 'provider'
 */
export function verificationView({ user, checking = false, failed = false, checkedOnce = false } = {}) {
  if (!user) return null;
  if (!hasPassword(user)) {
    const name = (user.providers || []).map((p) => PROVIDER_NAMES[p]).find(Boolean) || 'pelo provedor';
    const relay = isAppleRelayEmail(user.email);
    return {
      kind: 'provider',
      icon: 'shield-checkmark-outline',
      tone: 'ok',
      text: `E-mail informado ${name}`,
      note: relay ? 'É um e-mail privado da Apple: a Apple repassa as mensagens para o seu e-mail real. Está tudo certo, não precisa verificar.' : '',
      canAct: false,
    };
  }
  if (user.emailVerified) return { kind: 'verified', icon: 'checkmark-circle', tone: 'ok', text: 'E-mail verificado', note: '', canAct: false };
  if (checking || (!checkedOnce && !failed)) return { kind: 'checking', icon: 'sync-outline', tone: 'neutral', text: 'Verificando…', note: '', canAct: false };
  if (failed) return { kind: 'unavailable', icon: 'cloud-offline-outline', tone: 'warn', text: 'Não foi possível verificar agora', note: 'Confira a conexão e toque em "Já verifiquei" para tentar de novo.', canAct: true };
  return { kind: 'unverified', icon: 'alert-circle-outline', tone: 'warn', text: 'E-mail não verificado', note: '', canAct: true };
}
