// Estado da verificação de e-mail, sem React (o AuthContext só assina): usuário atual, "verificando", falha da última
// recarga e para qual usuário já houve uma recarga. É a ÚNICA fonte desse estado; nada é gravado no aparelho.
//
// Por que existe: o Firebase não avisa (onAuthStateChanged) quando o link do e-mail é aberto; o usuário em memória só muda
// numa recarga (reloadUser). Então recarregamos ao entrar na conta, ao abrir/voltar ao foco do Perfil, ao voltar do segundo
// plano e no botão "Já verifiquei", e o resultado entra aqui para todas as telas verem o mesmo valor.
import { needsEmailVerification } from './authFlow';

export function createVerificationController(provider) {
  let state = { user: provider.getCurrentUser(), ready: false, checking: false, failed: false, checkedUid: null };
  const listeners = new Set();
  let inflight = null;
  let off = null;

  const set = (patch) => {
    state = { ...state, ...patch };
    for (const cb of listeners) cb(state);
  };

  // recarrega o usuário; devolve { ok, user }. ok=false: falhou (rede); o estado antigo fica e `failed` liga.
  const refresh = () => {
    if (inflight) return inflight;
    const current = provider.getCurrentUser();
    if (!current) return Promise.resolve({ ok: true, user: null });
    set({ checking: true });
    inflight = (async () => {
      try {
        const fresh = await provider.reloadUser();
        set({ user: fresh, failed: false, checkedUid: fresh ? fresh.uid : null });
        return { ok: true, user: fresh };
      } catch (e) {
        set({ failed: true, checkedUid: current.uid });
        return { ok: false, user: null };
      } finally {
        inflight = null;
        set({ checking: false });
      }
    })();
    return inflight;
  };

  const maybeRefresh = () => (needsEmailVerification(provider.getCurrentUser()) ? refresh() : Promise.resolve({ ok: true, user: state.user }));

  const controller = {
    getState: () => state,
    subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    refresh,
    // volta do segundo plano (AppState "active"): só recarrega quem ainda precisa verificar
    onAppActive: maybeRefresh,
    start() {
      off = provider.onAuthStateChanged((u) => {
        const prev = state.user;
        set({ user: u, ready: true });
        // entrou na conta (ou trocou de usuário) ainda sem verificar: confere já, para não mostrar "não verificado" sem checar
        if (u && (!prev || prev.uid !== u.uid) && needsEmailVerification(u)) refresh();
      });
    },
    stop() { if (off) off(); off = null; listeners.clear(); },
  };
  return controller;
}
