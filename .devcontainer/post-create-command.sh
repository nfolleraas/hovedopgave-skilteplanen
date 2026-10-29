#!/usr/bin/env bash
set -Eeuo pipefail

# Resolve paths from this script so it works regardless of the caller's cwd.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
CODEX_HOME="${CODEX_HOME:-${HOME}/.codex}"

cd "$REPO_ROOT"

echo "Installing Codex runtime"
bash "$SCRIPT_DIR/ensure-codex.sh"

echo "Preparing Codex home at $CODEX_HOME"
sudo chown -R "$(id -u):$(id -g)" "$CODEX_HOME"

CODEX_CONFIG="$CODEX_HOME/config.toml"
if [[ ! -e "$CODEX_CONFIG" ]]; then
  echo "Seeding Codex permission defaults"
  cp "$REPO_ROOT/.codex/config.toml" "$CODEX_CONFIG"
fi

echo "Configuring Zsh"
bash "$SCRIPT_DIR/setup-zsh.sh"

echo "Installing workspace dependencies"
bun install
