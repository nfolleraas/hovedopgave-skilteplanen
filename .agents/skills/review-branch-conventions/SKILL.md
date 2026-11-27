---
name: review-branch-conventions
description: Review committed branch changes against the repository coding conventions. Use when asked for a branch convention review or when the user types /review-branch-conventions, optionally followed by a base branch. Report required fixes without modifying files.
---

Review the current branch. Treat a branch supplied after
`/review-branch-conventions` or `$review-branch-conventions` as the base branch.
For example, `/review-branch-conventions origin/Staging` compares against staging.

# Review branch conventions

Perform a read-only review. Use the language of the request for findings and preserve the document's original rule identifiers and headings.

## Establish the comparison

1. Use the requested branch or PR head, defaulting to HEAD. Use an explicitly provided base, then the PR target if known, then the remote default branch. If the base cannot be determined, ask for it. Resolve both refs to commits and compute their merge base. Use those snapshots throughout, excluding local uncommitted edits.
2. Enumerate every changed path with `git diff --name-status -z -M "$merge_base" "$head"` and inspect the corresponding diff and branch-side files. Include additions, renames, and deletions. Read other files only as context for a changed file. Anchor a deletion finding to its old path and label the line as belonging to the base.
3. Read the convention document specified by the user, or locate the tracked document named `coding-convention` in the branch snapshot. Match case-insensitively and allow filename extensions such as .md, .docx, or .pdf. Extract headings, numbering and table contents when relevant. If the document is missing, ambiguous, or unreadable, ask for the path or contents before issuing a verdict.

## Identify required changes

Check every changed file against every applicable requirement, including file-wide rules and obligations triggered by a rename or removal. Report violations introduced or made worse by this branch. Compare against the merge base to distinguish existing issues. Respect documented exceptions and distinguish requirements from optional advice. Cite an actual point for every finding. For unnumbered rules, use the heading and a short distinctive excerpt. Never invent a rule number.

Assign priority by the concrete impact of leaving the violation in place. Follow explicit severity guidance in the document when present.

- **P1 — High.** A violation with a demonstrated serious consequence, such as a broken build, data loss, or an authorization failure.
- **P2 — Medium.** A violation with a material but bounded effect on behavior, testing, or maintenance.
- **P3 — Low.** A localized consistency issue, such as naming or formatting, with little behavioral impact.

## Return the review

Return a numbered list of all required fixes, sorted by priority (P1 first), then file and line. Use one item per independent fix. Group identical violations only when the same fix applies and every affected location is listed.

1. **[P#] Brief action title** — `path/to/file:line`
   - **Problem** — Describe the specific code and its consequence.
   - **Convention** — Cite the document path, rule number or heading, and the relevant requirement.
   - **Required change** — State the smallest concrete correction that satisfies the rule.

If the comparison is empty, say “No files changed against the selected base.” If the review is complete with zero findings, say “No coding-convention violations found in the branch changes.” If anything in scope could not be assessed, identify the affected paths and reason alongside any confirmed findings. Never present an incomplete review as clean.
