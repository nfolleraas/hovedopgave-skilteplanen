#!/usr/bin/env bash
set -Eeuo pipefail

# Resolve paths from this script so it works regardless of the caller's cwd.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
CODEX_HOME="${CODEX_HOME:-${HOME}/.codex}"
CODEX_SDK_CACHE_DIR="${HOME}/.vscode-server/data/agent-host/sdk-cache"
CLAUDE_HOME_DIR="${HOME}/.claude"

cd "$REPO_ROOT"

echo "Preparing workspace volumes"
WORKSPACE_VOLUME_DIRS=(
  "$REPO_ROOT/node_modules"
  "$REPO_ROOT/apps/api/node_modules"
  "$REPO_ROOT/apps/web/node_modules"
)
sudo mkdir -p "${WORKSPACE_VOLUME_DIRS[@]}"
sudo chown "$(id -u):$(id -g)" "${WORKSPACE_VOLUME_DIRS[@]}"

echo "Preparing Codex volumes"
sudo mkdir -p "$CODEX_HOME" "$CODEX_SDK_CACHE_DIR"
sudo chown -R "$(id -u):$(id -g)" "$CODEX_HOME"
sudo chown "$(id -u):$(id -g)" "$CODEX_SDK_CACHE_DIR"

echo "Preparing Claude volumes"
sudo mkdir -p "$CLAUDE_HOME_DIR"
sudo chown "$(id -u):$(id -g)" "$CLAUDE_HOME_DIR"

CODEX_CONFIG="$CODEX_HOME/config.toml"
if [[ ! -e "$CODEX_CONFIG" ]]; then
  echo "Seeding Codex permission defaults"
  cp "$REPO_ROOT/.codex/config.toml" "$CODEX_CONFIG"
fi

echo "Configuring Zsh"
bash "$SCRIPT_DIR/setup-zsh.sh"

echo "Installing workspace dependencies"
# New dependency volumes are empty and owned by root; Bun runs as remoteUser.
sudo chown "$(id -u):$(id -g)" \
  "$REPO_ROOT/node_modules" \
  "$REPO_ROOT/apps/api/node_modules" \
  "$REPO_ROOT/apps/web/node_modules"
bun install
