FROM mcr.microsoft.com/devcontainers/typescript-node:22-bookworm

RUN mkdir -p \
    /home/node/.vscode-server/data/agent-host/sdk-cache \
  && chown -R node:node /home/node/.vscode-server

RUN apt-get update \
  && apt-get install --yes --no-install-recommends ripgrep \
  && rm -rf /var/lib/apt/lists/*
