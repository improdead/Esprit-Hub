#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_ENV_FILE="$ROOT_DIR/client/.env.local"

log() {
  printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

install_deps() {
  local dir="$1"
  log "Installing dependencies in $dir …"
  if command -v yarn >/dev/null 2>&1; then
    if (cd "$dir" && yarn install >/dev/null); then
      return 0
    else
      log "yarn install failed in $dir — falling back to npm install"
    fi
  else
    log "yarn not found — using npm install"
  fi
  (cd "$dir" && npm install >/dev/null)
}

maybe_install() {
  local dir="$1"
  if [[ "${SKIP_INSTALL:-0}" == "1" ]]; then
    log "Skipping dependency installation in $dir (SKIP_INSTALL=1)"
    return 0
  fi
  install_deps "$dir"
}

maybe_install "$ROOT_DIR"
maybe_install "$ROOT_DIR/client"

ensure_client_env() {
  local default_url="${VITE_STUDIO_URL:-http://localhost:8080/studio/}"
  if [[ ! -f "$CLIENT_ENV_FILE" ]]; then
    log "Creating client/.env.local with default Studio URL ($default_url)"
    printf 'VITE_STUDIO_URL=%s\n' "$default_url" > "$CLIENT_ENV_FILE"
  elif ! grep -q 'VITE_STUDIO_URL' "$CLIENT_ENV_FILE"; then
    log "Adding VITE_STUDIO_URL to existing client/.env.local"
    printf '\nVITE_STUDIO_URL=%s\n' "$default_url" >> "$CLIENT_ENV_FILE"
  else
    log "Found client/.env.local (using existing VITE_STUDIO_URL)"
  fi
}

ensure_client_env

cleanup() {
  log "Shutting down Esprit-Hub processes"
  [[ -n "${SERVER_PID:-}" ]] && kill "$SERVER_PID" 2>/dev/null || true
  [[ -n "${CLIENT_PID:-}" ]] && kill "$CLIENT_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

start_cmd() {
  local dir="$1"; shift
  local script="$1"; shift || true
  if command -v yarn >/dev/null 2>&1; then
    (cd "$dir" && yarn "$script")
  else
    (cd "$dir" && npm run "$script")
  fi
}

log "Starting Colyseus server on port 2567…"
(start_cmd "$ROOT_DIR" start) &
SERVER_PID=$!

log "Starting Vite client on port 5173…"
(start_cmd "$ROOT_DIR/client" dev) &
CLIENT_PID=$!

log "Server PID: $SERVER_PID | Client PID: $CLIENT_PID"
log "Open http://localhost:5173 to use the app (monitor at http://localhost:2567/colyseus). Press Ctrl+C to stop."

wait
