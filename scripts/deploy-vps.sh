#!/usr/bin/env bash
# Deploy Little Royals on a VPS — fully Dockerized (no Railway / Vercel).
#
#   cp .env.docker.example .env.docker
#   cp backend/.env.example backend/.env
#   # edit secrets + domains
#   ./scripts/deploy-vps.sh
#
# Optional TURN: TURN=1 ./scripts/deploy-vps.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_DOCKER="${ENV_DOCKER:-$ROOT/.env.docker}"
ENV_API="${ENV_API:-$ROOT/backend/.env}"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing dependency: $1" >&2
    exit 1
  }
}

need docker
docker compose version >/dev/null 2>&1 || {
  echo "Docker Compose v2 required (docker compose …)" >&2
  exit 1
}

[[ -f "$ENV_API" ]] || {
  echo "missing $ENV_API — cp backend/.env.example backend/.env && edit JWT_SECRET" >&2
  exit 1
}

if [[ ! -f "$ENV_DOCKER" ]]; then
  cp "$ROOT/.env.docker.example" "$ENV_DOCKER"
  echo "Created $ENV_DOCKER — set SCHOOL_DB_PASSWORD, CORS_ORIGINS, then re-run" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
# shellcheck source=/dev/null
source "$ENV_DOCKER" 2>/dev/null || true
set +a

if [[ -z "${SCHOOL_DB_PASSWORD:-}" || "$SCHOOL_DB_PASSWORD" == "change-me-school-db" ]]; then
  echo "Set a real SCHOOL_DB_PASSWORD in $ENV_DOCKER" >&2
  exit 1
fi

PROFILES=()
if [[ "${TURN:-0}" == "1" ]]; then
  PROFILES+=(--profile turn)
fi

echo "==> Building & starting containers…"
docker compose \
  --env-file "$ENV_DOCKER" \
  --env-file "$ENV_API" \
  "${PROFILES[@]}" \
  up -d --build --remove-orphans

echo "==> Waiting for API health…"
WEB_PORT="${WEB_HTTP_PORT:-8080}"
API_PORT="${API_HTTP_PORT:-18080}"
ok=0
for _ in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1 \
    || curl -fsS "http://127.0.0.1:${WEB_PORT}/health" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 2
done

echo
docker compose --env-file "$ENV_DOCKER" --env-file "$ENV_API" ps
echo
if [[ "$ok" -eq 1 ]]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " VPS deploy ready (Docker)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " Desk:   http://SERVER:${WEB_PORT}"
  echo " API:    http://SERVER:${API_PORT}"
  echo " Health: http://SERVER:${WEB_PORT}/health"
  echo " Cloud:  /school-cloud"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
  echo "Containers started but health check timed out — check: docker compose logs -f api" >&2
  exit 1
fi
