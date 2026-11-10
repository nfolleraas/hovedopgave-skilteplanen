FROM mcr.microsoft.com/devcontainers/typescript-node:22-bookworm

RUN apt-get update \
  && apt-get install --yes --no-install-recommends ripgrep \
  && rm -rf /var/lib/apt/lists/*
