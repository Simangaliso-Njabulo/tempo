# Loop run log

The canonical audit trail is GitHub issue and pull-request history. This file is a short index of notable runs and circuit-breaker events. It never contains issue bodies, plan data, or tokens.

| Date | Issue | Model | Result | Link |
|---|---|---|---|---|
| — | — | — | No scheduled run has happened yet. The task is not active; see `docs/loop/README.md`. | — |

## How to add a row

Add a row only after the run produces a pull request, opens the circuit breaker, or is stopped by hand. Keep one line: date, issue number, model, outcome, and the PR or issue URL.

Outcomes used in this log:

- `pr-opened` — the loop opened a pull request and left the merge decision to CI and a human.
- `auto-merged` — a `risk:low` change merged on green required checks.
- `blocked` — the circuit breaker opened `PAUSE` and a `loop:blocked` issue.
- `stopped` — a human paused the loop or the guard refused the run.

The runner writes its own local log at `.loop/last-run.log`. That file is untracked and contains timestamps, model names, and outcomes, not issue text.
