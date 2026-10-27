# TEMPO

TEMPO is a calm, offline-first daily planner for iPhone. Brain-dump first, then place tasks on a vertical timeline. Plan the day in under 60 seconds — and let the plan survive slippage.

No account. No sync. No tracking. Your day lives in the browser on your phone, and nowhere else.

**Status:** v0.1.0, implemented end to end. Typecheck, lint, unit and integration tests, coverage, the production build, PWA artifacts, the Playwright journeys on WebKit and Chromium, and Lighthouse pass locally. The release path is [docs/operations/release.md](docs/operations/release.md).

## What it does

- **Brain dump first.** Type everything, place nothing. The tray holds the list.
- **Manual placement.** Drag a task to the timeline, or use **Place** when dragging is not possible. No auto-scheduler.
- **Slippage is expected.** When a block overruns, TEMPO previews the shift, applies it on request, and makes it undoable. Anchored routines and breaks stay put.
- **Quiet carry-over.** Unfinished tasks return to tomorrow's tray at midnight with a **Carried over** badge. Nothing is auto-scheduled.
- **Two themes.** Dark **Midnight & royal** and light **Porcelain**, following iOS by default with a System / Dark / Light switch.
- **Local backups.** Plain or passphrase-encrypted JSON export, validated import, and a one-way `.ics` calendar export.
- **44 pt targets, 88 px per hour, tabular numerals, and a now line that is the only thing that moves on its own.**

The product contract is [the spec](docs/superpowers/specs/2026-10-25-tempo-design.md); the feel and its numbers are in [the feel contract](docs/design/feel-contract.md).

## Install

TEMPO is a PWA. There is no App Store listing and no paid Apple Developer account.

1. Open the TEMPO URL in Safari on iPhone.
2. **Share → Add to Home Screen**.
3. Open it from the Home Screen.

The Home Screen app is the supported experience: full-height timeline, no browser chrome, works offline after the first load. After the second block is planned, a small install hint appears in the tray footer; it is dismissible and never blocks the first run.

Step-by-step help lives in [docs/human/](docs/human/README.md).

## Develop

Requirements: Node 22+, npm, and a Chromium build for Lighthouse (`CHROME_PATH` if it is not on the default path).

```powershell
npm ci
npm run dev            # http://localhost:5173
```

```powershell
npm run verify         # typecheck, lint, unit, build, size, PWA artifacts
npm run test:coverage  # Vitest with thresholds
npm run test:e2e       # Playwright: WebKit iPhone 13 + Chromium Pixel 7
npm run test:a11y      # axe
npm run test:visual    # dark and light screenshot regression
npm run lighthouse     # Performance >=95, Accessibility 100, Best Practices 100
```

`npm run verify:full` runs the whole local set. Visual baselines are Linux-only; see [docs/TESTING.md](docs/TESTING.md#visual-regression).

### Architecture in one screen

```text
app (composition root)
├─ presentation  → application → domain
├─ infrastructure → application / domain
└─ domain        (no imports outward)
```

`domain` is pure TypeScript. `application` holds use cases and ports. `infrastructure` implements Dexie, crypto, export, and platform adapters. `presentation` is React. `app` wires them. ESLint fails a cross-layer import.

Full detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Source of truth

Read in this order, and stop to record a decision when two layers disagree.

1. **[Product spec](docs/superpowers/specs/2026-10-25-tempo-design.md)** — the approved implementation contract.
2. **[Design contract](docs/design/feel-contract.md)** — the feel, its numbers, and the acceptance criteria.
3. **[Decision log](docs/design/decisions.md)** — what is settled, accepted, proposed, or open.
4. **[Reference library](docs/reference/README.md)** — where the rules come from.
5. **[Source map](docs/reference/source-map.md)** — what to read before changing a specific area.
6. **[Security program](docs/security/README.md)** — controls, threat models, verification, and waivers.
7. **[Implementation plans](docs/superpowers/plans/)** — the task-level history.

## Testing

Four levels, each answering a different question: domain rules, component and use-case behavior, the real container against real Dexie, and the built app in a real browser. Coverage floors are 95% for `domain` and 80/80/80/75 overall, and they are not lowered.

Start at [docs/TESTING.md](docs/TESTING.md).

## Security

TEMPO has no backend, no accounts, no secret, and no third-party runtime origin. The remaining risk is the browser, the supply chain, imports and exports, and the autonomous loop. The program is fail-closed:

- [Security program](docs/security/README.md) — severity, controls, verification, response, privacy.
- [Threat model](docs/security/threat-model.md) and [agent threat model](docs/security/agent-threat-model.md).
- [Controls](docs/security/controls.md) — `SEC-01` to `SEC-28`, each with a verification path.
- [Verification](docs/security/verification.md) — the fourteen required checks and the abuse tests.
- [ASVS 5.0 Level 2 assessment](docs/security/asvs.md).
- [Reporting policy](SECURITY.md) — how to report a vulnerability privately.

The production artifact ships a strict CSP, no inline script, no inline style, no remote font, and no third-party connection. `scripts/security/check-policy.mjs` compares the built document with `security/policy.json` and fails on drift.

## The improvement loop

The repository includes a Windows-scheduled loop that can implement small, human-approved issues. It only reads `loop:approved` issues, only auto-merges `risk:low` on green required checks, and never edits workflows, policy, dependencies, or `AGENTS.md`. It respects `PAUSE`, a local lock, and a three-failure circuit breaker.

Operator guide: [docs/loop/README.md](docs/loop/README.md). Run log: [docs/loop/run-log.md](docs/loop/run-log.md).

## Repository layout

```text
.
├─ AGENTS.md                 # rules for every contributor and agent
├─ SECURITY.md               # private vulnerability reporting
├─ CHANGELOG.md
├─ LICENSE                   # MIT
├─ .github/                  # CI, security scanning, deploy, templates, CODEOWNERS
├─ docs/
│  ├─ design/                # feel contract, visual board, decision log
│  ├─ reference/             # reference library and source map
│  ├─ security/              # threat models, controls, verification, ASVS
│  ├─ human/                 # install, planning, backup, privacy, shortcuts
│  ├─ ai/                    # the agent fast path
│  ├─ operations/            # repository, CI, release, loop operations
│  ├─ loop/                  # loop operator guide and run log
│  └─ superpowers/           # approved spec and implementation plans
├─ public/                   # icons, manifest assets, boot CSS, theme bootstrap
├─ security/                 # machine-readable policy, waivers, attestations
├─ scripts/                  # security, operations, and loop tooling
├─ src/
│  ├─ domain/                # pure types and rules
│  ├─ application/           # use cases and ports
│  ├─ infrastructure/        # Dexie, time, export, platform
│  ├─ presentation/          # React components, hooks, styles
│  └─ app/                   # composition root
└─ tests/e2e/                # Playwright journeys, a11y, security, offline, performance
```

## Contributing

- Read [AGENTS.md](AGENTS.md) before changing anything.
- Cite the issue, risk level, decision IDs, control IDs, and sources in the pull request.
- Do not weaken a gate, delete a test, or add a third-party runtime origin.
- Security, dependency, workflow, storage, migration, and release changes need human review and never auto-merge.

## License

MIT — see [LICENSE](LICENSE). Copyright 2026 Simangaliso Njabulo Madonsela.

TEMPO ships third-party code and one font, so their licences ship too:
[`public/licenses/THIRD-PARTY-NOTICES.txt`](public/licenses/THIRD-PARTY-NOTICES.txt)
(React, React DOM, Scheduler — MIT; Dexie, Dexie React Hooks — Apache-2.0) and
[`public/licenses/geist-OFL.txt`](public/licenses/geist-OFL.txt) (Geist Sans,
OFL-1.1). Both are linked from Settings → About and are precached for offline
reading. `npm run security:licenses` fails when a shipped package is added or
removed without the notices being updated.
