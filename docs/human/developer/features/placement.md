# Placement

Placing a task asks the domain for a legal slot. Blocks after the target are pushed later; anchors and finished blocks never move.

```mermaid
sequenceDiagram
    participant U as User
    participant A as App.tsx
    participant P as services.placeTask
    participant D as resolvePlacement
    participant UOW as UnitOfWork
    participant DB as blocks and tasks
    U->>A: drop a tray task at 14:00
    A->>A: snapshot() for undo
    A->>P: placeTask({taskId, date, startMin, minStartMin})
    P->>DB: get task, listByDate
    P->>D: resolvePlacement(draft + day blocks)
    D-->>P: movingStartMin + changes
    alt no room
        P-->>A: DomainError NO_SLOT
        A-->>U: "No room for that move."
    else ok
        P->>UOW: run(tasks, blocks)
        UOW->>DB: bulkPut shifted blocks, task status planned
        UOW-->>P: committed
        P-->>A: {blockId, startMin, changes}
        A-->>U: toast + Undo
    end
```

```mermaid
flowchart TD
    IN["target start, rounded up to 5 min"] --> OB["obstacles = anchors + done blocks + everything before the target"]
    OB --> FIT{"target fits?"}
    FIT -- yes --> SLOT["use it"]
    FIT -- no --> SEARCH["search 5-min steps, drag direction first"]
    SEARCH --> SLOT
    SLOT --> SHIFT["for each later block, find the earliest free start"]
    SHIFT --> OK{"all shifted?"}
    OK -- no --> NS["NO_SLOT - nothing written"]
    OK -- yes --> TX["one transaction writes every changed block"]
    TX --> TASK["task status becomes planned"]
```

`minStartMin` is the current minute for today, so nothing can be dragged into the past.

- Files: `src/domain/services/placement.ts`, `src/application/use-cases/place-task.ts`, `src/app/App.tsx` (`commitPlace`)
- Errors: `TASK_NOT_FOUND`, `TASK_ARCHIVED`, `NO_SLOT`, `INVALID_INPUT`
