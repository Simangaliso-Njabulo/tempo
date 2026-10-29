# Drag

Pointer Events only — no HTML5 drag on iOS. The finger position is sampled once per animation frame; the write happens once, at pointer up.

```mermaid
sequenceDiagram
    participant F as Finger
    participant D as useDrag
    participant R as RAF flush
    participant G as Ghost
    participant A as App.tsx
    participant S as services.moveBlock
    F->>D: pointerdown on a block (capture)
    D->>D: record origin start, startY
    loop while moving
        F->>D: pointermove - store latest Y only
        D->>R: requestAnimationFrame(flush)
        R->>D: snap delta to 5 min, setState once
        D-->>G: derive ghost kind from resolvePlacement
    end
    F->>D: pointerup
    D->>D: resolvePlacement(final position)
    alt moved or rejected
        D-->>A: onCommit(blockId, result)
        A->>S: moveBlock or toast "No room for that move."
    else unchanged drop
        D-->>A: no commit, no undo entry
    end
```

```mermaid
flowchart TD
    MOVE["pointermove"] --> PEND["pendingClientY = latest Y"]
    PEND --> RQ{"a frame is already requested?"}
    RQ -- yes --> DONE["return and wait"]
    RQ -- no --> SCHED["requestAnimationFrame(flush)"]
    SCHED --> FLUSH["flush snaps the delta to 5 minutes"]
    FLUSH --> SNAP["setState once per frame"]
    SNAP --> GHOST["ghost = free | shifting | anchored | blocked"]
    GHOST --> UP["pointerup"]
    UP --> RES["resolvePlacement at the final minute"]
    RES --> COMMIT{"start changed?"}
    COMMIT -- no --> NOTHING["no commit, no undo entry"]
    COMMIT -- yes --> WRITE["services.moveBlock, one transaction"]
    WRITE --> UNDO["toast with Undo"]
    RES -- "not ok" --> BLOCKED["toast, no write"]
```

Ghost kinds: `free` (room), `shifting` (blocks move), `anchored` (snapped to the earliest allowed minute), `blocked` (no slot).

- Files: `src/presentation/hooks/use-drag.ts`, `src/domain/services/placement.ts`, `src/app/App.tsx` (`commitMove`)
- Errors: `BLOCK_NOT_FOUND`, `BLOCK_DONE`, `NO_SLOT`
- Budget: no new task over 50 ms during drag, measured in `test:perf` ([D-037](../../../design/decisions.md))
