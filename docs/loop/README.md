# TEMPO loop

The loop is a maintainer tool. It is not shipped to users.

## Status

The runner and installer exist, but the scheduled task is **not active**. Activation requires a pushed repository, `GH_TOKEN`, green CI, the security checks, and branch protection. Until then the runner exits with an error and schedules nothing.

## Preflight

```powershell
powershell -ExecutionPolicy Bypass -File scripts/loop/install-scheduled-task.ps1
```

This checks the remote, `GH_TOKEN`, `gh`, and `opencode`. It never schedules anything.

## Activate

Only after the repository is pushed and `main` is green:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/loop/install-scheduled-task.ps1 -Activate
```

The task runs at 08:00, 11:00, 14:00, 17:00, and 20:00 local time as the current user. A dedicated low-privilege Windows user is a human setup step; see `docs/security/agent-threat-model.md`.

## Pause

Create `PAUSE` at the repository root. The next run exits without work. Delete it to resume.

```powershell
New-Item -ItemType File -Path PAUSE
Remove-Item PAUSE
```

The circuit breaker also writes `PAUSE` after three consecutive failures.

## Circuit breaker

`.loop/state.json` counts consecutive failures. At 3, the loop creates a `loop:blocked` issue and writes `PAUSE`. A human fixes the cause, deletes `PAUSE`, and sets `consecutiveFailures` to `0` (or deletes the state file).

## Manual run

```powershell
powershell -ExecutionPolicy Bypass -File scripts/loop/run.ps1 -Manual
```

A manual run opens a PR but never auto-merges.

## Dry run

```powershell
powershell -ExecutionPolicy Bypass -File scripts/loop/run.ps1 -DryRun
```

A dry run selects and prints the issue, then exits without a branch, model call, or PR.

## Model ladder

The runner tries free models in descending capability:

1. `opencode/deepseek-v4.1-flash-free`
2. `opencode/glm-5.3-flash-free`
3. `opencode/mimo-v2.6-flash-free`
4. `opencode/flint-40b-free`
5. `ollama/qwen2.5-coder:7b`, only if Ollama is installed

On a quota, rate limit, timeout, crash, or empty diff, it resets the working tree and tries the next model once. It never retries the same model in a run, never uses a paid fallback, and stops after five attempts.

## What the loop may touch

Only the issue. It may not touch workflows, loop scripts, security policy, branch protection, release configuration, dependencies, the spec, the plans, or `AGENTS.md`. It may not delete or weaken tests. The runner checks the changed files, the line count, the deleted tests, and the issue body after the model runs.

## Logs

`.loop/last-run.log` is local and untracked. It contains timestamps, model names, and outcomes, not issue bodies. GitHub issue and PR history is the audit trail.

## Token

`GH_TOKEN` is a fine-grained token in the loop user's environment. Minimum permissions: read issues, write issues/comments, write contents for branches, write pull requests, read metadata. No workflow, actions, secrets, or administration permission.
