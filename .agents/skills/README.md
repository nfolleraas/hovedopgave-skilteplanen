# Repository skills

Put reusable, repository-specific agent workflows in this directory. Each skill lives in its own directory and starts with a `SKILL.md` file containing YAML front matter (`name` and `description`) followed by concise instructions. Add scripts, references, or assets only when the workflow needs them.

Keep skills focused on a repeatable task, such as a project-specific release or database migration workflow. General repository rules belong in the root `AGENTS.md`; do not duplicate them here. Codex and other Agent Skills-compatible tools can discover skills from `.agents/skills/`.

See [the Agent Skills standard](https://agentskills.io/) and [Codex skills documentation](https://developers.openai.com/codex/skills/).

## Available skills

| Skill | Use it for |
| --- | --- |
| [`commit`](commit/SKILL.md) | Stage one logical change and create a Conventional Commit after reviewing the repository rules and diff. Invoke it when you ask to commit; it does not push or rewrite history. |
| [`grilling`](grilling/SKILL.md) | Stress-test a plan or decision through rounds of questions. It maps decisions as a tree and waits for your answers before proceeding. |
| [`grill-me`](grill-me/SKILL.md) | Explicitly start the `grilling` skill. Use this when you want a deliberate, user-invoked design interview. |
| [`handoff`](handoff/SKILL.md) | Write a concise handoff for another agent in the system temporary directory, including useful context and suggested skills. |
| [`wait-what`](wait-what/SKILL.md) | Ask for the last explanation to be re-pitched in Simplified Technical English with the project's glossary terms. |

Call a skill by name when you want it. `grill-me`, `handoff`, and `wait-what` are explicitly invoked skills and do not run automatically.
