// Falha se o repositório PÚBLICO tiver (versionado) algum arquivo de configuração do Firebase ou algo que pareça segredo:
//  - google-services.json / GoogleService-Info.plist versionados (a configuração entra no build por secrets, fora do git);
//  - "service_account" (chave de conta de serviço do Google), chave privada PEM ou chave de API do Google (padrão AIza + 35 caracteres).
// Só olha arquivos versionados (git ls-files). Nunca imprime o trecho encontrado, só o arquivo, a linha e o tipo.
// Uso: node scripts/check-no-secrets.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FORBIDDEN_NAMES = [/(^|\/)google-services\.json$/i, /(^|\/)GoogleService-Info\.plist$/i, /adminsdk.*\.json$/i, /service-?account.*\.json$/i];

export const CONTENT_PATTERNS = [
  { id: 'conta de serviço do Google', re: /service_account/ },
  { id: 'chave privada', re: /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED |DSA )?PRIVATE KEY-----/ },
  { id: 'chave de API do Google (padrão AIza)', re: /AIza[0-9A-Za-z_-]{35}/ },
];

// Este script e o teste dele citam os padrões de propósito.
export const SELF_ALLOWED = new Set(['scripts/check-no-secrets.mjs', 'backend/test/checknosecrets.test.ts']);

// Testes antigos usam um cabeçalho PEM com conteúdo FALSO ("AAAA", "SEGREDO") como fixture: só o padrão de chave privada é liberado neles.
export const FIXTURE_ALLOWED = {
  'backend/test/appstorekey.test.ts': ['chave privada'],
  'backend/test/iosupload.test.ts': ['chave privada'],
};

const looksBinary = (buf) => buf.subarray(0, 8000).includes(0);

// files: caminhos relativos (com /). read: (caminho) => Buffer. Devolve [{ file, line, kind }].
export function scanFiles(files, read) {
  const problems = [];
  for (const file of files) {
    if (SELF_ALLOWED.has(file)) continue;
    if (FORBIDDEN_NAMES.some((re) => re.test(file))) problems.push({ file, line: 0, kind: 'arquivo de configuração/chave versionado' });
    let buf;
    try { buf = read(file); } catch { continue; }
    if (!buf || buf.length > 2_000_000 || looksBinary(buf)) continue;
    const lines = buf.toString('utf8').split(/\r?\n/);
    lines.forEach((text, i) => {
      for (const p of CONTENT_PATTERNS) if (p.re.test(text) && !(FIXTURE_ALLOWED[file] || []).includes(p.id)) problems.push({ file, line: i + 1, kind: p.id });
    });
  }
  return problems;
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const out = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  const files = out.toString('utf8').split('\0').filter(Boolean).filter((f) => {
    try { return statSync(path.join(root, f)).isFile(); } catch { return false; }
  });
  const problems = scanFiles(files, (f) => readFileSync(path.join(root, f)));
  if (problems.length) {
    console.error('check-no-secrets: encontrado no repositório (público):');
    for (const p of problems) console.error(`  - ${p.file}${p.line ? `:${p.line}` : ''}: ${p.kind}`);
    console.error('Remova do git (git rm --cached) e guarde fora do repositório; use os secrets do GitHub.');
    process.exit(1);
  }
  console.log(`check-no-secrets: ${files.length} arquivos versionados conferidos, nada suspeito.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
