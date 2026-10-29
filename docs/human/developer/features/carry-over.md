# Carry over

Midnight is quiet: unfinished work moves to tomorrow's backlog as an `inbox` task with a *Carried over* badge. Nothing is auto-scheduled.

```mermaid
sequenceDiagram
    participant R as useNow / mount
    participant A as App.tsx
    participant S as services.carryOver
    participant D as planCarryOver (domain)
    participant UOW as UnitOfWork
    participant DB as tasks, blocks, meta
    R->>A: date rolled over, or app opened
    A->>S: carryOver(today)
    S->>DB: read lastActiveDate, all tasks and blocks
    alt first run or same day
        S->>UOW: record lastActiveDate only
        S-->>A: nothing carried
    else today is after lastActiveDate
        S->>D: planCarryOver({today, tasks, blocks})
        D-->>S: deleteBlockIds, taskUpdates, carriedTaskIds
        S->>UOW: one transaction on tasks, blocks, meta
        UOW-->>S: committed, undo record kept
        S-->>A: result
        A-->>U: "N tasks carried over." + Undo
    end
```

```mermaid
flowchart TD
    OPEN["app opens or midnight passes"] --> GUARD{"lastActiveDate"}
    GUARD -- "missing or same day" --> META["record the date, stop"]
    GUARD -- "an earlier day" --> SEL["past blocks, planned, task or focus, has taskId"]
    SEL --> NONE{"any?"}
    NONE -- no --> META
    NONE -- yes --> DEL["delete those past blocks"]
    DEL --> FUT{"the task has a block today or later?"}
    FUT -- yes --> KEEP["task stays planned, carriedFrom cleared"]
    FUT -- no --> CARRY["task to inbox with carriedFrom"]
    KEEP --> TX["one transaction: blocks, tasks, meta"]
    CARRY --> TX
    TX --> UNDO["undo record kept for the toast"]
    META --> LQ["liveQuery shows tomorrow backlog"]
```

The `today < lastActiveDate` check makes a backwards clock or a repeated call a no-op — the same block is never carried twice.

- Files: `src/domain/services/carry-over.ts`, `src/application/use-cases/carry-over.ts`, `restore-carry-over.ts`, `src/presentation/hooks/use-midnight.ts`
- The view advances only after every sheet is closed (`useMidnight` holds the pending advance in a ref)
