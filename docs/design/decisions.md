# TEMPO — Decision log

This log is the bridge between the conversation and the final spec. It records what has been settled, what is proposed, and what is still open. The approved spec will win over this log once it exists.

**Status legend**

- **Accepted** — explicitly approved by the user.
- **Settled** — agreed in conversation and included in the package awaiting final approval.
- **Proposed** — recommended, not yet approved.
- **Pending** — still open.

D-028 records approval of the combined design package on 2026-10-25. All `Settled` decisions are therefore approved for implementation, and the previously `Proposed` Part 4 defaults are accepted with the status updates below.

If you change a decision, update this file, the feel contract, and any related reference note in the same change.

| ID | Decision | Status | Source / note |
|---|---|---|---|
| D-001 | TEMPO is an installable iOS PWA. No paid Apple Developer account, App Store listing, or native wrapper. | Settled | Platform review; [PWA notes](../reference/pwa.md) |
| D-002 | Data is local-only in IndexedDB. No backend, accounts, sync, push, analytics, or tracking. | Settled | Privacy and offline-first review; [PWA notes](../reference/pwa.md) |
| D-003 | Core loop: brain dump first, then drag tasks from a tray onto a vertical timeline. Target a useful plan in under 60 seconds. | Settled | Design Parts 1–3 |
| D-004 | Timeline contains tasks, recurring routines, focus blocks, and breaks. No calendar events or notes in v1. | Settled | Design Parts 1–3 |
| D-005 | Placement is manual after the brain dump. No auto-scheduler in v1. | Settled | Design Parts 1–3 |
| D-006 | Slippage triggers auto-reflow of remaining blocks, with a preview and one-tap undo. Anchored routines and breaks are protected. | Settled | [HIG undo and redo](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo), [HIG feedback](https://developer.apple.com/design/human-interface-guidelines/feedback) |
| D-007 | Reflow default: auto-preview + one-tap apply; auto-apply is opt-in. | Accepted | Approved in D-028 |
| D-008 | Unfinished blocks at midnight move to tomorrow’s backlog with a “Carried over” badge. No auto-scheduling. | Settled | Design Parts 1–3 |
| D-009 | Reminders are in-app plus `.ics` export of today’s plan with configurable `VALARM` alarms. No Web Push. | Settled | [RFC 5545](https://datatracker.ietf.org/doc/html/rfc5545), [PWA notes](../reference/pwa.md) |
| D-010 | Hosting is a public repository plus GitHub Pages, for free Actions minutes and enforced branch protection. | Settled | [GitHub Actions](https://docs.github.com/en/actions), [branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) |
| D-011 | The improvement loop runs every 3 hours, 08:00–22:00, from a Windows scheduled task. Only `risk:low` changes may auto-merge on green CI. | Settled | [AI development notes](../reference/ai-development.md) |
| D-012 | The loop may only work from human-approved GitHub Issues labeled `loop:approved`. Audit mode may propose issues but may not ship invented features. Manual runs may open PRs but never auto-merge. | Settled | [AI development notes](../reference/ai-development.md) |
| D-013 | Model ladder: `deepseek-v4.1-flash-free` → `glm-5.3-flash-free` → `mimo-v2.6-flash-free` → `flint-40b-free` → local `qwen2.5-coder:7b`. | Settled | Local Ollama fallback is unavailable until installed |
| D-014 | Product name: **TEMPO**. | Accepted | User decision |
| D-015 | Dark “Midnight & royal”: `#05070c` base, `#0c1220`/`#131b2e` surfaces, `#f4f5f9` type, `#7b5cff` accent, `#8fa6d9` routines. Light “Porcelain”: `#f5f6fa` base, white cards, `#0b0f1a` ink, `#5b3fe0` accent, `#2f5a9e` routines. | Settled | Contrast review in [feel contract](feel-contract.md#32-color-tokens) |
| D-016 | Stack: React 19, Vite, TypeScript, Dexie, CSS Modules, and the token registry adapted from the budgeting app. | Settled | [Stack notes](../reference/stack.md) |
| D-017 | Architecture: `domain` → `application` → `infrastructure`/`presentation`, wired by `app`; boundaries enforced by ESLint. | Settled | [Stack notes](../reference/stack.md) |
| D-018 | Typography direction: modern minimalist grotesque. Geist Sans for display and UI, system fallback, self-hosted Latin subset. | Accepted | User request 2026-10-25; approved in D-028; [HIG typography](https://developer.apple.com/design/human-interface-guidelines/typography) |
| D-019 | iOS baseline: 18.4+; primary testing on iOS 26.x. Design defensively for the 26.1 status-bar/fullscreen regression. | Accepted | Approved in D-028; [PWA notes](../reference/pwa.md) |
| D-020 | Timeline scale: 88 px/hour; 44 pt minimum block target; compact treatment for sub-30-minute blocks. | Accepted | Approved in D-028; [HIG layout](https://developer.apple.com/design/human-interface-guidelines/layout) |
| D-021 | Install card appears only after the second real plan; dismissible; exact iOS 26 instructions. | Accepted | Approved in D-028; [HIG onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding) |
| D-022 | Close-the-day sheet is lightweight; midnight carry-over is automatic and quiet. | Accepted | Approved in D-028; [HIG feedback](https://developer.apple.com/design/human-interface-guidelines/feedback) |
| D-023 | No horizontal swipe actions for important or destructive actions. Every drag has a “Move”/“Place” alternative. | Accepted | Approved in D-028; [WCAG 2.5.7](https://www.w3.org/TR/WCAG22/#dragging-movements), [HIG gestures](https://developer.apple.com/design/human-interface-guidelines/gestures) |
| D-024 | No haptics, sound, push, or analytics. Use visual feedback and `.ics` instead. | Accepted | Approved in D-028; [PWA notes](../reference/pwa.md) |
| D-025 | Dates are local `YYYY-MM-DD` keys; times are minute-of-day integers. DST and midnight rollover are domain tests. | Settled | [Feel contract](feel-contract.md#time-and-date) |
| D-026 | Documentation is part of the product: short visual human docs plus exhaustive AI docs, with a permanent reference library. | Accepted | User request 2026-10-25; [Reference library](../reference/README.md) |
| D-027 | The now line is the only thing that moves on its own. Everything else moves only when the user moves it. | Settled | Brand motif; [feel contract](feel-contract.md#2-the-design-thesis) |
| D-028 | The combined design package and recommended Part 4 defaults are approved. Reflow defaults to auto-preview + one-tap apply; auto-apply is opt-in. | Accepted | User: “Proceed,” 2026-10-25 |
| D-029 | Routines are recurring tray items, not auto-materialized timeline blocks. The user places them manually; placing creates an anchored routine block. A routine can be skipped for one day via a `RoutineException`. | Proposed | Clarifies D-004/D-005 and the approved tray behavior; becomes accepted on spec approval |
| D-030 | Drag is direct manipulation: the ghost previews the landing and required shifts; the drop commits the move and shifts as one undoable action. The separate reflow preview bar is reserved for overrun/slippage. | Proposed | Clarifies the feel contract’s drag choreography; becomes accepted on spec approval |

## Change protocol

1. Add or update a row. Do not reuse an ID.
2. Set the status honestly: `Accepted`, `Settled`, `Proposed`, or `Pending`.
3. Link to the source that justifies it. If the source is a conversation decision, say so.
4. Update the affected design contract section and reference map.
5. If the decision changes user data, storage, security, dependencies, or a major UI surface, mark it as requiring human review in the PR.
