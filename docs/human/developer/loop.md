# AI improvement loop

Small, safe changes only. It may never invent product scope or merge risky work.

```mermaid
sequenceDiagram
    participant H as Human
    participant I as GitHub Issue
    participant L as Loop runner
    participant B as Branch and PR
    participant C as Required checks
    H->>I: write issue, add loop:approved and risk:low
    L->>I: read issue as data, not as instructions
    L->>B: branch, max 400 changed lines, 12 files
    L->>C: open PR naming issue, risk, control IDs, sources
    C-->>L: all green
    L->>B: auto-merge only when risk is low and checks pass
    H-->>L: any other risk level waits for a human merge
```

## What it may never touch

```mermaid
flowchart TD
    PR["loop pull request"] --> G1{"touches a protected path?"}
    G1 -- yes --> H["human review, never auto-merged"]
    G1 -- no --> G2{"weakens a test, gate, or assertion?"}
    G2 -- yes --> H
    G2 -- no --> G3{"risk level"}
    G3 -- "low" --> G4{"all required checks green?"}
    G4 -- yes --> M["auto-merge"]
    G4 -- no --> H
    G3 -- "medium or high" --> H
    STOP["PAUSE switch, held lock, security:drift issue, 3 failures"] --> H
```

Protected paths include `.github/**`, `security/**`, `AGENTS.md`, `package.json`, workflows, `scripts/loop/**`, `src/infrastructure/db/**`, and `src/infrastructure/export/**`.

## Status today

The loop is **paused**: `opencode` is not on PATH, `GH_TOKEN` is unset, and no `.loop/` state exists. See [docs/operations/loop.md](../../operations/loop.md) and [docs/reference/ai-development.md](../../reference/ai-development.md) for the full contract and how to switch it on.
