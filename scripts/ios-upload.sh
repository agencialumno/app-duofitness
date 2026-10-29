#!/usr/bin/env bash
# Valida e envia o .ipa JÁ EXPORTADO E VERIFICADO ao App Store Connect (TestFlight) com o altool, usando a
# chave da API. Substitui o segundo "xcodebuild -exportArchive" com destination=upload, que falhava na
# autenticação do envio ("No Accounts with App Store Connect Access") mesmo com a chave funcionando
# para assinar.
#
# Uso: scripts/ios-upload.sh <arquivo.ipa> [--validate-only]
#   --validate-only  só roda a validação (altool --validate-app), sem enviar.
#
# Variáveis: APPSTORE_KEY_ID, APPSTORE_ISSUER_ID, APPSTORE_KEY_PATH (o .p8 de origem).
#            RUNNER_TEMP (opcional), HOME. XCRUN (opcional, só para testes; padrão "xcrun").
#
# O altool procura a chave AuthKey_<KEYID>.p8 em API_PRIVATE_KEYS_DIR e, se a variável não existir, em
# ./private_keys, ~/private_keys, ~/.private_keys e ~/.appstoreconnect/private_keys. Copiamos a chave
# para um diretório temporário (API_PRIVATE_KEYS_DIR) E para ~/.appstoreconnect/private_keys, só
# durante este script, e apagamos as duas cópias na saída (trap) e de novo no passo final do workflow.
#
# Nunca imprime a chave nem o JWT (a saída do altool passa por um filtro). O errexit fica DESLIGADO de
# propósito: o código de saída do altool não é confiável (no Xcode 26 há relatos de falha com exit 0),
# então decidimos pelo código E pelo texto da saída.
set -uo pipefail

IPA="${1:-}"
MODE="upload"
[ "${2:-}" = "--validate-only" ] && MODE="validate"
XCRUN="${XCRUN:-xcrun}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

err() { echo "::error::$1"; }

for name in APPSTORE_KEY_ID APPSTORE_ISSUER_ID APPSTORE_KEY_PATH; do
  if [ -z "${!name:-}" ]; then
    err "Falta a variável $name para o envio ao App Store Connect."
    exit 2
  fi
done
if [ -z "$IPA" ] || [ ! -f "$IPA" ]; then
  err "O .ipa para enviar não existe: '${IPA:-<vazio>}'. Esperado: o .ipa gerado e verificado pelo passo de export."
  exit 1
fi
if [ ! -f "$APPSTORE_KEY_PATH" ]; then
  err "O arquivo da chave da API não existe em APPSTORE_KEY_PATH."
  exit 1
fi

# ---- a chave, só durante o script ---------------------------------------------------------------
KEY_FILE_NAME="AuthKey_${APPSTORE_KEY_ID}.p8"
KEYS_DIR="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/altool-private-keys"
DEFAULT_KEYS_DIR="${HOME}/.appstoreconnect/private_keys"
cleanup() {
  rm -f "$KEYS_DIR/$KEY_FILE_NAME" "$DEFAULT_KEYS_DIR/$KEY_FILE_NAME"
  rmdir "$KEYS_DIR" 2> /dev/null || true
}
trap cleanup EXIT

umask 077
mkdir -p "$KEYS_DIR" "$DEFAULT_KEYS_DIR"
cp "$APPSTORE_KEY_PATH" "$KEYS_DIR/$KEY_FILE_NAME"
cp "$APPSTORE_KEY_PATH" "$DEFAULT_KEYS_DIR/$KEY_FILE_NAME"
chmod 600 "$KEYS_DIR/$KEY_FILE_NAME" "$DEFAULT_KEYS_DIR/$KEY_FILE_NAME" 2> /dev/null || true
export API_PRIVATE_KEYS_DIR="$KEYS_DIR"

# ---- o que o Xcode deste runner oferece ----------------------------------------------------------
HELP="$("$XCRUN" altool --help 2>&1)"
has_flag() { grep -q -- "$1" <<< "$HELP"; }

TOOL=""
if has_flag '--upload-app' && has_flag '--validate-app'; then
  TOOL="altool"
else
  TOOL="transporter"
fi
echo "Ferramenta de envio: $TOOL (altool --upload-app: $(has_flag '--upload-app' && echo presente || echo ausente), --validate-app: $(has_flag '--validate-app' && echo presente || echo ausente), --upload-package: $(has_flag '--upload-package' && echo presente || echo ausente))"
if [ "$TOOL" = "transporter" ]; then
  echo "::warning::O altool deste Xcode não tem --upload-app/--validate-app; usando o iTMSTransporter (caminho oficial do Xcode)."
fi

# ---- execução com saída filtrada -----------------------------------------------------------------
LOG_DIR="${XC_LOG_DIR:-${RUNNER_TEMP:-${TMPDIR:-/tmp}}}"
mkdir -p "$LOG_DIR"

# Remove JWT (eyJ...) e o bloco inteiro de qualquer chave privada (BEGIN...END, não só as linhas de
# moldura) antes de mostrar/guardar. Se o END não vier, apaga até o fim: melhor perder log do que vazar.
sanitize() {
  sed -E \
    -e 's/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/[JWT omitido]/g' \
    -e '/-----BEGIN [A-Z ]*PRIVATE KEY-----/,/-----END [A-Z ]*PRIVATE KEY-----/d' \
    -e '/PRIVATE KEY/d'
}

# run_step <rótulo> <arquivo-de-log> <comando...>   (define STEP_RC)
run_step() {
  local label="$1" log="$2"
  shift 2
  echo "::group::$label"
  "$@" 2>&1 | sanitize | tee "$log"
  STEP_RC=${PIPESTATUS[0]}
  echo "::endgroup::"
}

# O código de saída do altool não é confiável: também conta texto de erro na saída.
looks_failed() {
  local log="$1"
  grep -qiE '\*\*\* Error|ERROR ITMS|^Error[: ]|Error Domain|Unable to (upload|validate|authenticate)|Failed to (upload|validate|find)|No Accounts with App Store Connect Access' "$log"
}

fail_with_hints() {
  local log="$1" rc="$2" what="$3"
  err "$what falhou (código $rc). A saída completa do altool está em $(basename "$log") no artifact xcodebuild-logs. Causas prováveis abaixo."
  # a causa é do altool (validar/enviar): classifica a saída DELE e nunca manda procurar no log do xcodebuild
  node "$HERE/ios-log-hints.mjs" "$log" --stage altool || true
  exit "${rc:-1}"
}

altool_auth=(--apiKey "$APPSTORE_KEY_ID" --apiIssuer "$APPSTORE_ISSUER_ID")
VALIDATE_LOG="$LOG_DIR/ipa-validate.log"
UPLOAD_LOG="$LOG_DIR/ipa-upload.log"

# ---- 1) validar (falha cedo, com mensagem clara) -------------------------------------------------
if [ "$TOOL" = "altool" ]; then
  run_step "altool --validate-app" "$VALIDATE_LOG" "$XCRUN" altool --validate-app --type ios -f "$IPA" "${altool_auth[@]}" --output-format normal
else
  run_step "iTMSTransporter -m verify" "$VALIDATE_LOG" "$XCRUN" iTMSTransporter -m verify -assetFile "$IPA" -apiKey "$APPSTORE_KEY_ID" -apiIssuer "$APPSTORE_ISSUER_ID" -v informational
fi
if [ "$STEP_RC" -ne 0 ] || looks_failed "$VALIDATE_LOG"; then
  fail_with_hints "$VALIDATE_LOG" "$([ "$STEP_RC" -ne 0 ] && echo "$STEP_RC" || echo 1)" "A validação do .ipa no App Store Connect"
fi
echo "Validação do .ipa no App Store Connect: ok."
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  echo "- .ipa validado no App Store Connect ($TOOL)" >> "$GITHUB_STEP_SUMMARY"
fi

if [ "$MODE" = "validate" ]; then
  exit 0
fi

# ---- 2) enviar -----------------------------------------------------------------------------------
if [ "$TOOL" = "altool" ]; then
  run_step "altool --upload-app" "$UPLOAD_LOG" "$XCRUN" altool --upload-app --type ios -f "$IPA" "${altool_auth[@]}" --output-format normal
  # Sucesso do altool: "No errors uploading ..." (documentado pela Apple). Sem isso, não confiamos no exit 0.
  if [ "$STEP_RC" -ne 0 ] || looks_failed "$UPLOAD_LOG"; then
    fail_with_hints "$UPLOAD_LOG" "$([ "$STEP_RC" -ne 0 ] && echo "$STEP_RC" || echo 1)" "O envio do .ipa ao App Store Connect"
  fi
  if ! grep -qi 'No errors uploading' "$UPLOAD_LOG"; then
    err "O altool terminou sem erro, mas sem a confirmação 'No errors uploading'. Não dá para garantir que o envio funcionou: confira o App Store Connect (TestFlight) antes de rodar de novo."
    exit 1
  fi
else
  run_step "iTMSTransporter -m upload" "$UPLOAD_LOG" "$XCRUN" iTMSTransporter -m upload -assetFile "$IPA" -apiKey "$APPSTORE_KEY_ID" -apiIssuer "$APPSTORE_ISSUER_ID" -v informational
  if [ "$STEP_RC" -ne 0 ] || looks_failed "$UPLOAD_LOG"; then
    fail_with_hints "$UPLOAD_LOG" "$([ "$STEP_RC" -ne 0 ] && echo "$STEP_RC" || echo 1)" "O envio do .ipa ao App Store Connect"
  fi
fi

echo "Envio ao App Store Connect: ok."
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo ""
    echo "### Enviado ao TestFlight"
    echo ""
    echo "O .ipa verificado foi enviado com o $TOOL. O App Store Connect leva de 5 a 30 minutos para processar o build; depois ele aparece em TestFlight. Veja \`docs/testflight.md\`."
  } >> "$GITHUB_STEP_SUMMARY"
fi
