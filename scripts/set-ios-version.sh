#!/usr/bin/env bash
# Grava a versão e o build number no Info.plist do projeto iOS gerado pelo "expo prebuild".
#
# Por quê: o Expo escreve CFBundleShortVersionString e CFBundleVersion no Info.plist com os valores
# LITERAIS do app.json (ios.buildNumber = "1"); o Info.plist não referencia $(MARKETING_VERSION) nem
# $(CURRENT_PROJECT_VERSION). Passar MARKETING_VERSION/CURRENT_PROJECT_VERSION ao xcodebuild, então,
# não muda nada, e o build saía com CFBundleVersion 1 em vez do run_number. Editar o Info.plist
# gerado (sem tocar no app.json versionado) resolve.
#
# Uso: scripts/set-ios-version.sh <Info.plist> <versão, ex 1.0.0> <build number, ex 3>
# Usa o PlistBuddy do macOS (/usr/libexec/PlistBuddy). Para os testes, PLISTBUDDY aponta para outro binário.
set -euo pipefail

PLIST="${1:-}"
VERSION="${2:-}"
BUILD="${3:-}"
PB="${PLISTBUDDY:-/usr/libexec/PlistBuddy}"

err() { echo "::error::$1"; }

if [ -z "$PLIST" ] || [ -z "$VERSION" ] || [ -z "$BUILD" ]; then
  err "Uso: set-ios-version.sh <Info.plist> <versão> <build number>."
  exit 2
fi
if [ ! -f "$PLIST" ]; then
  err "Info.plist não encontrado em $PLIST. Esperado: ios/<NomeDoProjeto>/Info.plist gerado pelo expo prebuild."
  exit 1
fi
# O App Store Connect só aceita versão numérica com até 3 partes e build number numérico.
if ! [[ "$VERSION" =~ ^[0-9]+(\.[0-9]+){0,2}$ ]]; then
  err "Versão inválida para o iOS: '$VERSION'. Esperado: números separados por ponto (ex.: 1.0.0)."
  exit 1
fi
if ! [[ "$BUILD" =~ ^[0-9]+$ ]]; then
  err "Build number inválido: '$BUILD'. Esperado: um inteiro (o run_number do workflow)."
  exit 1
fi

set_key() {
  local key="$1" value="$2" current
  if ! current="$("$PB" -c "Print :$key" "$PLIST" 2>/dev/null)"; then
    err "A chave $key não existe em $PLIST. Esperado: o Info.plist do Expo já traz essa chave."
    exit 1
  fi
  if ! "$PB" -c "Set :$key $value" "$PLIST" > /dev/null; then
    err "Não consegui gravar $key em $PLIST."
    exit 1
  fi
  local after
  after="$("$PB" -c "Print :$key" "$PLIST")"
  if [ "$after" != "$value" ]; then
    err "Depois de gravar, $key está '$after' em $PLIST (esperado '$value')."
    exit 1
  fi
  echo "Info.plist: $key  $current -> $after"
}

set_key CFBundleShortVersionString "$VERSION"
set_key CFBundleVersion "$BUILD"
