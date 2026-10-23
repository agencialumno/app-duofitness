// Lê o log do xcodebuild (archive, exportArchive ou upload) e imprime, como ::error::, a CAUSA
// provável e o que fazer. Só imprime texto próprio e códigos "ITMS-xxxxx" da Apple: nunca linhas
// cruas do log (que podem ter caminhos e identificadores) e nunca segredos.
//
// Uso: node scripts/ios-log-hints.mjs <arquivo-de-log> [--unsigned]
//   --unsigned  o archive foi feito SEM assinatura (time Apple sem dispositivos); acrescenta a dica de
//               registrar um iPhone para voltar ao caminho normal.
// Saída: código 0 se achou alguma causa conhecida, 1 se não reconheceu nada.
//
// Outros usos:
//   node scripts/ios-log-hints.mjs --sanitize-dir <pasta>   reescreve no lugar os .log da pasta, omitindo linhas que possam
//                                                          ter conteúdo de arquivos do Firebase ou segredos (antes de subir o artifact)
//   --stage <nome>   rótulo da etapa (prebuild, pod-install, archive...) usado na mensagem de "causa não reconhecida"
// Quando NENHUMA causa é reconhecida, imprime as primeiras 40 linhas com "error:", "Undefined symbol", "No such module",
// "fatal error" ou "PhaseScriptExecution failed", sanitizadas (ver scripts/ios-log-sanitize.mjs), e as grava no resumo do job.
import { appendFileSync, readFileSync } from 'node:fs';
import { extractErrorLines, sanitizeDir } from './ios-log-sanitize.mjs';

const args = process.argv.slice(2);
const sanitizeIdx = args.indexOf('--sanitize-dir');
if (sanitizeIdx > -1) {
  const dir = args[sanitizeIdx + 1];
  try {
    const r = sanitizeDir(dir);
    console.log(`Logs sanitizados em ${dir}: ${r.files} arquivo(s), ${r.changed} com linhas omitidas.`);
    process.exit(0);
  } catch (e) {
    console.log(`Não consegui sanitizar ${dir}: ${String(e.message).split('\n')[0]}`);
    process.exit(0);
  }
}
const stageIdx = args.indexOf('--stage');
const stage = stageIdx > -1 ? args[stageIdx + 1] : 'xcodebuild';
const unsigned = args.includes('--unsigned');
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--stage');
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
    id: 'limite-certificados',
    re: /maximum number of certificates|Choose a certificate to revoke|reached the maximum number of (development |distribution )?certificates/i,
    msg: 'CAUSA: a conta Apple atingiu o limite de certificados. Cada execução do CI roda num runner novo, sem a chave privada do certificado anterior, e o archive com assinatura automática criou um certificado de DESENVOLVIMENTO novo ("Created via API") por execução, até esgotar o limite. AÇÃO: revogue manualmente, em developer.apple.com > Certificates, Identifiers & Profiles > Certificates, SÓ os certificados de tipo Development "Created via API" (confira antes se outro pipeline da conta os usa), sem tocar nos Distribution nem no "Distribution Managed". O ios.yml agora faz o archive SEM assinatura por padrão (a assinatura de distribuição fica no export), então isto não deve se repetir; só volta se rodar com sign_archive=true. NÃO adianta trocar o papel da chave da API: o problema não é permissão.',
  },
  {
    suppressedBy: 'limite-certificados',
    re: /cloud signing permission error|does not have permission to (create|use)|permission to create .*certificate|cloud[- ]managed.*(permission|denied)|Unable to create .*distribution certificate/i,
    msg: 'A chave da API não tem permissão para o cloud signing (criar o certificado Apple Distribution gerenciado na nuvem). A chave precisa ter o papel ADMIN. No App Store Connect: Users and Access > Integrations > App Store Connect API > gerar chave de EQUIPE com acesso Admin (só o Account Holder ou um Admin gera) e atualizar os secrets APPSTORE_KEY_ID, APPSTORE_ISSUER_ID e APPSTORE_PRIVATE_KEY. Depois que o certificado gerenciado existir, App Manager basta nas próximas execuções.',
  },
  {
    id: 'sem-dispositivos',
    re: /no devices from which to generate a provisioning profile|Your team has no devices/i,
    msg: 'O time Apple não tem dispositivos registrados, e o Xcode exige um para gerar o perfil de desenvolvimento do archive. O workflow repete o archive sem assinar e deixa a assinatura de distribuição para o export. Para evitar esse caminho, REGISTRE UM iPhone no portal da Apple: developer.apple.com > Certificates, Identifiers & Profiles > Devices > + (plataforma iOS, um nome e o UDID do aparelho; o UDID aparece no Finder ao selecionar o iPhone no Mac, ou em Ajustes > Geral > Sobre).',
  },
  {
    re: /No Account for Team|Unable to authenticate|invalidPEMDocument|Invalid authentication key|authentication key credential|App Store Connect.*(credentials|authentication)/i,
    msg: 'O xcodebuild não conseguiu autenticar com a chave da API. Confira APPSTORE_KEY_ID, APPSTORE_ISSUER_ID e APPSTORE_PRIVATE_KEY (os três da MESMA chave) e se APPLE_TEAM_ID é o Team ID da organização. Chaves de conta Enterprise não funcionam para isso.',
  },
  {
    id: 'perfil',
    // consequência comum de "sem dispositivos": se essa causa já foi explicada, não repete esta
    suppressedBy: ['sem-dispositivos', 'limite-certificados'],
    re: /No profiles for '.*' were found|requires a provisioning profile|Provisioning profile .* doesn't (match|include)/i,
    msg: 'Não foi possível obter o perfil de provisionamento de com.duofitness.app. Confira em developer.apple.com > Certificates, Identifiers & Profiles > Identifiers se o App ID existe (o app do App Store Connect cria o registro) Se a chave da API JÁ tem papel Admin, não troque o papel: leia as outras dicas deste log (por exemplo, o limite de certificados). Só use uma chave com papel Admin no primeiro build se ela ainda não for Admin.',
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
    // altool / iTMSTransporter / exportArchive: a chave não chegou ao serviço de envio
    re: /No Accounts with App Store Connect Access|Authentication credentials are missing or invalid|NOT_AUTHORIZED|Unable to authenticate with App Store Connect|Failed to find an? (API )?(private )?key/i,
    msg: 'O envio ao App Store Connect não conseguiu autenticar. O workflow envia com o altool usando a chave da API (AuthKey_<KEYID>.p8 em API_PRIVATE_KEYS_DIR). Confira: APPSTORE_KEY_ID e APPSTORE_ISSUER_ID são da MESMA chave que APPSTORE_PRIVATE_KEY; a chave é de EQUIPE (Team Key) com papel App Manager ou Admin; e o app com.duofitness.app existe nesta conta. (O xcodebuild -exportArchive com destination upload não usa a chave da API para enviar; por isso o envio é feito pelo altool.)',
  },
  {
    re: /required agreement|agreement (is )?(missing|has expired|pending)|Program License Agreement|accept the latest|ITMS-90(12[0-9]|1[3-9][0-9])[^\n]{0,40}agreement/i,
    msg: 'Há um acordo pendente na conta Apple (o Contrato de Licença do Programa ou um acordo do App Store Connect mudou). Só o Account Holder consegue aceitar: App Store Connect > Business (ou developer.apple.com/account) > aceitar os acordos pendentes. Depois rode o workflow de novo.',
  },
  {
    re: /ITMS-9071[0-9]|ITMS-90022|ITMS-90023|ITMS-90032|ITMS-90704|ITMS-90236|Missing required icon file|alpha channel|Invalid large app icon|Invalid Image/i,
    msg: 'A Apple recusou o ícone do app. Esperado: PNG 1024x1024, sem transparência (sem canal alfa) e sem cantos arredondados. Confira assets/icon.png com "node scripts/check-pngs.mjs" (ele deve ser RGB) e rode o prebuild de novo.',
  },
  {
    re: /Invalid Info\.plist|The Info\.plist (file )?is missing|Missing Info\.plist value|ITMS-9005[67]|ITMS-90(060|083)|Invalid Bundle[^\n]{0,60}Info\.plist/i,
    msg: 'A Apple recusou o Info.plist do app. Veja nas linhas "Apple: ITMS-..." acima as chaves citadas (CFBundleVersion, CFBundleShortVersionString, MinimumOSVersion...). O workflow grava a versão e o build number no Info.plist gerado (scripts/set-ios-version.sh); o resto vem do app.json (ios.infoPlist).',
  },
  {
    re: /already been used|ITMS-90189|Redundant Binary Upload|bundle version must be higher|ITMS-4238/i,
    msg: 'O número do build já foi usado para esta versão. O build number é o run_number do workflow: não renomeie o ios.yml (a contagem reinicia) e suba a versão no app.json se precisar recomeçar.',
  },
  {
    id: 'rnfb-nao-modular',
    re: /include of non-modular header inside framework module|Wnon-modular-include-in-framework-module|PrecompileModule[^\n]*RNFB|ExplicitPrecompiledModules\/RNFB/i,
    msg: 'CAUSA: o pod do React Native Firebase (RNFBApp/RNFBAuth) foi compilado como FRAMEWORK (use_frameworks static) e importa headers do React Native pré-compilado (RCTConvert.h, RCTBridgeModule.h...), que não são modulares; com -Werror isso vira erro. AÇÃO: confira no passo "Conferir o Podfile do Firebase" (resumo do job) que o Podfile.properties.json tem ios.forceStaticLinking com RNFBApp e RNFBAuth (remédio documentado do RNFB #8657 e do Expo #39607) e que o Podfile tem os marcadores [withFirebaseIosFix] (plugins/withFirebaseIosFix.js). Se persistir com tudo isso presente, o recurso documentado de reserva é expo-build-properties ios.buildReactNativeFromSource=true (compila o React Native do código-fonte; build bem mais lento). Se ainda assim falhar, pare e reavalie o Firebase JS SDK (critério combinado).',
  },
  {
    id: 'rn-modulemap',
    re: /React-use-frameworks\.modulemap|module map file '[^']*React[^']*' not found/i,
    msg: 'CAUSA (relatada no RNFB #8960, ainda não confirmada para o SDK 54): o React Native pré-compilado (React-Core-prebuilt) com use_frameworks static perdeu o module map. AÇÃO: use a reserva documentada ios.buildReactNativeFromSource=true no expo-build-properties (ou RCT_USE_PREBUILT_RNCORE=0 no ambiente do pod install) e registre o resultado em docs/medicoes-fase0.md.',
  },
  {
    id: 'pods-swift-estatico',
    re: /Swift pods? cannot yet be integrated as static libraries|does not define modules\. To opt into those targets generating module maps/i,
    msg: 'CAUSA: um pod Swift do Firebase precisa de módulos e o Podfile não está com use_frameworks. AÇÃO: confira se o Podfile.properties.json tem ios.useFrameworks=static (plugin withFirebaseOptional, só com FIREBASE_ENABLED=true e o arquivo GoogleService-Info.plist) e se o passo de preparo do Firebase rodou antes do prebuild.',
  },
];

let found = false;
const matched = new Set();
for (const rule of RULES) {
  if (!rule.re.test(log)) continue;
  if (rule.suppressedBy && [rule.suppressedBy].flat().some((id) => matched.has(id))) continue;
  if (rule.id) matched.add(rule.id);
  out(rule.msg);
  found = true;
}
if (unsigned) {
  out('Este build usou o archive SEM assinatura (o time Apple não tem dispositivos). A assinatura de distribuição depende só do export com a chave da API (papel Admin no primeiro build). Registrar um iPhone no portal da Apple (Certificates, Identifiers & Profiles > Devices) permite o archive assinado normal.');
  found = true;
}

// Códigos ITMS da Apple (texto da própria Apple, sem dados do usuário).
const itms = [...new Set([...log.matchAll(/ITMS-\d+[:\s][^\n"]{0,180}/g)].map((m) => m[0].trim().replace(/[\r\n]+/g, ' ')))].slice(0, 5);
for (const line of itms) {
  out(`Apple: ${line}`);
  found = true;
}

if (!found) {
  out(`Não reconheci a causa no log (${stage}). Baixe o artifact "xcodebuild-logs" desta execução e procure a primeira linha com "error:". Abaixo, as primeiras linhas de erro (sanitizadas).`);
  const lines = extractErrorLines(log, 40);
  if (lines.length === 0) lines.push('(nenhuma linha com error:, Undefined symbol, No such module, fatal error ou PhaseScriptExecution failed)');
  console.log(`::group::Primeiras linhas de erro (${stage})`);
  for (const l of lines) console.log(l);
  console.log('::endgroup::');
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n### Primeiras linhas de erro (${stage}, sanitizadas)\n\n\`\`\`\n${lines.join('\n')}\n\`\`\`\n`);
    } catch { /* resumo indisponível */ }
  }
}
process.exit(found ? 0 : 1);
