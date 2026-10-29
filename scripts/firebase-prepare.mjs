// Prepara (ou limpa) a configuração do Firebase NO CI, a partir dos secrets do GitHub em base64.
// Os arquivos vão para .firebase-config/ (ignorado pelo git) e são apagados ao fim do job. NUNCA imprime o conteúdo:
// só mensagens e o resultado das validações. A chave de API do arquivo é mascarada nos logs do GitHub.
//
// Uso:  node scripts/firebase-prepare.mjs android|ios|cleanup
// Env:  FIREBASE_REQUESTED (variável do repositório FIREBASE_ENABLED: "true" para ligar)
//       FIREBASE_GOOGLE_SERVICES_JSON_B64 (android) | FIREBASE_GOOGLE_SERVICE_INFO_PLIST_B64 (ios)
//       GITHUB_ENV (arquivo do GitHub Actions; recebe FIREBASE_ENABLED=true e o caminho do arquivo)
// Sem a variável, sem o secret ou com o secret vazio, NÃO liga o Firebase (o build segue como sempre, com aviso).
// Secret presente mas inválido (JSON/plist quebrado, pacote ou bundle id diferente de com.duofitness.app): falha.
import { appendFileSync, chmodSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const APP_ID = 'com.duofitness.app';
export const DIR = '.firebase-config';
const TARGETS = {
  android: { secret: 'FIREBASE_GOOGLE_SERVICES_JSON_B64', file: 'google-services.json', envPath: 'FIREBASE_ANDROID_CONFIG' },
  ios: { secret: 'FIREBASE_GOOGLE_SERVICE_INFO_PLIST_B64', file: 'GoogleService-Info.plist', envPath: 'FIREBASE_IOS_CONFIG' },
};

// Devolve { ok, error?, apiKeys[] } sem nunca incluir o conteúdo na mensagem.
export function validateAndroid(text) {
  let json;
  try { json = JSON.parse(text); } catch { return { ok: false, error: 'o google-services.json não é um JSON válido' }; }
  const clients = Array.isArray(json.client) ? json.client : [];
  const match = clients.some((c) => c?.client_info?.android_client_info?.package_name === APP_ID);
  if (!json.project_info?.project_id) return { ok: false, error: 'o google-services.json não tem project_info.project_id' };
  if (!match) return { ok: false, error: `o google-services.json não tem o pacote ${APP_ID}` };
  const apiKeys = clients.flatMap((c) => (c.api_key || []).map((k) => k.current_key)).filter(Boolean);
  return { ok: true, apiKeys };
}

export function validateIos(text) {
  const get = (key) => new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`).exec(text)?.[1];
  if (!/<plist[\s>]/.test(text) || !/<dict>/.test(text)) return { ok: false, error: 'o GoogleService-Info.plist não é um plist válido' };
  if (get('BUNDLE_ID') !== APP_ID) return { ok: false, error: `o GoogleService-Info.plist não tem o BUNDLE_ID ${APP_ID}` };
  for (const k of ['GOOGLE_APP_ID', 'PROJECT_ID']) if (!get(k)) return { ok: false, error: `o GoogleService-Info.plist não tem ${k}` };
  // Login com Google no iOS: sem CLIENT_ID e REVERSED_CLIENT_ID o seletor de contas abre e o retorno nunca volta ao app (o
  // REVERSED_CLIENT_ID vira o URL scheme do Info.plist). Esses campos só existem se o Google estava ATIVADO no Firebase quando o
  // plist foi baixado. Os valores nunca são impressos.
  const clientId = get('CLIENT_ID');
  const reversed = get('REVERSED_CLIENT_ID');
  if (!clientId || !reversed) {
    return { ok: false, error: 'o GoogleService-Info.plist não tem CLIENT_ID e REVERSED_CLIENT_ID: ele foi baixado ANTES de ativar o login com Google no Firebase. Ative o Google em Authentication > Sign-in method, baixe o plist de novo e atualize o secret (docs/pendencias-usuario.md)' };
  }
  if (reversed !== `com.googleusercontent.apps.${clientId.replace(/\.apps\.googleusercontent\.com$/, '')}`) {
    return { ok: false, error: 'o REVERSED_CLIENT_ID do GoogleService-Info.plist não corresponde ao CLIENT_ID (plist editado ou de outro app); baixe o plist de novo no Firebase' };
  }
  const apiKeys = [get('API_KEY')].filter(Boolean);
  return { ok: true, apiKeys };
}

export function prepare(platform, env = process.env, cwd = process.cwd(), out = console) {
  const t = TARGETS[platform];
  if (!t) throw new Error(`plataforma desconhecida: ${platform}`);
  if (String(env.FIREBASE_REQUESTED || '').trim().toLowerCase() !== 'true') {
    out.log('Firebase desligado (variável FIREBASE_ENABLED vazia): o build segue como sempre.');
    return { enabled: false };
  }
  const b64 = String(env[t.secret] || '').replace(/\s+/g, '');
  if (!b64) {
    out.log(`::warning::FIREBASE_ENABLED=true, mas o secret ${t.secret} não existe ou está vazio: o build segue SEM Firebase.`);
    return { enabled: false };
  }
  const text = Buffer.from(b64, 'base64').toString('utf8');
  const v = platform === 'android' ? validateAndroid(text) : validateIos(text);
  if (!v.ok) { out.log(`::error::${v.error}`); return { enabled: false, failed: true, error: v.error }; }
  for (const k of v.apiKeys) out.log(`::add-mask::${k}`); // a chave de API nunca aparece nos logs
  const dir = path.join(cwd, DIR);
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, t.file);
  writeFileSync(file, text, { mode: 0o600 });
  try { chmodSync(file, 0o600); } catch { /* Windows */ }
  if (env.GITHUB_ENV) appendFileSync(env.GITHUB_ENV, `FIREBASE_ENABLED=true\n${t.envPath}=${file}\n`);
  out.log(`Firebase ligado para ${platform}: configuração gravada em ${DIR}/${t.file} (conteúdo não exibido).`);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `- Firebase (conta) em ${platform}: **ligado** (configuração vinda dos secrets, conteúdo não exibido)
`);
  return { enabled: true, file };
}

export function cleanup(cwd = process.cwd(), out = console) {
  const removed = [];
  const rm = (p) => { if (existsSync(p)) { rmSync(p, { recursive: true, force: true }); removed.push(path.relative(cwd, p)); } };
  rm(path.join(cwd, DIR));
  rm(path.join(cwd, 'android', 'app', 'google-services.json'));
  const iosDir = path.join(cwd, 'ios');
  if (existsSync(iosDir)) {
    for (const d of readdirSync(iosDir, { withFileTypes: true })) if (d.isDirectory()) rm(path.join(iosDir, d.name, 'GoogleService-Info.plist'));
  }
  out.log(removed.length ? `Arquivos do Firebase apagados: ${removed.join(', ')}` : 'Nenhum arquivo do Firebase para apagar.');
  return removed;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const what = process.argv[2];
  if (what === 'cleanup') cleanup();
  else {
    const r = prepare(what);
    if (r.failed) process.exit(1);
  }
}
