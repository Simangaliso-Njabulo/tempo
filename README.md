# TEMPO

TEMPO is a calm, offline-first daily planner for iPhone. Brain-dump first, then drag tasks onto a vertical timeline. Plan the day in under 60 seconds — and let the plan survive slippage.

**Status:** design, spec, and implementation plans approved 2026-10-25. The app scaffold (Task 0.1) is committed; lint and test setup (Task 0.2) is in progress. The security program is written and enforced through the operations plan. No remote, CI, or release exists yet.

## Source of truth

Read in this order:

1. **Product spec** — `docs/superpowers/specs/2026-10-25-tempo-design.md` (approved 2026-10-25)
2. **Design contract** — `docs/design/feel-contract.md`
3. **Decision log** — `docs/design/decisions.md`
4. **Reference library** — `docs/reference/README.md`
5. **Security program** — `docs/security/README.md`
6. **Implementation plans** — `docs/superpowers/plans/` (approved 2026-10-25)

If a change conflicts with a higher layer, stop and record a decision instead of silently diverging from the agreed direction.

## Design package

- [Feel contract](docs/design/feel-contract.md) — research digest, visual system, feel contract, accessibility, performance, iOS/PWA rules, and acceptance criteria.
- [Feel board](docs/design/feel-board.html) — a browser-based visual study of the dark and light phone views, timeline blocks, reflow preview, and scoped sheet. It is a design study, not production UI.
- [Decision log](docs/design/decisions.md) — the bridge between the conversation and the final spec. Every settled or proposed decision gets an ID.
- [Design index](docs/design/README.md) — what is in the design folder and what is still pending.

## Reference library

The canonical index is [docs/reference/README.md](docs/reference/README.md). It keeps the Apple Human Interface Guidelines, PWA and Safari documentation, UI/UX and accessibility sources, AI-development and automation docs, and stack documentation in one place.

The short rule: **build from the references, cite them in the change, and update the decision log when the references and the product disagree.**

## Security

TEMPO has no backend, accounts, sync, or analytics, so there is no server to breach and no secret in the app. The remaining risk is the browser, the supply chain, imports, exports, and the autonomous loop. The program is fail-closed:

- [Security program](docs/security/README.md) — severity, controls, verification, response, and privacy.
- [Threat model](docs/security/threat-model.md) and [agent threat model](docs/security/agent-threat-model.md) — assets, trust boundaries, and threats.
- [Controls](docs/security/controls.md) — `SEC-01` to `SEC-28`, each with a verification path.
- [Verification](docs/security/verification.md) — the fourteen required checks and the abuse tests.
- [Public reporting policy](SECURITY.md) — how to report a vulnerability.

Decisions D-032 to D-035 in the [decision log](docs/design/decisions.md) record the security stack, the fail-closed enforcement model, and the encrypted-backup scope. The checks are specified and become active only when the operations plan creates them; nothing here claims a gate that does not run.

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
├─ SECURITY.md                   # vulnerability-reporting policy
├─ docs/
│  ├─ design/                    # feel contract, visual board, decision log
│  ├─ reference/                 # living reference library and local snapshots
│  │  └─ apple-hig/              # downloaded Apple HIG pages
│  ├─ security/                  # threat models, controls, verification, waivers, attestations
│  └─ superpowers/               # approved spec and implementation plans
├─ public/                       # icons, manifest, boot CSS, theme bootstrap
├─ src/
│  ├─ domain/                    # pure types and rules
│  ├─ application/               # use cases and ports
│  ├─ infrastructure/            # Dexie, time, export, platform
│  ├─ presentation/               # React components, hooks, styles
│  └─ app/                       # composition root
├─ security/                     # machine-readable policy, waivers, attestations
├─ scripts/                      # security and operations tooling
├─ tests/                        # Playwright journeys and axe checks
├─ README.md
└─ .gitignore
```

## Viewing the feel board

Open `docs/design/feel-board.html` directly in a browser. It loads Geist from Google Fonts for the visual study; production will self-host a Latin subset.

## Next

1. Finish Task 0.2: lint, boundaries, formatting, and unit-test setup.
2. Build the domain, infrastructure, application, and presentation layers from the app plan.
3. Run the operations plan: CI, security checks, branch protection, Pages, and the local loop.
4. Choose a license and repository visibility before the first public release (D-031).

## License

Not yet chosen (D-031). TEMPO is intended to be open source and zero-cost to run. The repository stays private until the maintainer records the license and visibility decision.
