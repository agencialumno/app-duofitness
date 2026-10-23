// Provedor padrão: convidado. Usado com a flag desligada, no Modo Demo, e quando não há provedor real na plataforma.
// Nunca faz rede. `reason`: 'disabled' (flag desligada) ou 'unavailable' (flag ligada, mas sem provedor nesta versão).
import { authError } from './authInterface';

export default class NullAuthProvider {
  constructor({ reason = 'disabled' } = {}) {
    this.reason = reason;
    this.capabilities = { email: false, google: false, apple: false };
  }
  _fail() { return Promise.reject(authError('auth/unavailable', 'Conta indisponível')); }
  signUpWithEmail() { return this._fail(); }
  signInWithEmail() { return this._fail(); }
  signInWithGoogle() { return this._fail(); }
  signInWithApple() { return this._fail(); }
  sendPasswordReset() { return Promise.resolve(); }
  sendEmailVerification() { return this._fail(); }
  reloadUser() { return Promise.resolve(null); }
  signOut() { return Promise.resolve(); }
  deleteAccount() { return this._fail(); }
  onAuthStateChanged(cb) { cb(null); return () => {}; }
  getCurrentUser() { return null; }
}
