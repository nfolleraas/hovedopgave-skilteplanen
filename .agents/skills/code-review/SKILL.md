---
name: code-review
description: Run the repository's branch coding-convention review when the user types /code-review or invokes $code-review, optionally followed by a base branch.
argument-hint: '[base branch, e.g. origin/Staging]'
user-invocable: true
---

# Code review

Read and follow [review-branch-conventions](../review-branch-conventions/SKILL.md).
Treat a branch supplied after `/code-review` or `$code-review` as the base branch
for that workflow. For example, `/code-review origin/Staging` reviews committed
branch changes against staging. Keep the review read-only.
