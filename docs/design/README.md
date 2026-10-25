# Design

**Status:** proposed. The combined design package is awaiting approval.

This folder holds the design source of truth for TEMPO. It is intentionally separate from the reference library: the design contract records what TEMPO should feel like; the reference library records the standards and platform documentation that shape those decisions.

## Contents

- [Feel contract](feel-contract.md) — the research digest, visual system, feel contract, accessibility, performance, iOS/PWA rules, test matrix, and acceptance criteria.
- [Feel board](feel-board.html) — a visual study of the dark and light phone views, timeline blocks, reflow preview, and scoped sheet. Open it in a browser.
- [Decision log](decisions.md) — every settled, proposed, or pending decision, with an ID and source.

## What is still pending

- Final approval of the combined design package (Parts 1–4).
- The reflow default: auto-preview + one-tap apply, or auto-apply.
- Formal acceptance of the Part 4 defaults: 44 pt targets, 88 px/hour, install card timing, close-the-day sheet, no horizontal swipe, no haptics/sound/push/analytics, and the iOS 18.4+ baseline.
- The final spec in `docs/superpowers/specs/` and the implementation plan in `docs/superpowers/plans/`.

## Design rules

- The design contract wins over a visual study. The feel board is an illustration, not a specification.
- The approved spec wins over the design contract once it exists.
- If a new idea conflicts with either, record a decision first. Do not silently drift.
- Cite the relevant reference from `docs/reference/` when changing a design rule.
- Keep the human docs short and visual. Keep the AI docs exhaustive and explicit.
