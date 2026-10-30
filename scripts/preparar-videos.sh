#!/usr/bin/env bash
# Prepara os vídeos de exercício gerados por IA para o app. Para cada .mp4 da pasta de entrada:
#   - corta para 5 segundos EXATOS (se o original for mais curto, repete o último quadro até completar 5 s);
#   - remove o áudio (-an);
#   - reduz para 720p (altura 720, largura par, proporção mantida);
#   - codifica em H.264 (yuv420p, +faststart, CRF 28, -preset veryfast);
#   - tira um poster .jpg do PRIMEIRO quadro;
#   - mostra o tamanho final e avisa se passar do alvo (600 KB).
# Requer ffmpeg e ffprobe. Não altera os originais: grava na pasta de saída.
#
# Uso:   scripts/preparar-videos.sh <pasta-de-entrada> [pasta-de-saida] [--app]
#        pasta de saída padrão: <entrada>/prontos
#   --app  usa o padrão que o app valida hoje (scripts/check-videos.mjs): quadrado 480x480 (corte central), 5 s, alvo de 400 KB;
#          se passar do alvo, tenta de novo com CRF mais alto (31, 34, 37). Sem --app vale o pedido original: 720p e alvo de 600 KB.
# O nome do arquivo de saída é o mesmo da entrada (use <id>.mp4, o id do exercício no app).
set -euo pipefail

DURACAO=5
CRF=28
APP=0
ARGS=()
for a in "$@"; do
  if [ "$a" = "--app" ]; then APP=1; else ARGS+=("$a"); fi
done
ENTRADA="${ARGS[0]:-}"
if [ -z "$ENTRADA" ] || [ ! -d "$ENTRADA" ]; then
  echo "Uso: $0 <pasta-de-entrada> [pasta-de-saida] [--app]" >&2
  exit 2
fi
SAIDA="${ARGS[1]:-$ENTRADA/prontos}"
for tool in ffmpeg ffprobe; do
  command -v "$tool" > /dev/null 2>&1 || { echo "Erro: $tool não encontrado. Instale o ffmpeg (https://ffmpeg.org)." >&2; exit 1; }
done
mkdir -p "$SAIDA"

if [ "$APP" = "1" ]; then
  FILTRO_ESCALA="crop='min(iw,ih)':'min(iw,ih)',scale=480:480"
  ALVO_KB=400
  ROTULO="480x480 (padrão do app)"
else
  FILTRO_ESCALA="scale=-2:720"
  ALVO_KB=600
  ROTULO="720p"
fi
# tpad repete o último quadro se o vídeo for mais curto que 5 s; -t 5 corta no tempo exato
FILTRO="${FILTRO_ESCALA},fps=30,tpad=stop_mode=clone:stop_duration=${DURACAO},format=yuv420p"

tamanho_kb() { echo $(( ($(wc -c < "$1") + 1023) / 1024 )); }

codificar() { # $1 entrada  $2 saída  $3 crf
  ffmpeg -hide_banner -loglevel error -y -i "$1" -t "$DURACAO" -an \
    -vf "$FILTRO" -c:v libx264 -preset veryfast -crf "$3" -pix_fmt yuv420p -movflags +faststart "$2"
}

total=0
avisos=0
shopt -s nullglob
for f in "$ENTRADA"/*.mp4; do
  nome="$(basename "$f")"
  id="${nome%.mp4}"
  destino="$SAIDA/$nome"
  poster="$SAIDA/$id.jpg"
  total=$((total + 1))
  echo "==> $nome"
  crf="$CRF"
  codificar "$f" "$destino" "$crf"
  kb="$(tamanho_kb "$destino")"
  if [ "$APP" = "1" ]; then
    for tentativa in 31 34 37; do
      [ "$kb" -le "$ALVO_KB" ] && break
      echo "    ${kb} KB acima de ${ALVO_KB} KB: tentando CRF ${tentativa}"
      crf="$tentativa"
      codificar "$f" "$destino" "$crf"
      kb="$(tamanho_kb "$destino")"
    done
  fi
  # poster = primeiro quadro (JPEG de verdade)
  ffmpeg -hide_banner -loglevel error -y -i "$destino" -frames:v 1 -q:v 4 "$poster"
  dur="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$destino")"
  printf '    %s: %s KB, %ss, %s, CRF %s, poster %s (%s KB)\n' "$ROTULO" "$kb" "$dur" "H.264 sem áudio" "$crf" "$id.jpg" "$(tamanho_kb "$poster")"
  if [ "$kb" -gt "$ALVO_KB" ]; then
    echo "    AVISO: acima do alvo de ${ALVO_KB} KB. Gere um clipe com menos movimento de fundo ou aumente o CRF."
    avisos=$((avisos + 1))
  fi
done

if [ "$total" -eq 0 ]; then
  echo "Nenhum .mp4 em $ENTRADA" >&2
  exit 1
fi
echo "Pronto: $total vídeo(s) em $SAIDA ($avisos acima do alvo de ${ALVO_KB} KB)."
[ "$avisos" -eq 0 ] || exit 3
