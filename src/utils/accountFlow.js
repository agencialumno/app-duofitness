// Orquestração da conta (pura: o provedor e o armazenamento entram por parâmetro, então dá para testar com o provedor falso).
// O AppContext só liga estas funções ao estado do React.
import { deleteAccountLocalData, snapshotAndClear } from './accountSnapshot';

// Portão do app: 'loading' | 'auth' (sem conta) | 'age' (etapa de idade) | 'onboarding' (perfil) | 'main'.
// `bound` é o vínculo da conta com os dados do aparelho: { uid, status: 'binding' | 'ready' | 'signingout' }.
export function decideGate({ authReady, bound, authUid, ageInfo, user }) {
  if (!authReady || !bound || bound.status !== 'ready' || bound.uid !== authUid) return 'loading';
  if (!authUid) return 'auth';
  if (!ageInfo) return 'age';
  if (!user) return 'onboarding';
  return 'main';
}

// "Sair da conta": snapshot das @duo_* desta conta, limpa as ativas e só então sai (a ordem importa: nunca sair antes de salvar).
export async function signOutFlow({ storage, provider, uid }) {
  if (uid) await snapshotAndClear(storage, uid);
  await provider.signOut();
}

// "Excluir minha conta": o provedor reautentica (e revoga o token da Apple) e apaga a conta online; depois apaga o snapshot do uid e
// os dados ativos. Se o provedor falhar, nada local é apagado.
export async function deleteAccountFlow({ storage, provider, uid, password }) {
  await provider.deleteAccount({ password });
  try { await deleteAccountLocalData(storage, uid); } catch { /* a conta online já foi excluída */ }
}

// Etapa de idade recusou a pessoa (abaixo da idade mínima): exclui a conta recém-criada SEM reautenticar; se não der, apenas sai da
// conta. Nada da pessoa é guardado. Devolve 'deleted' ou 'signed-out'.
export async function rejectUnderageFlow({ storage, provider, uid }) {
  let result = 'deleted';
  try {
    await provider.deleteAccount({ recent: true });
  } catch {
    result = 'signed-out';
    try { await provider.signOut(); } catch { /* segue */ }
  }
  try { await deleteAccountLocalData(storage, uid); } catch { /* segue */ }
  return result;
}
