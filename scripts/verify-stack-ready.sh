#!/usr/bin/env bash
set -euo pipefail

# This script verifies that the Docker stack is fully ready and healthy
# It should be run after starting the full stack

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ESPRIT_DIR="$ROOT_DIR/esprit"
COMPOSE_FILE="$ESPRIT_DIR/infra/docker-compose.yml"

log() {
  printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

check_service_health() {
  local service="$1"
  local max_attempts=30
  local attempt=1
  
  log "Waiting for $service to be healthy (max ${max_attempts}s)..."
  
  while [ $attempt -le $max_attempts ]; do
    if (cd "$ESPRIT_DIR" && docker compose -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep -q "healthy"); then
      log "✓ $service is healthy"
      return 0
    fi
    
    if (cd "$ESPRIT_DIR" && docker compose -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep -q "Exited"); then
      log "✗ $service exited with error"
      (cd "$ESPRIT_DIR" && docker compose -f "$COMPOSE_FILE" logs "$service" | tail -20)
      return 1
    fi
    
    sleep 1
    attempt=$((attempt + 1))
  done
  
  log "✗ $service did not become healthy within ${max_attempts}s"
  return 1
}

check_endpoint() {
  local url="$1"
  local max_attempts=10
  local attempt=1
  
  log "Checking endpoint: $url"
  
  while [ $attempt -le $max_attempts ]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      log "✓ Endpoint $url is responding"
      return 0
    fi
    
    sleep 1
    attempt=$((attempt + 1))
  done
  
  log "✗ Endpoint $url did not respond within ${max_attempts}s"
  return 1
}

main() {
  log "===== Stack Health Check ====="
  log "Verifying all services are healthy..."
  
  # Check critical services
  check_service_health "postgres" || exit 1
  check_service_health "sim" || exit 1
  check_service_health "sim-realtime" || exit 1
  
  # Check endpoints
  check_endpoint "http://localhost:8080/api/auth/sso/providers" || exit 1
  
  log ""
  log "✓ All services are healthy and ready!"
  log ""
  log "Access your application at:"
  log "  - Sim.ai Studio: http://localhost:8080/studio/"
  log "  - Game Client: http://localhost:5173"
  log "  - Colyseus Monitor: http://localhost:2567/colyseus"
  log ""
}

main "$@"

