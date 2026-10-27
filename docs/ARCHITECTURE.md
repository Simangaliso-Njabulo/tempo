# Architecture

TEMPO is a single-page React application with one local database. It is built as a set of layers with a strict dependency direction, so the domain rules can be tested without a browser and storage can be replaced without touching the UI.

The approved implementation contract is [`docs/superpowers/specs/2026-10-25-tempo-design.md`](superpowers/specs/2026-10-25-tempo-design.md). This page describes what exists in the code today; the spec remains the authority.

```text
app (composition root)
├─ presentation  → application → domain
├─ infrastructure → application / domain
└─ domain        (no imports outward)
```

Boundaries are enforced by `eslint-plugin-boundaries` in `eslint.config.js`. A relative import that crosses a layer fails lint and therefore CI.

## Layers

### `src/domain`

Pure TypeScript. No React, Dexie, DOM, clock, or storage import.

- `entities/` — `Task`, `Block`, `Routine`, `RoutineException`, `Settings`, `MetaRecord`, plus the constructors that stamp IDs and timestamps.
- `values/` — `LocalDate` (`YYYY-MM-DD`) and minute-of-day integers. All date math is local and explicit; there is no UTC conversion in the app.
- `services/` — overlap and placement resolution, reflow shifts, carry-over selection, routine occurrence, task status, and the error type.
- `errors.ts` — `DomainError` with a stable code and a user-safe message.

The domain owns every rule that decides what a plan means. If a rule needs a clock or a database to test, it belongs in application, not here.

### `src/application`

Use cases and the ports they depend on. No Dexie, no React, no browser API.

- `ports/` — repository, unit-of-work, clock, day-plan reader, backup, share, calendar export, storage, reset, and meta interfaces.
- `use-cases/` — one file per action: add/place/move/resize/complete/delete a block, add task, routines, reflow preview and apply, close day, carry-over, restore, settings, import/export, and `.ics`.
- `services.ts` — the composed service interface the app consumes: `addTask`, `placeTask`, `moveBlock`, `dayPlan.read`, `closeDay`, `backup`, and so on.

Use cases record the write order that keeps a plan consistent (block plus task status plus routine exception), and they never read `window`, `document`, or a concrete database.

### `src/infrastructure`

Concrete adapters for the ports.

- `db/tempo-db.ts` — one Dexie schema (`tempo`), version 1, with indexes for day and start time.
- `db/unit-of-work.ts` — runs a multi-store write in one Dexie transaction.
- `db/dexie-reset-gateway.ts` — clears every store for "Reset all data".
- `repositories/` — Dexie-backed repository per aggregate and `dexie-day-plan-reader.ts`, which returns a consistent day snapshot.
- `export/` — backup shape validation (`backup-file.ts`), plain and encrypted codecs (`backup-codec.ts`, `encrypted-backup.ts`), the backup gateway, and the `.ics` writer.
- `platform/` — share, storage persistence, and standalone detection.
- `time/system-clock.ts` — the only place that reads the system clock.

The import path treats the file as untrusted: parse, validate every field, reject the whole file on the first error, and never partially write.

### `src/presentation`

React components, hooks, and CSS Modules.

- `components/` — `AppShell`, `Header`, `DateNav`, `Timeline`, `Block`, `DragGhost`, `NowLine`, `HourGrid`, `Tray`, `AddSheet`, `TaskDetail`, `TaskSheet`, `CloseDay`, `ReflowPreview`, `Settings`, `ImportExport`, `RoutineEditor`, `InstallCard`, `Toast`, `UpdateToast`, `Sheet`.
- `hooks/` — `useDayPlan` (live query), `useNow`, `useMidnight`, `useDrag`, `useTrayDrag`, `useOverrun`, `useReminder`, `useTheme`, `useInstall`, `useVisualViewport`, `useUndo`.
- `styles/` — tokens, global styles, and the boot theme.
- `utils/` — time formatting, storage formatting, and timeline geometry (88 px/hour, lanes).

The UI does not call Dexie. It calls `services` from `useServices()`.

### `src/app`

The composition root.

- `container.ts` builds the database, repositories, gateways, clock, and services once per app.
- `providers.tsx` provides services and the toast.
- `App.tsx` is the screen: it owns the selected date, the open sheet, the undo entry, the drag state, and the reflow preview, and wires the components to services.

`src/main.tsx` mounts the app and registers the service worker.

## Data flow

```text
Dexie (tempo)
  → dexie-day-plan-reader (one day snapshot)
  → useDayPlan (dexie-react-hooks liveQuery)
  → App.tsx (selected date, sheet, drag, reflow)
  → Timeline / Tray / sheets
  → user action
  → services use case
  → UnitOfWork transaction
  → live query re-emits
```

A write is visible after the transaction commits. The live query re-renders the day, and the undo entry stores the prior snapshot so one tap restores it.

## Storage

- Database name: `tempo`.
- Stores: `tasks`, `blocks`, `routines`, `routineExceptions`, `settings`, `meta`.
- Keys: local date `YYYY-MM-DD` on blocks, minute-of-day integers for start and duration.
- Migrations live in `src/infrastructure/db/migrations.ts`. A schema change needs a new Dexie version, a migration test, and human review.
- There is no backend, sync, or remote cache.

## Service worker and offline

`vite-plugin-pwa` generates Workbox precaching with `registerType: 'prompt'`. The app never auto-reloads. `UpdateToast` is the only global overlay that can appear without a user action, and it stays hidden while a field has focus or a sheet is open.

The production build ships a strict CSP meta tag injected at build time, no inline script, no third-party origin, and no remote font. `npm run check:pwa` validates the manifest, icons, and worker output.

## Test layers

| Level | Location | What it proves |
|---|---|---|
| Domain unit | `src/domain/**/*.test.ts` | Date math, placement, reflow, carry-over, routine occurrence. Runs against `vitest.domain.config.ts` with a 95% threshold. |
| Unit and component | `src/application/**`, `src/infrastructure/**`, `src/presentation/**` | Use-case ordering, validation, encryption, `.ics`, component behavior, focus and keyboard handling. |
| Integration | `src/app/App.integration.test.tsx`, `src/presentation/components/ImportExport.integration.test.tsx` | The real container and Dexie against `fake-indexeddb`: add, place, undo, complete, resize, move, delete, theme, install gate, close day, reset, encrypted round-trip. |
| Journey e2e | `tests/e2e/*.spec.ts` | The built app in WebKit (iPhone) and Chromium (Pixel): first run, reflow, carry-over, backup, security, offline, performance, visual, a11y. |

See [TESTING.md](TESTING.md) for commands, thresholds, and the manual checklist.

## Security boundaries

- Untrusted: imported JSON, `.ics` output consumers, storage reads, URLs, model output, issue text.
- Trusted: the compiled app shell and its own assets.
- The app holds no secret. The CSP allows same-origin scripts, styles, fonts, images (`data:` only), connections, and workers.
- `scripts/security/check-policy.mjs` inspects the built artifact, the workflows, and the source for dynamic HTML, `eval`, `new Function`, `innerHTML`, `document.write`, third-party `fetch`, inline script or style, unpinned actions, and secrets.

## References

- [Design contract](design/feel-contract.md)
- [Stack notes](reference/stack.md)
- [PWA notes](reference/pwa.md)
- [Security program](security/README.md)
- [Source map](reference/source-map.md)
- [Testing](TESTING.md)
