#!/usr/bin/env bash
set -Eeuo pipefail

CODEX_INSTALL_DIR="${CODEX_INSTALL_DIR:-${HOME}/.local/bin}"
export CODEX_INSTALL_DIR

mkdir -p "$CODEX_INSTALL_DIR"

if command -v codex >/dev/null 2>&1; then
  echo "Codex is already installed: $(command -v codex)"
  exit 0
fi

echo "Installing the Codex runtime for the VS Code integrated chat"
curl -fsSL https://chatgpt.com/codex/install.sh | CODEX_NON_INTERACTIVE=1 sh

if [[ ! -x "$CODEX_INSTALL_DIR/codex" ]]; then
  echo "Codex installation did not create $CODEX_INSTALL_DIR/codex" >&2
  exit 1
fi

echo "Codex installed at $CODEX_INSTALL_DIR/codex"
