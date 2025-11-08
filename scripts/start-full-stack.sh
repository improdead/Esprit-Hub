#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ESPRIT_DIR="$ROOT_DIR/esprit"
ENV_FILE="$ESPRIT_DIR/.env"
COMPOSE_FILE="$ESPRIT_DIR/infra/docker-compose.yml"

log() {
  printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log "Error: required command '$cmd' not found"
    exit 1
  fi
}

update_env_var() {
  local key="$1"
  local value="$2"
  python3 - "$key" "$value" "$ENV_FILE" <<'PY'
import pathlib
import sys

key, value, path = sys.argv[1], sys.argv[2], pathlib.Path(sys.argv[3])
lines = path.read_text().splitlines() if path.exists() else []
for idx, line in enumerate(lines):
    if line.startswith(f"{key}="):
        lines[idx] = f"{key}={value}"
        break
else:
    lines.append(f"{key}={value}")
path.write_text("\n".join(lines) + ("\n" if lines else ""))
PY
}

ensure_env_file() {
  if [[ ! -f "$ENV_FILE" ]]; then
    log "Creating esprit/.env from example"
    cp "$ESPRIT_DIR/.env.example" "$ENV_FILE"
  else
    log "Found esprit/.env (leaving existing values)"
  fi
}

ensure_secret_var() {
  local key="$1"
  local current=""
  if [[ -f "$ENV_FILE" ]] && grep -q "^${key}=" "$ENV_FILE"; then
    current="$(grep "^${key}=" "$ENV_FILE" | head -n1 | cut -d= -f2-)"
  fi

  if [[ -z "$current" || "$current" == change-me* ]]; then
    local new_value
    new_value="$(openssl rand -hex 32)"
    update_env_var "$key" "$new_value"
    log "Generated new ${key}"
  else
    log "${key} already set"
  fi
}

start_docker_stack() {
  log "Checking Docker Desktop status"
  if ! docker info >/dev/null 2>&1; then
    log "Error: Docker does not appear to be running. Start Docker Desktop and retry."
    exit 1
  fi

  ensure_env_file
  ensure_secret_var BETTER_AUTH_SECRET
  ensure_secret_var ENCRYPTION_KEY

  log "Building and starting Docker stack (Sim.ai + Gateway + proxy)"
  (cd "$ESPRIT_DIR" && docker compose -f "$COMPOSE_FILE" up -d --build)

  log "Current container status"
  (cd "$ESPRIT_DIR" && docker compose -f "$COMPOSE_FILE" ps)
}

main() {
  require_cmd docker
  require_cmd python3
  require_cmd openssl

  start_docker_stack

  local skip="${SKIP_INSTALL:-1}"
  if [[ "$skip" == "1" ]]; then
    log "Starting game server/client without reinstalling dependencies"
  else
    log "Starting game server/client with dependency installation"
  fi

  SKIP_INSTALL="$skip" exec "$ROOT_DIR/scripts/run-all.sh"
}

main "$@"
