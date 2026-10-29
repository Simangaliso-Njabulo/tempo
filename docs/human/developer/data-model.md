# Data model

One Dexie database named `tempo`, six stores, no backend. Everything is a local date plus minute-of-day integers; there is no UTC conversion anywhere in the app.

## What relates to what

```mermaid
erDiagram
    Task ||--o{ Block : "placed on days"
    Routine ||--o{ Block : "spawns an occurrence"
    Routine ||--o{ RoutineException : "skipped by"
    Block }o--o| Task : "taskId optional"
    Block }o--o| Routine : "routineId optional"
    Task {
        string id PK
        string title
        string status "inbox | planned | done | archived"
        string carriedFrom "nullable local date"
        number updatedAt
    }
    Block {
        string id PK
        string date "YYYY-MM-DD"
        number startMin "minute of day"
        number durationMin
        string kind "task | focus | routine | break"
        string status "planned | done"
        boolean anchor "protected from reflow"
    }
    Routine {
        string id PK
        string title
        number daysOfWeek "0 = Sunday"
        number preferredStartMin
        boolean active
        boolean anchor
    }
    RoutineException {
        string id PK
        string routineId FK
        string date
        string type "skip"
    }
```

## Stores and indexes

Defined once in [src/infrastructure/db/tempo-db.ts](../../../src/infrastructure/db/tempo-db.ts), version 1.

| Store | Key | Indexes | Written by |
|---|---|---|---|
| `tasks` | `id` | `status`, `carriedFrom`, `sortOrder`, `updatedAt` | add/place/complete/close/carry-over |
| `blocks` | `id` | `date`, `[date+startMin]`, `taskId`, `routineId`, `status`, `updatedAt` | every timeline action |
| `routines` | `id` | `active`, `updatedAt` | routine editor |
| `routineExceptions` | `id` | `[routineId+date]`, `routineId`, `date` | skip routine |
| `settings` | `id` (`app`) | — | settings sheet |
| `meta` | `key` | — | carry-over, backup |

`meta` holds only four keys: `lastActiveDate`, `realPlanDates`, `lastBackupAt`, `backupReminderSnoozedUntil`. Export filters to exactly that allowlist.

## Reading a day

```mermaid
sequenceDiagram
    participant T as Timeline
    participant H as useDayPlan
    participant R as DexieDayPlanReader
    participant DB as tempo database
    T->>H: render for date
    H->>R: dayPlan.read(date)
    R->>DB: blocks by [date+startMin], tasks, routines, exceptions
    DB-->>R: one consistent snapshot
    R-->>H: DaySnapshot
    H-->>T: blocks, tasks, settings, meta
    Note over DB,T: Dexie liveQuery re-runs this after every commit
```

## Read path as a graph

```mermaid
flowchart TD
    DB[(tempo)] --> Q["blocks.where date = day"]
    DB --> QT["tasks"]
    DB --> QR["routines and exceptions"]
    Q --> SORT["sort by startMin"]
    SORT --> SNAP["DaySnapshot"]
    QT --> SNAP
    QR --> SNAP
    SNAP --> LIVE["liveQuery subscription"]
    LIVE --> APP["App.tsx re-renders"]
```

## Writes

Every multi-store change runs inside `DexieUnitOfWork.run(stores, fn)` — one IndexedDB transaction, all or nothing. A single-store write calls the repository directly.

A schema change needs a new Dexie version, a migration test in `src/infrastructure/db/migrations.ts`, and human review.
