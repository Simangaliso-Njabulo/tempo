# Routines

A routine is a template; a block is one occurrence. Skipping writes a per-date exception, never edits the routine.

```mermaid
sequenceDiagram
    participant U as User
    participant T as Tray
    participant A as App.tsx
    participant S as services
    participant D as Domain
    participant DB as stores
    U->>T: tap "Place" on a routine
    T->>A: onPlaceRoutine(routine)
    A->>S: placeRoutine({routineId, date, minStartMin})
    S->>DB: get routine, listByDate exceptions
    S->>D: isRoutineDue - active, weekday, not skipped
    alt not due
        D-->>A: ROUTINE_NOT_DUE
        A-->>U: toast
    else already on the timeline
        D-->>A: ROUTINE_ALREADY_PLACED
        A-->>U: toast
    else due
        S->>D: resolvePlacement(draft)
        S->>UOW: one transaction on blocks
        UOW-->>S: block written
        A-->>U: "Placed at 08:30."
    end
```

```mermaid
flowchart TD
    TAP["Place or Skip"] --> DUE{"place?"}
    DUE -- yes --> Q1{"active and weekday?"}
    Q1 -- no --> E1["ROUTINE_NOT_DUE"]
    Q1 -- yes --> Q2{"exception exists for this date?"}
    Q2 -- yes --> E1
    Q2 -- no --> Q3{"already placed today?"}
    Q3 -- yes --> E2["ROUTINE_ALREADY_PLACED"]
    Q3 -- no --> PL["resolvePlacement, writes block with routineId"]
    PL --> TX["blocks transaction, shifts others if needed"]
    DUE -- no --> SKIP{"exception already exists?"}
    SKIP -- yes --> ID["return it, idempotent"]
    SKIP -- no --> EX["exceptions.put type skip"]
    EX --> NEXT["routine no longer due that day"]
```

Anchored routines (`routine.anchor`) are protected from later reflows. Deleting a routine also deletes its blocks and exceptions in one transaction.

- Files: `src/domain/services/routine-occurrence.ts`, `src/application/use-cases/place-routine.ts`, `skip-routine.ts`, `delete-routine.ts`
- Errors: `ROUTINE_NOT_FOUND`, `ROUTINE_NOT_DUE`, `ROUTINE_ALREADY_PLACED`, `NO_SLOT`
