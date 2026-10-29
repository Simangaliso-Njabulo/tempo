# Architecture

Four layers, one direction of import. `eslint-plugin-boundaries` fails the build if a relative import crosses a layer the wrong way.

## Layers

```mermaid
flowchart LR
    subgraph P["presentation - src/presentation"]
        C["components, hooks, CSS modules"]
    end
    subgraph A["application - src/application"]
        UC["use cases, ports"]
    end
    subgraph D["domain - src/domain"]
        R["entities, values, services, DomainError"]
    end
    subgraph I["infrastructure - src/infrastructure"]
        X["Dexie, backup, .ics, clock, share"]
    end
    C --> UC
    X --> UC
    X --> R
    UC --> R
```

- `domain` imports nothing outward. Pure TypeScript, testable without a browser.
- `application` imports ports, never Dexie or React. It owns write order.
- `infrastructure` implements the ports.
- `presentation` renders and calls `services` only.
- `src/app` wires everything once.

## Boot

```mermaid
sequenceDiagram
    participant M as main.tsx
    participant Ap as App.tsx
    participant C as container.ts
    participant P as Providers
    participant S as Screen
    M->>Ap: createRoot().render(App)
    Ap->>C: createContainer() once per app
    C-->>Ap: AppServices object
    Ap->>P: Providers services
    Ap->>P: ToastProvider
    P->>S: render Screen
    S->>S: useDayPlan(date) starts liveQuery
    S-->>S: requestPersistence, carryOver on mount
```

`createContainer()` ([src/app/container.ts](../../../src/app/container.ts)) builds one `TempoDb`, one `DexieUnitOfWork`, six repositories, the clock, and 27 service functions. Nothing else in the app constructs an adapter.

## What App.tsx owns

`src/app/App.tsx` is the only screen. It holds:

| State | Meaning |
|---|---|
| `date` | which day is on screen |
| `sheet` | `add` / `routine` / `close` / `settings` / `data` / null |
| `selectedBlockId`, `selectedTaskId` | open detail sheets |
| `reflowChanges` | pending reflow preview |
| undo stack (`useUndo`) | last 10 reversible actions |

Everything else is derived from `plan`, the live day snapshot.

## Decision path for one action

```mermaid
flowchart TD
    E["event in App.tsx"] --> SN["snapshot() - the before state"]
    SN --> CALL["await services.useCase(input)"]
    CALL --> D{"domain rule"}
    D -- "allowed" --> TX["one UnitOfWork transaction"]
    D -- "refused" --> ERR["DomainError - toast, no write"]
    TX --> LIVE["liveQuery re-emits"]
    LIVE --> UI["timeline re-renders"]
    SN --> TOAST["toast with Undo"]
    TOAST -- "tapped" --> REST["services.restoreDay(snapshot)"]
```

Errors never write: validation happens before `uow.run()`. See [features/undo](features/undo.md).

## Files to read first

- `src/app/App.tsx` — every feature's entry point
- `src/app/container.ts` — what is wired to what
- `src/application/services.ts` — the full service surface
- `docs/reference/source-map.md` — which source governs which area
