# Loop operations

- Scheduler: Windows Task Scheduler, `TEMPO low-risk loop`.
- Cadence: every 3 hours inside the 08:00–22:00 window (08:00, 11:00, 14:00, 17:00, 20:00 local). A run that overruns is not restarted.
- One issue per run; one open `loop:pr` at a time.
- `PAUSE` is checked before every run.
- A local lock prevents overlapping runs.
- The loop refuses to run if the working tree is dirty, `main` is behind, CI on `main` is not green, or a deploy is in progress.
- Auto-merge: `risk:low` only, only on green required checks, only for non-manual runs.
- Manual runs never auto-merge.
- The circuit breaker opens after 3 consecutive failures and writes `PAUSE`.
- The loop token is least-privilege and lives in the user environment, never in the repository.
- The loop never edits workflows, loop scripts, branch protection, release configuration, dependencies, the spec, the plans, or `AGENTS.md`.

## Activation gate

The scheduled task is not registered until all of the following are true:

- The repository has an `origin` remote on GitHub.
- `main` is green in the required-check workflow.
- The five `security-*` checks exist and pass.
- Branch protection requires all fourteen checks.
- `GH_TOKEN` is set for the loop user with the least-privilege scopes.
- A manual `-DryRun` selects exactly one approved issue.

Run the preflight:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/loop/install-scheduled-task.ps1
```

Run the dry run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/loop/run.ps1 -DryRun
```

Only then register the task with `-Activate`.

## Dedicated user

The task runs as the signed-in user in this version. A dedicated low-privilege Windows user is a human setup step; record it in `docs/security/agent-threat-model.md` before enabling unattended runs on a shared machine.

## Pause and recovery

- Create `PAUSE` to stop the next run.
- The circuit breaker writes `PAUSE` and opens a `loop:blocked` issue after three consecutive failures.
- A human fixes the cause, deletes `PAUSE`, and resets `.loop/state.json` before resuming.
- `.loop/` and `PAUSE` are untracked; they never appear in a commit.
