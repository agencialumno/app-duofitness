// Provedor de conta com React Native Firebase (iOS e Android). Só é criado por loadNativeProvider.js quando os módulos
// nativos estão no build (FIREBASE_ENABLED=true no workflow) e a configuração do Firebase existe.
// Todos os módulos entram por injeção (testes usam falsos): authApi (API modular do @react-native-firebase/auth),
// googleSignin, appleAuth (expo-apple-authentication), crypto (expo-crypto) e os.
import { authError } from './authInterface';

const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

export default class FirebaseAuthProvider {
  constructor({ authApi, googleSignin, appleAuth, crypto, os }) {
    this.api = authApi;
    this.google = googleSignin;
    this.apple = appleAuth;
    this.crypto = crypto;
    this.os = os;
    this.auth = authApi.getAuth();
    // e-mails de verificação e de nova senha em português
    try { this.auth.languageCode = 'pt-BR'; } catch { /* ignora */ }
    this.capabilities = { email: true, google: !!googleSignin, apple: os === 'ios' && !!appleAuth && !!crypto };
    this._googleConfigured = false;
  }

  _pub(u) {
    if (!u) return null;
    return {
      uid: u.uid,
      email: u.email || null,
      displayName: u.displayName || null,
      emailVerified: !!u.emailVerified,
      providers: (u.providerData || []).map((p) => p.providerId).filter((id) => id && id !== 'firebase'),
    };
  }

  _need() {
    const u = this.auth.currentUser;
    if (!u) throw authError('auth/no-current-user');
    return u;
  }

  async signUpWithEmail({ email, password, name }) {
    const cred = await this.api.createUserWithEmailAndPassword(this.auth, String(email).trim(), password);
    if (name) {
      try { await this.api.updateProfile(cred.user, { displayName: String(name).trim() }); } catch { /* o nome é opcional */ }
    }
    return this._pub(this.auth.currentUser || cred.user);
  }

  async signInWithEmail({ email, password }) {
    const cred = await this.api.signInWithEmailAndPassword(this.auth, String(email).trim(), password);
    return this._pub(cred.user);
  }

  async _googleCredential() {
    if (!this.google) throw authError('auth/unavailable');
    if (!this._googleConfigured) {
      this.google.GoogleSignin.configure({ webClientId: 'autoDetect' }); // lido do arquivo de configuração do Firebase
      this._googleConfigured = true;
    }
    await this.google.GoogleSignin.hasPlayServices?.({ showPlayServicesUpdateDialog: true });
    const res = await this.google.GoogleSignin.signIn();
    if (res?.type === 'cancelled') throw authError('auth/user-cancelled');
    const idToken = res?.data?.idToken ?? res?.idToken;
    if (!idToken) throw authError('auth/unavailable');
    return this.api.GoogleAuthProvider.credential(idToken);
  }

  async signInWithGoogle() {
    const credential = await this._googleCredential();
    const cred = await this.api.signInWithCredential(this.auth, credential);
    return this._pub(cred.user);
  }

  // Apple: nonce aleatório. A Apple recebe o HASH (SHA-256); o Firebase valida com o valor bruto.
  async _appleRequest() {
    if (!this.capabilities.apple) throw authError('auth/unavailable');
    const raw = hex(await this.crypto.getRandomBytesAsync(16));
    const hashed = await this.crypto.digestStringAsync(this.crypto.CryptoDigestAlgorithm.SHA256, raw);
    const result = await this.apple.signInAsync({
      requestedScopes: [this.apple.AppleAuthenticationScope.FULL_NAME, this.apple.AppleAuthenticationScope.EMAIL],
      nonce: hashed,
    });
    if (!result?.identityToken) throw authError('auth/unavailable');
    return { credential: this.api.AppleAuthProvider.credential(result.identityToken, raw), result };
  }

  async signInWithApple() {
    const { credential, result } = await this._appleRequest();
    const cred = await this.api.signInWithCredential(this.auth, credential);
    // o nome só vem na PRIMEIRA vez: grava na hora
    const fn = result.fullName;
    const name = fn ? [fn.givenName, fn.familyName].filter(Boolean).join(' ') : '';
    if (name && !cred.user.displayName) {
      try { await this.api.updateProfile(cred.user, { displayName: name }); } catch { /* opcional */ }
    }
    return this._pub(this.auth.currentUser || cred.user);
  }

  async sendPasswordReset(email) {
    try {
      await this.api.sendPasswordResetEmail(this.auth, String(email).trim());
    } catch (e) {
      // e-mail inexistente não pode ser revelado: a tela mostra sempre a mesma resposta
      if (e?.code === 'auth/user-not-found') return;
      throw e;
    }
  }

  async sendEmailVerification() {
    await this.api.sendEmailVerification(this._need());
  }

  async reloadUser() {
    const u = this.auth.currentUser;
    if (!u) return null;
    await this.api.reload(u);
    return this._pub(this.auth.currentUser);
  }

  async signOut() {
    await this.api.signOut(this.auth);
    try { await this.google?.GoogleSignin?.signOut?.(); } catch { /* sem sessão do Google */ }
  }

  // Reautentica (exigência do Firebase para excluir) e apaga. Com Apple, revoga o token antes (exigência da Apple).
  async deleteAccount({ password } = {}) {
    const user = this._need();
    const providers = (user.providerData || []).map((p) => p.providerId);
    let appleCode = null;
    if (providers.includes('password')) {
      await this.api.reauthenticateWithCredential(user, this.api.EmailAuthProvider.credential(user.email, password || ''));
    } else if (providers.includes('google.com')) {
      await this.api.reauthenticateWithCredential(user, await this._googleCredential());
    } else if (providers.includes('apple.com')) {
      const { credential, result } = await this._appleRequest();
      await this.api.reauthenticateWithCredential(user, credential);
      appleCode = result.authorizationCode || null;
    }
    if (providers.includes('apple.com') && appleCode) {
      await this.api.revokeAccessToken(this.auth, appleCode);
    }
    await this.api.deleteUser(user);
    try { await this.google?.GoogleSignin?.signOut?.(); } catch { /* sem sessão do Google */ }
  }

  onAuthStateChanged(cb) {
    return this.api.onAuthStateChanged(this.auth, (u) => cb(this._pub(u)));
  }

  getCurrentUser() {
    return this._pub(this.auth.currentUser);
  }
}
