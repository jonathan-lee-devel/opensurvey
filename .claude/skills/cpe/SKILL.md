---
name: cpe
description: Check, push, everything — runs the full local CI gate (api lint, unit, e2e, build; web unit, build) and, only if all pass, commits all changes and pushes to the currently checked-out branch. Use when the user invokes /cpe or says "run checks and push", "commit and push if green", "ship it".
---

# cpe — check, then commit and push

Gate local changes behind the same checks CI runs, then commit and push.
Never commit or push if any check fails.

## Workflow

1. **Inspect state**
   - `git status --porcelain` and `git log --oneline @{u}..HEAD 2>/dev/null`.
   - If the tree is clean and nothing is unpushed, say so and stop.
   - Note the branch: `git branch --show-current`. If detached, stop and ask.

2. **Run the checks** — one command, fail-fast, mirrors `.github/workflows/ci.yml`:
   ```bash
   bash .claude/skills/cpe/scripts/check.sh
   ```
   Needs Docker running (api e2e uses Testcontainers). Allow ~5 min; use a
   long Bash timeout. If it fails, show the failing step's output, do **not**
   commit or push, and stop. Do not "fix" the failure unless the user asks.

3. **Stage everything** — `git add -A`, then `git status --short`.
   - If a staged file looks like a secret (`.env`, `*.pem`, `*.key`,
     `credentials*`, tokens), unstage it and ask before continuing.
   - Build/dependency artifacts (`dist/`, `node_modules/`) should already be
     ignored; if they appear, stop and ask rather than committing them.

4. **Commit** with a message derived from the diff, matching repo style:
   imperative mood, capitalised, no trailing period, ~50–72 chars, e.g.
   `Add logo to top of README`. If the diff spans several unrelated concerns,
   still make one commit (the user asked for *everything*) but summarise in the
   subject and list the concerns in the body. End with the attribution
   trailer required by the session (`Co-Authored-By: ...`) when one is given.
   If `git log @{u}..HEAD` already had unpushed commits and there is nothing
   new to commit, skip this step.

5. **Push** to the current branch only: `git push -u origin HEAD`.
   - Never `--force`. If rejected as non-fast-forward, report it and stop;
     let the user decide whether to rebase.

6. **Report** in a few lines: which checks ran, the commit hash and subject,
   and the branch pushed. If anything was skipped, say what and why.

## Notes

- The script lives in this repo so it stays in sync with CI; when
  `ci.yml` gains a step, add the matching line to `scripts/check.sh`.
- `check.sh` always runs both packages even if only one changed. Keep it that
  way: it is the local equivalent of a green CI run.
