# AGENTS.md

This is the entry point for every AI agent or human contributor working on TEMPO. Read it before touching the repository.

## Read first

1. `README.md` — what TEMPO is and where the source of truth lives.
2. `docs/design/feel-contract.md` — the approved product feel and quality bar.
3. `docs/design/decisions.md` — the decisions that have been settled or proposed.
4. `docs/reference/README.md` — the canonical reference library.
5. `docs/reference/source-map.md` — what to read before changing a specific area.
6. `docs/superpowers/specs/2026-10-25-tempo-design.md` — the approved implementation contract.
7. `docs/superpowers/plans/` — the implementation plan and task checklists.

## The reference rule

TEMPO is built from the sources in `docs/reference/`, not from memory.

- Before changing design, UI, platform behavior, accessibility, performance, storage, or the AI loop, read the relevant source.
- Cite the decision ID and the source(s) in the PR or commit message.
- If a source conflicts with `docs/design/feel-contract.md`, stop and record a new decision in `docs/design/decisions.md`. Do not silently choose one.
- If you add a dependency, pattern, or platform assumption, add it to `docs/reference/stack.md` or `docs/reference/pwa.md` with a source.
- Keep the design contract, decision log, and reference library in sync in the same change.

## Product invariants

These are not style preferences. They define TEMPO.

- **Offline-first, local-only.** IndexedDB is the source of truth. No backend, accounts, sync, tracking, or analytics.
- **No paid platform dependency.** No Apple Developer account, App Store distribution, paid API, or paid service.
- **Timeline first.** The day is a vertical timeline. The brain dump comes before placement. The target is a useful plan in under 60 seconds.
- **Manual placement.** No auto-scheduler in v1. The user decides where blocks go.
- **Slippage is expected.** Reflow the remaining day after slippage, preview the change, and make it undoable. Protect anchored routines and breaks.
- **Carry-over is quiet.** Unfinished blocks move to tomorrow’s backlog at midnight with a “Carried over” badge. They are not auto-scheduled.
- **Two themes from launch.** Dark “Midnight & royal” and light “Porcelain”; follow iOS by default with a System / Dark / Light switch.
- **No calendar events or notes in v1.** Tasks, routines, focus blocks, and breaks only.
- **No fake native promises.** No custom haptics, no background timers, no push, no HTML5 drag-and-drop on iOS. Use Pointer Events, visual feedback, and `.ics`.
- **44 pt targets.** Minimum interactive target is 44×44 pt; 8 px between adjacent targets.
- **Time is legible.** 88 px per hour; tabular numerals; local dates and minute-of-day integers internally.
- **The now line is the only thing that moves on its own.** Everything else moves only when the user moves it.

## Architecture

```text
app (composition root)
├─ presentation  → application → domain
├─ infrastructure → application / domain
└─ domain        (no imports outward)
```

- `domain` contains pure types and rules. It must not import React, Dexie, the DOM, or infrastructure.
- `application` contains use cases and orchestration. It depends on domain ports, not concrete adapters.
- `infrastructure` implements storage, time, export, and platform adapters.
- `presentation` contains React components, hooks, and styles.
- `app` wires the layers together.
- Boundaries are enforced by ESLint. Do not bypass them with relative imports that cross layers.

## Quality gates

- Domain unit tests ≥95%; overall coverage ≥80%.
- axe: zero serious or critical issues.
- Lighthouse mobile: Performance ≥95, Accessibility 100, Best Practices 100.
- JS ≤180 KB gzipped; CSS ≤30 KB; UI + display font ≤40 KB.
- Dark/light visual regression passes.
- Offline reload from the Home Screen app passes.
- Drag, reflow, undo, day close, carry-over, import/export, and midnight rollover have tests.
- No new long task >50 ms during drag; INP p75 ≤200 ms.

## AI improvement loop

The autonomous loop exists to make small, safe improvements, not to invent the product.

- Work only from human-approved GitHub Issues labeled `loop:approved`.
- Only `risk:low` changes may auto-merge, and only on green CI.
- Manual loop runs may open PRs but must never auto-merge.
- Maximum 400 changed lines and 12 files per PR.
- Do not edit GitHub workflows, loop scripts, branch protection, release configuration, or dependency-update policy from a loop-generated PR.
- Do not delete or skip tests, lower coverage, or weaken assertions.
- Storage, security, dependencies, data migrations, major UI changes, and anything that changes user data require human review.
- Respect the `PAUSE` switch. Stop after 3 consecutive failures (circuit breaker).
- Audit mode may propose issues with evidence, but may not ship invented features.
- Every PR must name the issue, the risk level, the decision ID(s), the reference(s), and the verification performed.

See `docs/reference/ai-development.md` for the full loop contract and sources.

## Definition of done

A change is not done until:

- The behavior is tested at the right level.
- The relevant quality gates pass.
- The design contract and decision log are still true, or have been updated deliberately.
- New sources, dependencies, or platform assumptions are recorded in the reference library.
- The PR describes what changed, why, what was verified, and what was not verified.
- No unrelated files or pre-existing user changes are overwritten.

## Never do this

- Do not add a backend, accounts, sync, push, analytics, tracking, or a paid service.
- Do not introduce an auto-scheduler into v1.
- Do not use a fixed/sticky app bar or rely on a translucent status bar.
- Do not use HTML5 drag-and-drop as the primary iOS interaction.
- Do not add horizontal swipe actions for destructive or important actions.
- Do not invent features that are not in the approved spec or a `loop:approved` issue.
- Do not modify the separate `budgeting-app-pwa` repository from this project.
- Do not commit secrets, tokens, or personal data.
