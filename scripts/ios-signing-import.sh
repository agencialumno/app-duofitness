#!/bin/bash
# Assinatura MANUAL do iOS: importa o certificado de DISTRIBUIÇÃO fixo (.p12) e o perfil de provisionamento dos secrets
# IOS_DIST_CERT_P12_B64, IOS_DIST_CERT_PASSWORD e IOS_PROVISIONING_PROFILE_B64 num keychain TEMPORÁRIO do runner.
# Roda só no macOS do CI. Nunca imprime o conteúdo do .p12, a senha, o conteúdo do perfil nem o nome completo da identidade:
# só o nome do perfil e o Team ID. Grava no GITHUB_ENV: MANUAL_SIGNING, SIGN_KEYCHAIN, SIGN_PROFILE_NAME, SIGN_PROFILE_UUID.
# Entradas: APPLE_TEAM_ID, BUNDLE_ID e, opcionais, EXPO_PUBLIC_AUTH_ENABLED / FIREBASE_ENABLED / HEALTH_INTEGRATION_ENABLED.
set -uo pipefail

fail() { echo "::error::$1"; exit 1; }

for v in IOS_DIST_CERT_P12_B64 IOS_DIST_CERT_PASSWORD IOS_PROVISIONING_PROFILE_B64; do
  [ -n "${!v:-}" ] && echo "::add-mask::${!v}"
done
: "${APPLE_TEAM_ID:?}" "${BUNDLE_ID:?}"
TMP="${RUNNER_TEMP:?}"
P12="$TMP/dist-cert.p12"
PROFILE_FILE="$TMP/dist-profile.mobileprovision"
KEYCHAIN="$TMP/duo-signing.keychain-db"
PLIST="$TMP/dist-profile.plist"
KCPASS="$(openssl rand -hex 24)"
echo "::add-mask::$KCPASS"

printf '%s' "$IOS_DIST_CERT_P12_B64" | base64 --decode > "$P12" 2>/dev/null || fail "IOS_DIST_CERT_P12_B64 não é um base64 válido. Gere de novo com: base64 -i certificado.p12 | pbcopy."
printf '%s' "$IOS_PROVISIONING_PROFILE_B64" | base64 --decode > "$PROFILE_FILE" 2>/dev/null || fail "IOS_PROVISIONING_PROFILE_B64 não é um base64 válido. Gere de novo com: base64 -i perfil.mobileprovision | pbcopy."
[ -s "$P12" ] || fail "IOS_DIST_CERT_P12_B64 está vazio depois de decodificar."
[ -s "$PROFILE_FILE" ] || fail "IOS_PROVISIONING_PROFILE_B64 está vazio depois de decodificar."

# --- perfil: lê (sem imprimir o conteúdo) e valida antes de mexer no keychain
security cms -D -i "$PROFILE_FILE" > "$PLIST" 2>/dev/null || fail "IOS_PROVISIONING_PROFILE_B64 não é um perfil .mobileprovision válido (o security cms não conseguiu ler)."
pb() { /usr/libexec/PlistBuddy -c "Print :$1" "$PLIST" 2>/dev/null; }
PROFILE_NAME="$(pb Name)"; PROFILE_UUID="$(pb UUID)"; PROFILE_TEAM="$(pb TeamIdentifier:0)"; PROFILE_APPID="$(pb Entitlements:application-identifier)"
[ -n "$PROFILE_NAME" ] && [ -n "$PROFILE_UUID" ] || fail "Não consegui ler o nome/UUID do perfil de provisionamento."
echo "Perfil: $PROFILE_NAME | Team ID: $PROFILE_TEAM"
EXPIRES="$(plutil -extract ExpirationDate raw -o - "$PLIST" 2>/dev/null)"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
if [ -n "$EXPIRES" ] && [[ "$EXPIRES" < "$NOW" ]]; then
  fail "O perfil de provisionamento '$PROFILE_NAME' EXPIROU em $EXPIRES. Ação: no portal da Apple, recrie o perfil (App Store, $BUNDLE_ID), baixe e atualize o secret IOS_PROVISIONING_PROFILE_B64 (docs/testflight.md)."
fi
[ "$PROFILE_TEAM" = "$APPLE_TEAM_ID" ] || fail "O Team ID do perfil ($PROFILE_TEAM) é diferente de APPLE_TEAM_ID. Ação: use um perfil do mesmo time (docs/testflight.md)."
[ "$PROFILE_APPID" = "$APPLE_TEAM_ID.$BUNDLE_ID" ] || fail "O perfil não é do app $BUNDLE_ID (application-identifier diferente). Ação: crie um perfil App Store para o App ID $BUNDLE_ID e atualize IOS_PROVISIONING_PROFILE_B64."
[ "$(pb Entitlements:get-task-allow)" = "false" ] || fail "O perfil é de DESENVOLVIMENTO (get-task-allow=true). Ação: crie um perfil de distribuição do tipo App Store."
if /usr/libexec/PlistBuddy -c 'Print :ProvisionedDevices' "$PLIST" > /dev/null 2>&1; then
  fail "O perfil tem lista de dispositivos (é de desenvolvimento ou Ad Hoc). Ação: crie um perfil de distribuição do tipo App Store."
fi
if [ "${HEALTH_INTEGRATION_ENABLED:-}" = "true" ]; then
  pb Entitlements:com.apple.developer.healthkit > /dev/null || fail "O perfil não contém HealthKit: habilite a capability HealthKit no App ID, recrie o perfil, baixe e atualize IOS_PROVISIONING_PROFILE_B64."
fi
if [ "${EXPO_PUBLIC_AUTH_ENABLED:-}" = "true" ] && [ "${FIREBASE_ENABLED:-}" = "true" ]; then
  pb Entitlements:com.apple.developer.applesignin > /dev/null || fail "O perfil não contém Sign in with Apple: habilite a capability no App ID, recrie o perfil, baixe e atualize IOS_PROVISIONING_PROFILE_B64."
fi

# --- keychain temporário
echo "SIGN_KEYCHAIN=$KEYCHAIN" >> "$GITHUB_ENV"   # registrado já: o cleanup apaga mesmo se algo abaixo falhar
security create-keychain -p "$KCPASS" "$KEYCHAIN" || fail "Não consegui criar o keychain temporário."
security set-keychain-settings -lut 21600 "$KEYCHAIN"
security unlock-keychain -p "$KCPASS" "$KEYCHAIN" || fail "Não consegui destravar o keychain temporário."
# o keychain novo entra na lista de busca (o login fica na lista) e vira o padrão
EXISTING="$(security list-keychains -d user | sed 's/"//g')"
# shellcheck disable=SC2086
security list-keychains -d user -s "$KEYCHAIN" $EXISTING > /dev/null
security default-keychain -d user -s "$KEYCHAIN"
security import "$P12" -k "$KEYCHAIN" -P "$IOS_DIST_CERT_PASSWORD" -T /usr/bin/codesign -T /usr/bin/security > /dev/null 2>&1 \
  || fail "Não consegui abrir o .p12 com a senha informada. Ação: confira IOS_DIST_CERT_PASSWORD e se o IOS_DIST_CERT_P12_B64 é o .p12 exportado com a chave privada (docs/testflight.md)."
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KCPASS" "$KEYCHAIN" > /dev/null 2>&1 \
  || fail "Não consegui liberar a chave privada para o codesign (set-key-partition-list)."

# --- identidade de DISTRIBUIÇÃO, com o certificado dentro do perfil (compara o hash; nada é impresso)
IDS="$(security find-identity -v -p codesigning "$KEYCHAIN")"
printf '%s\n' "$IDS" | grep -qE '"(Apple|iPhone) Distribution' || fail "O .p12 não contém um certificado de DISTRIBUIÇÃO com chave privada (Apple Distribution). Ação: exporte o certificado de distribuição do Keychain Access incluindo a chave privada (docs/testflight.md)."
MATCH=0
IDX=0
while CERT_B64="$(plutil -extract "DeveloperCertificates.$IDX" raw -o - "$PLIST" 2>/dev/null)"; do
  H="$(printf '%s' "$CERT_B64" | base64 --decode | shasum -a 1 | awk '{print toupper($1)}')"
  if printf '%s\n' "$IDS" | grep -q "$H"; then MATCH=1; break; fi
  IDX=$((IDX + 1))
done
[ "$MATCH" = "1" ] || fail "O certificado do .p12 NÃO está dentro do perfil de provisionamento. Ação: crie o perfil escolhendo ESTE certificado de distribuição, baixe e atualize IOS_PROVISIONING_PROFILE_B64."

# --- instala o perfil e apaga os arquivos temporários
mkdir -p "$HOME/Library/MobileDevice/Provisioning Profiles"
cp "$PROFILE_FILE" "$HOME/Library/MobileDevice/Provisioning Profiles/$PROFILE_UUID.mobileprovision"
rm -f "$P12" "$PROFILE_FILE" "$PLIST"

{
  echo "MANUAL_SIGNING=true"
  echo "SIGN_PROFILE_NAME=$PROFILE_NAME"
  echo "SIGN_PROFILE_UUID=$PROFILE_UUID"
} >> "$GITHUB_ENV"
echo "- assinatura **manual** com certificado de distribuição fixo (perfil: \`$PROFILE_NAME\`, Team ID \`$PROFILE_TEAM\`, expira em $EXPIRES)" >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
echo "Certificado e perfil importados."
