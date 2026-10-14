#!/usr/bin/env bash
# Testa o backend com curl.
#
#   BASE_URL=http://localhost:3000 APP_KEY=sua-chave ./scripts/test.sh
#   BASE_URL=https://seu-projeto.vercel.app APP_KEY=sua-chave ./scripts/test.sh
#
# O chat gasta tokens de verdade (poucos). Para testar só a saúde: ./scripts/test.sh health
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
APP_KEY="${APP_KEY:?defina APP_KEY (mesmo valor configurado no backend)}"

echo "== GET /api/health"
curl -sS -i "$BASE_URL/api/health"
echo; echo

if [ "${1:-}" = "health" ]; then exit 0; fi

echo "== POST /api/ia/chat sem chave (esperado: 401)"
curl -sS -o /dev/null -w "HTTP %{http_code}\n" -X POST "$BASE_URL/api/ia/chat" \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"Oi"}],"profile":{"combo":"duo"}}'
echo

echo "== POST /api/ia/chat com corpo inválido (esperado: 400)"
curl -sS -w "\nHTTP %{http_code}\n" -X POST "$BASE_URL/api/ia/chat" \
  -H 'content-type: application/json' -H "x-app-key: $APP_KEY" \
  -d '{"messages":[],"profile":{"combo":"duo"}}'
echo

echo "== POST /api/ia/chat (streaming SSE; -N desliga o buffer do curl)"
echo "   Esperado: eventos 'delta' com o texto da IA e 'done' no fim."
curl -sS -N -X POST "$BASE_URL/api/ia/chat" \
  -H 'content-type: application/json' -H "x-app-key: $APP_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Oi! Quero montar meu treino."}],
    "profile": {"combo": "duo", "limitation": "none", "level": "beginner", "ageGroup": "26-35", "gender": "male"}
  }'
echo; echo

echo "== Conversa completa até o plano (evento 'plan')"
echo "   Esperado: eventos 'delta' e, no fim, 'plan' com as séries A/B/C (ids de exercício)."
curl -sS -N -X POST "$BASE_URL/api/ia/chat" \
  -H 'content-type: application/json' -H "x-app-key: $APP_KEY" \
  -d '{
    "messages": [
      {"role": "user", "content": "Oi! Quero montar meu treino."},
      {"role": "assistant", "content": "Olá! Sou o personal da Duo Fitness. Qual é o seu peso e a sua altura?"},
      {"role": "user", "content": "78 kg e 175 cm. Quero ganhar massa, treino 3 dias por semana, 45 minutos por sessão."}
    ],
    "profile": {"combo": "duo", "limitation": "none", "level": "beginner", "ageGroup": "26-35", "gender": "male"}
  }'
echo
