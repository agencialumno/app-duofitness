// Valida em segundos a chave da API do App Store Connect ANTES do build iOS (que leva muitos minutos
// em runner macOS): monta o JWT (ES256) com a chave, consulta o app pelo bundle id e diz qual
// credencial está errada. Nunca imprime a chave, o JWT nem o corpo da resposta.
//
// Variáveis: APPSTORE_KEY_ID, APPSTORE_ISSUER_ID e o caminho do .p8 em --key <arquivo>
//            (ou APPSTORE_KEY_PATH).
// Uso:  node scripts/check-appstore-key.mjs --key <AuthKey.p8> [--bundle-id com.duofitness.app]
//                                           [--api https://api.appstoreconnect.apple.com] [--offline]
//   --offline  só monta o JWT e confere a assinatura com a chave pública (sem rede).
//   --api      muda a URL base (usado nos testes com um servidor local).
//
// Papéis: a consulta de apps funciona com App Manager. Já o "cloud signing" do xcodebuild pode
// exigir Admin; essa parte só o xcodebuild confirma (veja docs/testflight.md).
import { createPublicKey, sign, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const onGithub = process.env.GITHUB_ACTIONS === 'true';
const fail = (msg) => {
  console.log(onGithub ? `::error::${msg}` : `ERRO  ${msg}`);
  process.exit(1);
};

const keyId = process.env.APPSTORE_KEY_ID?.trim();
const issuerId = process.env.APPSTORE_ISSUER_ID?.trim();
const keyPath = arg('--key') ?? process.env.APPSTORE_KEY_PATH;
const bundleId = arg('--bundle-id') ?? 'com.duofitness.app';
const apiBase = (arg('--api') ?? 'https://api.appstoreconnect.apple.com').replace(/\/+$/, '');
const offline = process.argv.includes('--offline');

const missing = [];
if (!keyId) missing.push('APPSTORE_KEY_ID');
if (!issuerId) missing.push('APPSTORE_ISSUER_ID');
if (!keyPath) missing.push('caminho da chave (--key)');
if (missing.length > 0) fail(`Faltam: ${missing.join(', ')}.`);

let pem;
try {
  pem = readFileSync(keyPath, 'utf8');
} catch {
  fail('Não consegui ler o arquivo da chave privada (.p8).');
}
if (!pem.includes('BEGIN PRIVATE KEY')) {
  fail('APPSTORE_PRIVATE_KEY não parece uma chave .p8 (esperado um bloco "BEGIN PRIVATE KEY"). Cole o conteúdo do arquivo AuthKey_XXXX.p8 inteiro.');
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function makeJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iss: issuerId, iat: now, exp: now + 10 * 60, aud: 'appstoreconnect-v1' }));
  const data = `${header}.${payload}`;
  // ES256 = ECDSA P-256 com assinatura "crua" (r||s, 64 bytes), não DER.
  const signature = sign('sha256', Buffer.from(data), { key: pem, dsaEncoding: 'ieee-p1363' });
  return { jwt: `${data}.${b64url(signature)}`, data, signature };
}

let token;
try {
  token = makeJwt();
} catch {
  fail('A chave privada não é uma chave EC P-256 válida (formato .p8 da App Store Connect). Confira o secret APPSTORE_PRIVATE_KEY.');
}

if (offline) {
  const ok = verify('sha256', Buffer.from(token.data), { key: createPublicKey(pem), dsaEncoding: 'ieee-p1363' }, token.signature);
  if (!ok) fail('A assinatura do JWT não confere com a chave pública.');
  console.log('JWT montado e verificado localmente (modo offline).');
  process.exit(0);
}

let res;
try {
  res = await fetch(`${apiBase}/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&limit=1`, {
    headers: { Authorization: `Bearer ${token.jwt}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
} catch {
  fail('Não consegui falar com a API do App Store Connect (rede). Tente de novo.');
}

if (res.status === 401) {
  fail('A App Store Connect recusou as credenciais (401). Confira APPSTORE_KEY_ID, APPSTORE_ISSUER_ID e APPSTORE_PRIVATE_KEY: os três têm que ser da MESMA chave de API (Users and Access > Integrations > App Store Connect API).');
}
if (res.status === 403) {
  fail('A chave é válida, mas não tem permissão (403). Use uma chave de equipe com papel App Manager ou Admin (veja docs/testflight.md).');
}
if (!res.ok) {
  fail(`A API do App Store Connect respondeu ${res.status}. Tente de novo; se persistir, confira o status da Apple.`);
}

const body = await res.json().catch(() => ({}));
const found = Array.isArray(body.data) && body.data.length > 0;
if (!found) {
  fail(`Credenciais válidas, mas o app com bundle id ${bundleId} não foi encontrado nesta conta. Crie o app no App Store Connect (Apps > + > Novo app) com esse bundle id.`);
}
console.log(`Chave da API válida; app ${bundleId} encontrado no App Store Connect.`);
