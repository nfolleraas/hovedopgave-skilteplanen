#!/usr/bin/env bash
set -Eeuo pipefail

# Resolve paths from this script so it works regardless of the caller's cwd.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_ROOT"

if [[ ! -f .devcontainer/.env ]]; then
  echo "Error: .devcontainer/.env file is required to start the devcontainer." >&2
  exit 1
fi

docker compose -f .devcontainer/compose.yaml down --remove-orphans
