// Provedor em memória, para testes (Vitest) e para o smoke da web (só com ?duoFakeAuth=1, ver createAuthProvider).
// Imita os códigos de erro do Firebase, sem rede e sem nenhuma credencial.
import { authError } from './authInterface';

const norm = (e) => String(e || '').trim().toLowerCase();

export default class FakeAuthProvider {
  constructor({ google = true, apple = true } = {}) {
    this.capabilities = { email: true, google, apple };
    this.users = new Map(); // email -> { uid, email, password, displayName, emailVerified, providers }
    this.current = null; // email do usuário logado
    this.listeners = new Set();
    this.failures = []; // códigos injetados para as próximas chamadas
    this.calls = []; // nomes das chamadas (sem dados) para os testes
    this.sentVerification = 0;
    this.sentReset = [];
    this.revokedApple = false;
    this.nextSocialEmail = {};
    this._n = 0;
  }

  // ---- ganchos de teste ----
  failNext(code) { this.failures.push(code); }
  markVerified(email) { const u = this.users.get(norm(email)); if (u) u.emailVerified = true; }
  _maybeFail(name) {
    this.calls.push(name);
    if (this.failures.length) throw authError(this.failures.shift());
  }
  _publish(user) {
    this.current = user ? user.email : null;
    const pub = this.getCurrentUser();
    for (const cb of this.listeners) cb(pub);
    return pub;
  }
  _pub(u) {
    return { uid: u.uid, email: u.email, displayName: u.displayName || null, emailVerified: !!u.emailVerified, providers: [...u.providers] };
  }
  _create(email, extra) {
    this._n += 1;
    const u = { uid: `fake-${this._n}`, email, password: null, displayName: null, emailVerified: false, providers: [], ...extra };
    this.users.set(email, u);
    return u;
  }

  // ---- interface ----
  async signUpWithEmail({ email, password, name } = {}) {
    this._maybeFail('signUpWithEmail');
    const e = norm(email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw authError('auth/invalid-email');
    if (String(password || '').length < 6) throw authError('auth/weak-password');
    if (this.users.has(e)) throw authError('auth/email-already-in-use');
    const u = this._create(e, { password, displayName: name || null, providers: ['password'] });
    return this._publish(u);
  }

  async signInWithEmail({ email, password } = {}) {
    this._maybeFail('signInWithEmail');
    const u = this.users.get(norm(email));
    if (!u || u.password == null || u.password !== password) throw authError('auth/invalid-credential');
    return this._publish(u);
  }

  async _social(provider, email, name) {
    const existing = this.users.get(email);
    if (existing && !existing.providers.includes(provider)) {
      // mesmo e-mail já existe por outro método: conflito (o app orienta a entrar pelo método original)
      throw authError('auth/account-exists-with-different-credential');
    }
    const u = existing || this._create(email, { displayName: name, emailVerified: true, providers: [provider] });
    return this._publish(u);
  }
  async signInWithGoogle() {
    this._maybeFail('signInWithGoogle');
    return this._social('google.com', this.nextSocialEmail.google || 'pessoa.google@exemplo.com', 'Pessoa Google');
  }
  async signInWithApple() {
    this._maybeFail('signInWithApple');
    return this._social('apple.com', this.nextSocialEmail.apple || 'pessoa.apple@privaterelay.exemplo.com', 'Pessoa Apple');
  }

  async sendPasswordReset(email) {
    this._maybeFail('sendPasswordReset');
    this.sentReset.push(norm(email)); // existente ou não: a resposta é sempre a mesma
  }

  async sendEmailVerification() {
    this._maybeFail('sendEmailVerification');
    if (!this.current) throw authError('auth/no-current-user');
    this.sentVerification += 1;
  }

  async reloadUser() {
    this._maybeFail('reloadUser');
    if (!this.current) return null;
    return this._publish(this.users.get(this.current));
  }

  async signOut() {
    this._maybeFail('signOut');
    this._publish(null);
  }

  async deleteAccount({ password } = {}) {
    this._maybeFail('deleteAccount');
    const u = this.current && this.users.get(this.current);
    if (!u) throw authError('auth/no-current-user');
    if (u.providers.includes('password') && u.password !== password) throw authError('auth/wrong-password');
    if (u.providers.includes('apple.com')) this.revokedApple = true;
    this.users.delete(u.email);
    this._publish(null);
  }

  onAuthStateChanged(cb) {
    this.listeners.add(cb);
    cb(this.getCurrentUser());
    return () => this.listeners.delete(cb);
  }

  getCurrentUser() {
    const u = this.current && this.users.get(this.current);
    return u ? this._pub(u) : null;
  }
}
