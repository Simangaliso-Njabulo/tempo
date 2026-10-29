# Close day

After 18:00 the header offers **Close day**. The user walks each unfinished task: keep it for tomorrow, or let it go.

```mermaid
sequenceDiagram
    participant U as User
    participant A as App.tsx
    participant S as services.closeDay
    participant UOW as UnitOfWork
    participant DB as tasks and blocks
    participant UN as useUndo
    U->>A: open CloseDay (today, after 18:00)
    A->>S: closeDay({date, taskId, action keep or let-go})
    S->>S: only today or a past day
    S->>DB: task, blocks for the date
    S->>UOW: one transaction on tasks and blocks
    UOW->>DB: delete this day unfinished task/focus blocks
    alt let-go
        UOW->>DB: also delete future blocks, task status archived
    else keep
        UOW->>DB: task to inbox with carriedFrom, or planned if a future block remains
    end
    UOW-->>S: committed, undo record captured
    S-->>A: result
    A->>UN: push undo
    A-->>U: toast with Undo
```

```mermaid
flowchart TD
    OPEN["Close day sheet"] --> FAN["for each unfinished task"]
    FAN --> LET{"action"}
    LET -- "keep" --> DEL1["delete today unfinished task blocks"]
    LET -- "let-go" --> DEL2["delete today blocks and future blocks"]
    DEL1 --> FUT{"a future planned block remains?"}
    FUT -- yes --> PL1["task stays planned"]
    FUT -- no --> IN["task to inbox, carriedFrom = date"]
    DEL2 --> ARC["task archived"]
    DEL1 --> TX["single transaction, all or nothing"]
    DEL2 --> TX
    PL1 --> TX
    IN --> TX
    ARC --> TX
    TX --> UN["undo record: task plus deleted blocks"]
    UN --> TOAST["toast with Undo"]
```

Routines and breaks are not movable work, so their blocks are never deleted here. Blocks on **future** days are untouched unless the user chose *let go*.

- Files: `src/application/use-cases/close-day.ts`, `restore-close-day.ts`, `src/presentation/components/CloseDay.tsx`
- Errors: `INVALID_INPUT` (a future date cannot be closed), `TASK_NOT_FOUND`
