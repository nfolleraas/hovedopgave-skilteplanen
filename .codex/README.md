# Codex project files

This directory is reserved for project-scoped Codex configuration. Codex loads `.codex/config.toml` and project hooks only when the repository is trusted. Keep settings here limited to behavior that should apply to every contributor using Codex; personal preferences belong in the user's `~/.codex/config.toml`.

The devcontainer seeds a new mounted Codex home from `config.toml` when no user
config exists, so new containers default to manual approval for changes. Existing
Codex home settings are preserved.

Hook scripts belong in `hooks/`. Register them in `.codex/hooks.json` or inline in `config.toml`, but use only one hook configuration format per project. Hooks run commands and require review/trust in Codex, so add them only for a useful, documented workflow. There are no hooks configured yet.

See [Codex configuration](https://developers.openai.com/codex/config-advanced/) and [hooks](https://learn.chatgpt.com/docs/hooks).
