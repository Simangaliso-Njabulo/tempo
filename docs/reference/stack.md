# Stack notes

The stack is chosen for a local-first, installable iOS PWA that must stay small, testable, and understandable.

## Core stack

| Layer | Choice | Why | Source |
|---|---|---|---|
| UI | React 19 + TypeScript | Mature component model, strong typing, good local-state ergonomics. | [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/docs/) |
| Build | Vite | Fast local feedback and a small production bundle. | [Vite](https://vite.dev/guide/) |
| Persistence | Dexie over IndexedDB | Local-only storage with transactions, indexes, and migrations. | [Dexie](https://dexie.org/docs/) |
| Reactive data | `dexie-react-hooks` | Keeps local queries live without a server cache. | [dexie-react-hooks](https://dexie.org/docs/libs/dexie-react-hooks) |
| Styling | CSS Modules + token registry | Scoped styles, no runtime CSS-in-JS, one source of design tokens. | [CSS Modules](https://github.com/css-modules/css-modules) |
| PWA | `vite-plugin-pwa` / Workbox | Precaching and offline shell with a maintained service-worker path. | [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/), [Workbox](https://developer.chrome.com/docs/workbox) |
| Unit tests | Vitest | Fast, Vite-native unit and domain tests. | [Vitest](https://vitest.dev/guide/) |
| Component tests | Testing Library | Behavior-focused React tests. | [Testing Library](https://testing-library.com/docs/react-testing-library/intro/) |
| E2E | Playwright WebKit | The closest automated proxy for Safari behavior. | [Playwright](https://playwright.dev/docs/intro) |
| Accessibility | axe-core | Automated serious/critical checks. | [axe-core](https://github.com/dequelabs/axe-core) |
| Performance | Lighthouse | Budget checks for performance, accessibility, and best practices. | [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview) |
| Font | Geist Sans | Modern minimalist grotesque with excellent numerals; self-hosted subset, system fallback. | [Geist](https://vercel.com/font), [Fontsource](https://fontsource.org/fonts/geist) |
| Layer boundaries | `eslint-plugin-boundaries` | Enforces the domain/application/infrastructure/presentation split. | [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries) |

## Architecture

```text
app (composition root)
├─ presentation  → application → domain
├─ infrastructure → application / domain
└─ domain        (no imports outward)
```

- `domain`: pure types and rules. Tasks, blocks, routines, reflow, carry-over, date/time math. No React, Dexie, DOM, or platform APIs.
- `application`: use cases and orchestration. Depends on domain types and ports; does not know Dexie or React.
- `infrastructure`: Dexie repositories, clock, `.ics` export, storage persistence, import/export.
- `presentation`: React components, hooks, CSS Modules, pointer interaction.
- `app`: composition root and wiring.

Rules:

- One public entry point per layer.
- No cross-layer imports that skip a layer.
- Domain code is deterministic and testable without a browser.
- Time is injected through a clock port so tests can control midnight and DST.
- Storage is behind repository ports so the domain never sees Dexie.

## Data model

- `Task` — the thing to do, independent of when it is scheduled.
- `Block` — a placed interval on a day; references a task or routine.
- `Routine` — a recurring template with a preferred time and anchor behavior.
- `RoutineException` — a skip, move, or override for one occurrence.
- `Settings` — theme, time format, reminders, install state, loop pause.
- `Meta` — schema version, last backup, migration state.

Dates are local `YYYY-MM-DD` keys. Times are minute-of-day integers. Display formatting follows locale and the user’s 12/24-hour setting.

## Testing

| Level | Scope |
|---|---|
| Domain unit | Reflow, anchor protection, carry-over, midnight, DST, overlap detection, undo grouping. Target ≥95%. |
| Application | Use-case orchestration with in-memory ports. |
| Infrastructure | Dexie repositories, migrations, import/export, `.ics` generation. |
| Component | Tray, timeline, block, sheet, install card, undo toast. |
| E2E | First run, plan, drag, reflow, undo, day close, carry-over, offline reload, import/export. |
| Accessibility | axe on key screens; manual VoiceOver and keyboard passes. |
| Visual | Dark/light, empty/planned, sheet, reflow preview, carried-over tray. |
| Performance | Drag trace, INP, long tasks, Lighthouse. |

## Quality gates

- Domain coverage ≥95%; overall ≥80%.
- axe: zero serious or critical.
- Lighthouse mobile: Performance ≥95, Accessibility 100, Best Practices 100.
- JS ≤180 KB gzipped.
- CSS ≤30 KB gzipped.
- UI + display font ≤40 KB, one variable font, Latin subset.
- CLS ≤0.02.
- Initial DOM ≤1,500 nodes.
- No long task >50 ms during drag; INP p75 ≤200 ms.
- Offline reload from the Home Screen app passes.
- Dark/light visual regression passes.

## Dependency policy

- Prefer platform APIs and small, focused libraries.
- No runtime dependency without a recorded decision and a bundle-size check.
- No analytics, tracking, remote-config, or A/B testing SDKs.
- No UI component library that would override the token system.
- No state-management library until local React state and Dexie hooks demonstrably fail.
- No date library until the date requirements are clear; if added, it must be tree-shakeable and timezone-safe.
- No drag-and-drop library for the iOS timeline until Pointer Events prove insufficient.
- Dependencies are human-reviewed. The autonomous loop must not upgrade them.

## Font notes

- Family: Geist Sans (SIL OFL 1.1).
- Self-host one variable font, Latin subset, preloaded.
- `font-display: swap`; metrics-matched fallback.
- System fallback: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif`.
- Use `font-variant-numeric: tabular-nums` on times, durations, and counts.
- Keep inputs at 17 px minimum to avoid iOS focus zoom.
- No icon font; inline SVG sprite only.

## Open choices

- Date library or hand-rolled local-date helpers.
- `.ics` generation: hand-rolled minimal writer or a small RFC 5545 library.
- Dexie schema versioning and migration strategy.
- Whether `vite-plugin-pwa` is enough or a custom service worker is needed for the iOS shell.
- Exact font subsetting pipeline.
- Whether visual regression uses Playwright screenshots only or a dedicated diff service.

Record the choice in the decision log before adding the dependency.

## Sources

- [React](https://react.dev/), [Vite](https://vite.dev/guide/), [TypeScript](https://www.typescriptlang.org/docs/)
- [Dexie](https://dexie.org/docs/), [dexie-react-hooks](https://dexie.org/docs/libs/dexie-react-hooks)
- [CSS Modules](https://github.com/css-modules/css-modules)
- [Vitest](https://vitest.dev/guide/), [Playwright](https://playwright.dev/docs/intro), [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [axe-core](https://github.com/dequelabs/axe-core), [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview)
- [Workbox](https://developer.chrome.com/docs/workbox), [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/)
- [Geist](https://vercel.com/font), [Fontsource Geist](https://fontsource.org/fonts/geist)
- [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries)
