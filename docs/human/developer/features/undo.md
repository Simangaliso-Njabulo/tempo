# Undo

The pattern is the same everywhere: capture the day *before* the write, show a toast, restore on tap. One toast at a time, 6 seconds each, anchored above the tray.

```mermaid
sequenceDiagram
    participant U as User
    participant A as App.tsx
    participant SN as snapshot()
    participant S as services
    participant ST as useUndo stack
    participant TO as Toast
    U->>A: perform an action
    A->>SN: DaySnapshot - date, blocks, tasks
    A->>S: await the use case
    S-->>A: result or DomainError
    alt failed
        A-->>U: error toast, no undo entry
    else ok
        A->>ST: push {label, restore}
        A->>TO: show message with Undo action
        U->>TO: tap Undo
        TO->>A: runUndo (latest via ref)
        A->>S: restoreDay(snapshot)
        S->>S: delete blocks not in snapshot, bulkPut snapshot
        A-->>U: day is back
    end
```

```mermaid
flowchart TD
    BEFORE["snapshot() before the write"] --> CALL["await services.useCase"]
    CALL --> ERR{"DomainError?"}
    ERR -- yes --> FAIL["toast, stack unchanged"]
    ERR -- no --> PUSH["push undo entry, keep last 10"]
    PUSH --> T["single toast, 6 s"]
    T --> Q{"another toast queued?"}
    Q -- yes --> Q2["shown after the first closes"]
    Q -- no --> W["wait"]
    TAP["Undo tapped"] --> POP["pop the newest entry"]
    POP --> REST["restoreDay / restoreCloseDay / restoreCarryOver"]
    REST --> TX["one transaction restores the snapshot"]
    TX --> LIVE["liveQuery re-emits"]
```

Restore is scoped: `restoreDay` only touches blocks of the restored day, so undo never reverts work done elsewhere. Tasks in the snapshot are written back too, which also reverts the status change that came with the action.

- Files: `src/presentation/hooks/use-undo.ts`, `src/app/App.tsx` (`showUndo`, `snapshot`), `src/application/use-cases/restore-day.ts`
- Stack: `MAX_UNDO = 10`, newest last
