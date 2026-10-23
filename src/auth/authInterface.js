// Contrato do provedor de conta. As telas só falam com esta interface (via AuthContext), nunca com o Firebase.
//
// Usuário: { uid, email, displayName, emailVerified, providers: ['password' | 'google.com' | 'apple.com'] }
// Todos os métodos assíncronos rejeitam com Error cujo `code` segue o padrão "auth/..." (ver authErrors.js).
//
//   capabilities: { email, google, apple }          o que este provedor sabe fazer
//   signUpWithEmail({ email, password, name })      -> usuário (já logado)
//   signInWithEmail({ email, password })            -> usuário
//   signInWithGoogle()                              -> usuário
//   signInWithApple()                               -> usuário (só iOS; o app não oferece em outras plataformas)
//   sendPasswordReset(email)                        -> void (nunca revela se o e-mail existe)
//   sendEmailVerification()                         -> void
//   reloadUser()                                    -> usuário atualizado (ou null)
//   signOut()                                       -> void
//   deleteAccount({ password })                     -> void (reautentica antes; `password` só para quem entra por e-mail)
//   onAuthStateChanged(callback)                    -> função que cancela a inscrição; chama já com o estado atual
//   getCurrentUser()                                -> usuário ou null
export const AUTH_METHODS = [
  'signUpWithEmail', 'signInWithEmail', 'signInWithGoogle', 'signInWithApple', 'sendPasswordReset',
  'sendEmailVerification', 'reloadUser', 'signOut', 'deleteAccount', 'onAuthStateChanged', 'getCurrentUser',
];

export function assertAuthProvider(provider) {
  const missing = AUTH_METHODS.filter((m) => typeof provider?.[m] !== 'function');
  if (missing.length) throw new Error(`AuthProvider incompleto: falta ${missing.join(', ')}`);
  if (!provider.capabilities || typeof provider.capabilities !== 'object') throw new Error('AuthProvider sem capabilities');
  return provider;
}

export function authError(code, message) {
  const e = new Error(message || code);
  e.code = code;
  return e;
}
