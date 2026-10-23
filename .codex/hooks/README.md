# Codex hook scripts

Store project hook scripts here when a documented workflow needs lifecycle automation. Register a script in `.codex/hooks.json` or `.codex/config.toml`, resolve its path from the Git root so it works when Codex starts in a subdirectory, and keep it safe to run repeatedly. Project hooks require the repository to be trusted and the hook definition to be reviewed in Codex.

No hooks are currently configured. Avoid adding hooks that merely duplicate editor formatting or existing package scripts.
