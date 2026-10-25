# TEMPO

TEMPO is a calm, offline-first daily planner for iPhone. Brain-dump first, then drag tasks onto a vertical timeline. Plan the day in under 60 seconds — and let the plan survive slippage.

**Status:** design phase. No app code yet. The design package is awaiting approval; implementation starts only after the spec and plan are approved.

## Source of truth

Read in this order:

1. **Approved product spec** — `docs/superpowers/specs/` (pending approval)
2. **Design contract** — `docs/design/feel-contract.md`
3. **Decision log** — `docs/design/decisions.md`
4. **Reference library** — `docs/reference/README.md`
5. **Implementation plan** — `docs/superpowers/plans/` (pending approval)

If a change conflicts with a higher layer, stop and record a decision instead of silently diverging from the agreed direction.

## Design package

- [Feel contract](docs/design/feel-contract.md) — research digest, visual system, feel contract, accessibility, performance, iOS/PWA rules, and acceptance criteria.
- [Feel board](docs/design/feel-board.html) — a browser-based visual study of the dark and light phone views, timeline blocks, reflow preview, and scoped sheet. It is a design study, not production UI.
- [Decision log](docs/design/decisions.md) — the bridge between the conversation and the final spec. Every settled or proposed decision gets an ID.
- [Design index](docs/design/README.md) — what is in the design folder and what is still pending.

## Reference library

The canonical index is [docs/reference/README.md](docs/reference/README.md). It keeps the Apple Human Interface Guidelines, PWA and Safari documentation, UI/UX and accessibility sources, AI-development and automation docs, and stack documentation in one place.

The short rule: **build from the references, cite them in the change, and update the decision log when the references and the product disagree.**

## Current direction

- Installable iOS PWA; no paid Apple Developer account, App Store, or native wrapper.
- Local-only data in IndexedDB; no accounts, backend, sync, push, or analytics.
- Timeline-first planning: brain dump → task tray → vertical timeline.
- Tasks, recurring routines, focus blocks, and breaks. No calendar events or notes in v1.
- Manual placement after the brain dump; no auto-scheduler.
- Auto-reflow after slippage with preview and undo; anchored routines and breaks are protected.
- Unfinished blocks carry over at midnight with a quiet “Carried over” badge; no auto-scheduling.
- Dark “Midnight & royal” and light “Porcelain” themes; follow iOS by default with a System / Dark / Light switch.
- React 19 + Vite + TypeScript + Dexie + CSS Modules + the token registry adapted from the budgeting app.
- Geist Sans for display and UI, with a system fallback; self-hosted subset in production.
- Architecture: `domain` → `application` → `infrastructure` / `presentation`, wired by `app`; boundaries enforced by ESLint.
- Low-risk autonomous improvement loop only from human-approved issues labeled `loop:approved`.

## Repository layout

```text
.
├─ AGENTS.md                     # rules for every AI agent and contributor
├─ docs/
│  ├─ design/                    # feel contract, visual board, decision log
│  ├─ reference/                 # living reference library and local snapshots
│  │  └─ apple-hig/              # downloaded Apple HIG pages
│  └─ superpowers/               # spec and implementation plan (pending approval)
├─ README.md
└─ .gitignore
```

## Viewing the feel board

Open `docs/design/feel-board.html` directly in a browser. It loads Geist from Google Fonts for the visual study; production will self-host a Latin subset.

## Next

1. Approve or revise the combined design package, especially the reflow default and the Part 4 defaults.
2. Write the approved spec to `docs/superpowers/specs/`.
3. Write the implementation plan and get it approved.
4. Start implementation.

## License

To be selected before the first public release. TEMPO is intended to be open source and zero-cost to run.
