// Sanitização de logs do xcodebuild/pod install: NUNCA mostra conteúdo de arquivos do Firebase nem segredos.
// Linhas suspeitas são omitidas e valores longos mascarados. Usado por ios-log-hints.mjs.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// ---------- Linhas de erro "cruas" (quando nenhuma causa foi reconhecida) ----------
// NUNCA mostram conteúdo de arquivos do Firebase nem segredos: linhas suspeitas são omitidas e valores longos mascarados.
export const ERROR_LINE_RE = /error:|Undefined symbol|No such module|fatal error|PhaseScriptExecution failed/i;
const SENSITIVE_LINE_RE = /API_KEY|CLIENT_ID|REVERSED_CLIENT_ID|GCM_SENDER_ID|GOOGLE_APP_ID|current_key|mobilesdk_app_id|apiKey|AIza[0-9A-Za-z_-]{10,}|BEGIN [A-Z ]*PRIVATE KEY|service_account|<key>|<string>/i;

export function sanitizeLine(line) {
  let s = String(line).replace(/\r/g, '').slice(0, 400);
  if (SENSITIVE_LINE_RE.test(s)) return '[linha omitida: pode conter configuração ou segredo]';
  s = s.replace(/eyJ[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}(\.[0-9A-Za-z_-]*)?/g, '***'); // JWT
  s = s.replace(/\b[0-9A-Za-z+/_=-]{40,}\b/g, '***'); // tokens longos
  s = s.replace(/(Authorization:?\s+)?(Bearer|Basic)\s+\S+/gi, (m, auth, kind) => `${auth || ''}${kind} ***`);
  return s;
}

// Primeiras `max` linhas de erro do log, sem duplicatas e sanitizadas.
export function extractErrorLines(text, max = 40) {
  const seen = new Set();
  const lines = [];
  for (const raw of String(text).split('\n')) {
    if (!ERROR_LINE_RE.test(raw)) continue;
    const s = sanitizeLine(raw).trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    lines.push(s);
    if (lines.length >= max) break;
  }
  return lines;
}

// Reescreve, no lugar, as linhas sensíveis dos logs de uma pasta (usado antes de subir o artifact xcodebuild-logs).
export function sanitizeDir(dir) {
  const files = readdirSync(dir).filter((f) => /\.(log|txt)$/.test(f));
  let changed = 0;
  for (const f of files) {
    const p = path.join(dir, f);
    const before = readFileSync(p, 'utf8');
    const after = before.split('\n').map((l) => (SENSITIVE_LINE_RE.test(l) ? '[linha omitida: pode conter configuração ou segredo]' : l)).join('\n');
    if (after !== before) { writeFileSync(p, after); changed++; }
  }
  return { files: files.length, changed };
}

