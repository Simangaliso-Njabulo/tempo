# TEMPO

TEMPO is a calm, offline-first daily planner for iPhone. Brain-dump first, then drag tasks onto a vertical timeline. Plan the day in under 60 seconds — and let the plan survive slippage.

**Status:** design and spec approved 2026-10-25. No app code yet. The app and operations plans are complete and awaiting approval; implementation starts only after both are approved.

## Source of truth

Read in this order:

1. **Product spec** — `docs/superpowers/specs/2026-10-25-tempo-design.md` (approved 2026-10-25)
2. **Design contract** — `docs/design/feel-contract.md`
3. **Decision log** — `docs/design/decisions.md`
4. **Reference library** — `docs/reference/README.md`
5. **Implementation plans** — `docs/superpowers/plans/` (complete, awaiting approval)

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
│  └─ superpowers/               # approved spec and implementation plan
├─ README.md
└─ .gitignore
```

## Viewing the feel board

Open `docs/design/feel-board.html` directly in a browser. It loads Geist from Google Fonts for the visual study; production will self-host a Latin subset.

## Next

1. Review and approve the implementation plan in `docs/superpowers/plans/`.
2. Build the app from the approved spec and plan.
3. Run the quality gates and the low-risk improvement loop.

## License

To be selected before the first public release. TEMPO is intended to be open source and zero-cost to run.
