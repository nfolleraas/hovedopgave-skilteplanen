#!/usr/bin/env bash
set -Eeuo pipefail

# Resolve paths from this script so it works regardless of the caller's cwd.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
CODEX_HOME="${CODEX_HOME:-${HOME}/.codex}"

cd "$REPO_ROOT"

echo "Preparing Codex home at $CODEX_HOME"
sudo chown -R "$(id -u):$(id -g)" "$CODEX_HOME"

echo "Configuring Zsh"
bash "$SCRIPT_DIR/setup-zsh.sh"

echo "Installing workspace dependencies"
bun install
