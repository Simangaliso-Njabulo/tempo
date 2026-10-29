# TEMPO developer docs

Five-minute tour. Then follow the index.

TEMPO is an offline-first daily planner. One React app, one local IndexedDB database, no server. The day is a vertical timeline; the user brain-dumps, then places blocks by hand.

```mermaid
flowchart TB
    UI["Presentation - React components and hooks"] --> APP["Application - use cases"]
    APP --> DOM["Domain - pure rules, no React, no Dexie"]
    INF["Infrastructure - Dexie, files, browser APIs"] --> APP
    W["src/app/container.ts wires all three"] -.-> UI
    W -.-> APP
    W -.-> INF
```

**The one path every feature follows:**

```mermaid
sequenceDiagram
    participant U as User
    participant A as App.tsx
    participant S as services
    participant D as Domain
    participant DB as Dexie
    U->>A: tap or drag
    A->>A: snapshot() the day for undo
    A->>S: call one use case
    S->>D: resolve the rule
    S->>DB: one transaction, commits
    DB-->>A: live query re-emits
    A-->>U: toast with Undo
```

Rule of thumb: the domain decides *what is allowed*, the use case decides *write order*, Dexie stores *the result*, `App.tsx` decides *what the user sees*.

## Index

| Page | Answers |
|---|---|
| [Architecture](architecture.md) | How are the layers wired, and what happens at boot? |
| [Data model](data-model.md) | What is stored, keyed how, and how does a day get read? |
| [CI](ci.md) | What runs on every push, and how do I run it locally? |
| [Security](security.md) | What is trusted, what is not, which gate checks it? |
| [Release](release.md) | How does a commit become the live Pages site? |
| [Loop](loop.md) | What may the AI loop change on its own? |
| [Features](features/README.md) | How does each feature move data? |

Detailed prose lives in [docs/ARCHITECTURE.md](../../ARCHITECTURE.md), [docs/operations/ci.md](../../operations/ci.md), and [docs/TESTING.md](../../TESTING.md). This track is the map; those are the reference.
