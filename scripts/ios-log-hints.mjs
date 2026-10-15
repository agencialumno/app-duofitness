// Lê o log do xcodebuild (archive, exportArchive ou upload) e imprime, como ::error::, a CAUSA
// provável e o que fazer. Só imprime texto próprio e códigos "ITMS-xxxxx" da Apple: nunca linhas
// cruas do log (que podem ter caminhos e identificadores) e nunca segredos.
//
// Uso: node scripts/ios-log-hints.mjs <arquivo-de-log>
// Saída: código 0 se achou alguma causa conhecida, 1 se não reconheceu nada.
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Uso: node scripts/ios-log-hints.mjs <arquivo-de-log>');
  process.exit(2);
}
let log = '';
try {
  log = readFileSync(file, 'utf8');
} catch {
  console.log('::error::Não consegui ler o log do xcodebuild.');
  process.exit(1);
}

const onGithub = process.env.GITHUB_ACTIONS === 'true';
const out = (msg) => console.log(onGithub ? `::error::${msg}` : `ERRO  ${msg}`);

const RULES = [
  {
    re: /cloud signing permission error|does not have permission to (create|use)|permission to create .*certificate|cloud[- ]managed.*(permission|denied)|Unable to create .*distribution certificate/i,
    msg: 'A chave da API não tem permissão para o cloud signing (criar o certificado Apple Distribution gerenciado na nuvem). A chave precisa ter o papel ADMIN. No App Store Connect: Users and Access > Integrations > App Store Connect API > gerar chave de EQUIPE com acesso Admin (só o Account Holder ou um Admin gera) e atualizar os secrets APPSTORE_KEY_ID, APPSTORE_ISSUER_ID e APPSTORE_PRIVATE_KEY. Depois que o certificado gerenciado existir, App Manager basta nas próximas execuções.',
  },
  {
    re: /no devices from which to generate a provisioning profile|Your team has no devices/i,
    msg: 'O time Apple não tem dispositivos registrados, e o Xcode exige um para o perfil de desenvolvimento do archive. O workflow tenta de novo sem assinar o archive; se ainda assim falhar, registre um dispositivo em developer.apple.com > Certificates, Identifiers & Profiles > Devices.',
  },
  {
    re: /No Account for Team|Unable to authenticate|invalidPEMDocument|Invalid authentication key|authentication key credential|App Store Connect.*(credentials|authentication)/i,
    msg: 'O xcodebuild não conseguiu autenticar com a chave da API. Confira APPSTORE_KEY_ID, APPSTORE_ISSUER_ID e APPSTORE_PRIVATE_KEY (os três da MESMA chave) e se APPLE_TEAM_ID é o Team ID da organização. Chaves de conta Enterprise não funcionam para isso.',
  },
  {
    re: /No profiles for '.*' were found|requires a provisioning profile|Provisioning profile .* doesn't (match|include)/i,
    msg: 'Não foi possível obter o perfil de provisionamento de com.duofitness.app. Confira em developer.apple.com > Certificates, Identifiers & Profiles > Identifiers se o App ID existe (o app do App Store Connect cria o registro) e use uma chave com papel Admin para o primeiro build.',
  },
  {
    re: /SDK version issue|iOS 26 SDK|Xcode 26 or later|ITMS-90725|ITMS-90562/i,
    msg: 'A Apple recusou o build por causa da versão do SDK. Desde 28/04/2026 só aceita apps compilados com Xcode 26+ (SDK iOS 26). Confira o passo "Conferir Xcode" e a imagem do runner (macos-26).',
  },
  {
    re: /Missing Compliance|ITSAppUsesNonExemptEncryption/i,
    msg: 'Falta a declaração de criptografia. O app.json já define ios.infoPlist.ITSAppUsesNonExemptEncryption=false; confira o Info.plist gerado.',
  },
  {
    re: /already been used|ITMS-90189|Redundant Binary Upload|bundle version must be higher|ITMS-4238/i,
    msg: 'O número do build já foi usado para esta versão. O build number é o run_number do workflow: não renomeie o ios.yml (a contagem reinicia) e suba a versão no app.json se precisar recomeçar.',
  },
];

let found = false;
for (const rule of RULES) {
  if (rule.re.test(log)) {
    out(rule.msg);
    found = true;
  }
}

// Códigos ITMS da Apple (texto da própria Apple, sem dados do usuário).
const itms = [...new Set([...log.matchAll(/ITMS-\d+[:\s][^\n"]{0,180}/g)].map((m) => m[0].trim().replace(/[\r\n]+/g, ' ')))].slice(0, 5);
for (const line of itms) {
  out(`Apple: ${line}`);
  found = true;
}

if (!found) {
  out('Não reconheci a causa no log do xcodebuild. Baixe o artifact "xcodebuild-logs" desta execução e procure a primeira linha com "error:".');
}
process.exit(found ? 0 : 1);
