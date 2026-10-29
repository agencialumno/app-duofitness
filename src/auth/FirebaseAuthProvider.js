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

  // Código bruto no console para diagnóstico: SÓ o código (nunca token, e-mail nem mensagem do erro). Cancelar não registra nada.
  _logGoogle(stage, code) {
    if (code) console.error(`[Google Sign-In] ${stage}: ${code}`);
  }

  // Erros do google-signin (statusCodes) -> códigos "auth/..." que o authErrors.js traduz. Erros que já são "auth/..." passam.
  _googleError(e) {
    const code = String(e?.code ?? '');
    if (code.startsWith('auth/')) return e;
    const sc = this.google?.statusCodes || {};
    const is = (name, fallback) => code === String(sc[name] ?? fallback);
    if (is('SIGN_IN_CANCELLED', 'SIGN_IN_CANCELLED') || code === '12501' || code === '-5') return authError('auth/user-cancelled');
    this._logGoogle('google-signin', code || 'sem código');
    if (is('IN_PROGRESS', 'IN_PROGRESS')) return authError('auth/google-in-progress');
    if (is('PLAY_SERVICES_NOT_AVAILABLE', 'PLAY_SERVICES_NOT_AVAILABLE')) return authError('auth/google-play-services');
    return authError('auth/google-failed');
  }

  async _googleCredential() {
    if (!this.google) throw authError('auth/unavailable');
    try {
      if (!this._googleConfigured) {
        // Os IDs de cliente (Web e iOS) vêm do arquivo de configuração do Firebase (GoogleService-Info.plist / google-services.json):
        // nada é lido de variável de ambiente. O plist precisa ter CLIENT_ID e REVERSED_CLIENT_ID (firebase-prepare confere).
        this.google.GoogleSignin.configure({ webClientId: 'autoDetect' });
        this._googleConfigured = true;
      }
      await this.google.GoogleSignin.hasPlayServices?.({ showPlayServicesUpdateDialog: true });
      const res = await this.google.GoogleSignin.signIn();
      if (res?.type === 'cancelled') throw authError('auth/user-cancelled');
      const idToken = res?.data?.idToken ?? res?.idToken;
      if (!idToken) { this._logGoogle('id-token', 'ausente'); throw authError('auth/google-no-id-token'); }
      return this.api.GoogleAuthProvider.credential(idToken);
    } catch (e) {
      throw this._googleError(e);
    }
  }

  async signInWithGoogle() {
    const credential = await this._googleCredential();
    try {
      const cred = await this.api.signInWithCredential(this.auth, credential);
      return this._pub(cred.user);
    } catch (e) {
      this._logGoogle('firebase', String(e?.code ?? 'sem código'));
      throw e;
    }
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
    const cur = this.auth.currentUser;
    // O token carrega email_verified (regras do Firestore/Storage leem request.auth.token.email_verified) e só renova de
    // hora em hora: quando o e-mail passa a verificado, força um token novo.
    if (cur && cur.emailVerified) {
      try {
        if (typeof this.api.getIdToken === 'function') await this.api.getIdToken(cur, true);
        else await cur.getIdToken?.(true);
      } catch { /* sem rede agora: o estado do usuário já está certo; o token renova sozinho depois */ }
    }
    return this._pub(cur);
  }

  async signOut() {
    await this.api.signOut(this.auth);
    try { await this.google?.GoogleSignin?.signOut?.(); } catch { /* sem sessão do Google */ }
  }

  // Reautentica (exigência do Firebase para excluir) e apaga. Com Apple, revoga o token antes (exigência da Apple).
  // `recent: true` = conta recém-criada (etapa de idade recusou a pessoa): apaga direto, sem reautenticar (o Firebase aceita nos
  // primeiros minutos). Se falhar, quem chamou apenas sai da conta.
  async deleteAccount({ password, recent = false } = {}) {
    const user = this._need();
    const providers = (user.providerData || []).map((p) => p.providerId);
    let appleCode = null;
    if (recent) {
      // sem reautenticar
    } else if (providers.includes('password')) {
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
