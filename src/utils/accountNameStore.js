// Nome da conta no aparelho (chave @duo_account_name, entra no snapshot por conta). O armazenamento entra por parâmetro (testável).
// Nada aqui imprime o nome.
import { resolveAccountName, sanitizeStoredName } from './accountName';

export const ACCOUNT_NAME_KEY = '@duo_account_name';

export async function readAccountName(storage) {
  try { return sanitizeStoredName(await storage.getItem(ACCOUNT_NAME_KEY)) || ''; } catch { return ''; }
}

// Chamado quando uma conta fica ativa (DEPOIS do bindAccount, que restaura ou limpa as chaves). Se ainda não há nome guardado,
// grava o do cadastro desta sessão ou o displayName da conta. Devolve o nome em uso ('' = desconhecido: o onboarding pergunta uma vez).
export async function adoptAccountName(storage, { displayName, pending } = {}) {
  const stored = await readAccountName(storage);
  if (stored) return stored;
  const name = resolveAccountName({ pending, displayName });
  if (!name) return '';
  try { await storage.setItem(ACCOUNT_NAME_KEY, name); } catch { /* segue: o nome ainda vale nesta sessão */ }
  return name;
}
