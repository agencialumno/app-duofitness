// Sincronização do HealthKit (puro: o provedor e os dados entram por parâmetro). Só leitura; nada sai do aparelho; sem log.
//  - só roda com a conexão "apple_saude" e categorias consentidas, e nunca para menores de 18 (quem chama já filtra, e aqui se confere de novo);
//  - cada categoria é substituída SÓ se a leitura dela deu certo (falhar numa categoria mantém o que já havia);
//  - leitura vazia NÃO apaga nada e NÃO é erro: pode ser "sem dados" ou permissão negada (o iOS não diz); vira "Sem dados ainda";
//  - devolve só CONTAGENS por categoria (nunca valores de saúde).
import { CATEGORIES } from './healthModel';
import { mergeImported } from './healthStore';

export const MIN_AUTO_SYNC_MS = 30000; // sincronizações automáticas (abrir a tela) com no mínimo 30 s de intervalo; o puxar para atualizar ignora

const metricsOf = (categoryId) => (CATEGORIES.find((c) => c.id === categoryId) || { metrics: [] }).metrics;

export function canSync({ connection, provider, minor }) {
  return !minor && !!connection && connection.provider === 'apple_saude' && !!provider && provider.source === 'healthkit' && typeof provider.readDetailed === 'function'
    && Object.keys(connection.categories || {}).length > 0;
}

// Devolve { health, connection, report, changed }. Nunca lança: erro inesperado vira { skipped: 'erro' } e nada muda.
export async function syncHealthKit({ provider, health, connection, minor = false, now = new Date() }) {
  if (!canSync({ connection, provider, minor })) return { health, connection, report: {}, changed: false, skipped: 'indisponivel' };
  const categories = Object.keys(connection.categories).filter((id) => connection.categories[id]);
  let res;
  try { res = await provider.readDetailed({ categories }); } catch { return { health, connection, report: {}, changed: false, skipped: 'erro' }; }
  let next = health;
  const report = {};
  for (const id of categories) {
    const r = (res.report && res.report[id]) || { ok: false, count: 0 };
    report[id] = { ok: !!r.ok, count: r.count || 0 };
    if (!r.ok) continue; // categoria que falhou: mantém o que já estava
    const metrics = metricsOf(id);
    const incoming = (res.samples || []).filter((s) => metrics.includes(s.metric));
    if (res.window && incoming.length > 0) next = mergeImported(next, incoming, { from: res.window.from, metrics });
  }
  const anyOk = categories.some((id) => report[id].ok);
  const nextConn = anyOk ? { ...connection, importedAt: new Date(now).toISOString() } : connection;
  return { health: next, connection: nextConn, report, changed: anyOk };
}

// "Atualizado às 14:05" (hora local do aparelho).
export function updatedAtLabel(iso) {
  const d = new Date(iso);
  if (!iso || !Number.isFinite(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `Atualizado às ${hh}:${mm}`;
}

// Resumo para a tela Conectar (só contagens): quantas categorias leram e se TUDO veio vazio.
export function summarizeReport(report) {
  const ids = Object.keys(report || {});
  const ok = ids.filter((id) => report[id].ok);
  const total = ok.reduce((a, id) => a + report[id].count, 0);
  return { categories: ids.length, read: ok.length, failed: ids.length - ok.length, total, allEmpty: ok.length > 0 && total === 0 };
}
