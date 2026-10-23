// Lógica pura do fluxo de conta (sem React): validação do cadastro e destino depois de entrar.
import { checkPassword } from '../utils/passwordPolicy';
import { validateEmail } from './authErrors';

// Campos do cadastro -> { errors: { campo: texto }, canSubmit }. Os erros só aparecem para campos já "tocados".
export function validateSignUp({ name, email, password, confirm, isAdult, accepted }, touched = {}) {
  const errors = {};
  const pwd = checkPassword(password, { email, name });
  if (!String(name || '').trim()) errors.name = 'Informe o seu nome.';
  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;
  if (!pwd.allOk) errors.password = 'A senha ainda não cumpre todos os requisitos.';
  if (confirm !== password || !confirm) errors.confirm = 'As senhas precisam ser iguais.';
  const canSubmit = !!isAdult && !!accepted && Object.keys(errors).length === 0;
  const shown = {};
  for (const k of Object.keys(errors)) if (touched[k]) shown[k] = errors[k];
  return { errors: shown, canSubmit, password: pwd };
}

// Depois de entrar ou criar conta: quem já tem perfil real vai para o app; quem não tem segue o cadastro do perfil.
export function destinationAfterAuth({ hasRealProfile }) {
  return hasRealProfile ? 'Main' : 'ProfileSetup';
}

// "Excluir conta": só habilita o botão final com a confirmação digitada e, para quem entra por e-mail, a senha.
export function canConfirmDelete({ providers = [], password = '', typed = '' }) {
  const needsPassword = providers.includes('password');
  return String(typed).trim().toUpperCase() === 'EXCLUIR' && (!needsPassword || password.length > 0);
}
