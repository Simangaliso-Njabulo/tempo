# Brain dump

The tray's quick-add turns a title into an `inbox` task. Nothing is placed yet — placement is a separate act ([Placement](placement.md)).

```mermaid
sequenceDiagram
    participant U as User
    participant T as Tray or AddSheet
    participant A as App.tsx
    participant S as services.addTask
    participant D as Domain
    participant DB as tasks store
    U->>T: type a title, press add
    T->>A: onAddTask(title)
    A->>S: addTask({title})
    S->>S: trim, length check
    alt empty or over 200 chars
        S->>D: throw DomainError
        D-->>A: EMPTY_TITLE / TITLE_TOO_LONG
        A-->>U: toast, no write
    else ok
        S->>DB: put(task) status inbox
        DB-->>S: committed
        S-->>A: Task
        A-->>U: task appears in the tray
    end
```

```mermaid
flowchart TD
    IN["typed title"] --> TRIM["trim()"]
    TRIM --> EMPTY{"empty?"}
    EMPTY -- yes --> E1["EMPTY_TITLE"]
    EMPTY -- no --> LONG{"longer than 200?"}
    LONG -- yes --> E2["TITLE_TOO_LONG"]
    LONG -- no --> MAKE["createTask - id from crypto.randomUUID, status inbox"]
    MAKE --> PUT["tasks.put"]
    PUT --> LQ["liveQuery re-emits"]
    LQ --> TRAY["Tray re-renders, task listed first"]
```

The AddSheet's task tab does both steps: `addTask` then `placeTask`, so one undo entry covers the pair.

- Files: `src/application/use-cases/add-task.ts`, `src/presentation/components/Tray.tsx`, `src/app/App.tsx` (`addTaskFromSheet`)
- Errors: `EMPTY_TITLE`, `TITLE_TOO_LONG`
