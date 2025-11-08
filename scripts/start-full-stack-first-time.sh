#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[INFO] Running full first-time setup (installs + Docker stack)"
SKIP_INSTALL=0 exec "$ROOT_DIR/scripts/start-full-stack.sh"
