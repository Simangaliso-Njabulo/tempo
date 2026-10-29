# Reflow

When a block runs past its end, the rest of the day shifts later. The domain computes it, the user approves it, one transaction applies it.

```mermaid
sequenceDiagram
    participant N as useNow
    participant O as useOverrun
    participant A as App.tsx
    participant P as services.previewReflow
    participant D as previewReflow (domain)
    participant U as User
    participant AP as services.applyReflow
    N->>O: nowMin changes
    O->>O: blockEnd(block) < nowMin and a later block exists
    O->>A: onOverrun(blockId), once per block
    A->>P: previewReflow({date, overrunBlockId, nowMin})
    P->>D: compute BlockShift[]
    D-->>A: noop | preview | blocked
    alt reflowAutoApply is on
        A->>AP: applyReflow(changes)
        A-->>U: "Day adjusted." + Undo
    else preview mode
        A-->>U: ReflowPreview "N blocks move"
        U->>AP: Apply
        AP-->>U: undoable
        U->>A: Dismiss, nothing written
    end
```

```mermaid
flowchart TD
    NOW["nowMin passes a block end"] --> OVR["useOverrun fires once"]
    OVR --> PR["previewReflow - domain"]
    PR --> K{"result"}
    K -- "noop - already clear or no blocks after" --> STOP["nothing shown"]
    K -- "blocked - no slot or past midnight" --> STOP
    K -- preview --> AUTO{"reflowAutoApply?"}
    AUTO -- yes --> AP["applyReflow"]
    AUTO -- no --> SH["ReflowPreview sheet"]
    SH -- Apply --> AP
    SH -- Dismiss --> NONE["nothing written"]
    AP --> VAL["re-read the day, validate every change"]
    VAL --> STALE["stale change or overlap - INVALID_INPUT, keep old data"]
    VAL --> TX["blocks bulkPut in one transaction"]
    TX --> LQ["liveQuery re-emits"]
```

Validation in `applyReflow` runs twice: each change must match the block's current `startMin`/`durationMin` (a stale preview cannot overwrite newer data), then the **finished** day is checked for overlaps.

Anchored and `done` blocks are never shifted; a block can never cross midnight.

- Files: `src/presentation/hooks/use-overrun.ts`, `src/domain/services/reflow.ts`, `src/application/use-cases/preview-reflow.ts`, `apply-reflow.ts`
- Errors: `INVALID_INPUT` (stale), `BLOCK_OVERLAP`, `BLOCK_NOT_FOUND`, `BLOCK_DONE`
