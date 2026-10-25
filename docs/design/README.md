# Design

**Status:** design package approved 2026-10-25 (D-028); the implementation spec is approved in `docs/superpowers/specs/2026-10-25-tempo-design.md`.

This folder holds the design source of truth for TEMPO. It is intentionally separate from the reference library: the design contract records what TEMPO should feel like; the reference library records the standards and platform documentation that shape those decisions.

## Contents

- [Feel contract](feel-contract.md) — the research digest, visual system, feel contract, accessibility, performance, iOS/PWA rules, test matrix, and acceptance criteria.
- [Feel board](feel-board.html) — a visual study of the dark and light phone views, timeline blocks, reflow preview, and scoped sheet. Open it in a browser.
- [Decision log](decisions.md) — every settled, proposed, or pending decision, with an ID and source.

## Approved defaults

- Reflow defaults to auto-preview + one-tap apply; auto-apply is opt-in.
- 44 pt targets, 88 px/hour timeline, compact sub-30-minute treatment.
- Install card after the second real plan; never on first launch.
- Lightweight close-the-day sheet; quiet midnight carry-over.
- No horizontal swipe, haptics, sound, push, or analytics.
- iOS 18.4+ baseline; primary testing on iOS 26.x.
- Geist Sans for display and UI, with system fallback.

## What is still pending

- The implementation plan in `docs/superpowers/plans/`.

## Design rules

- The design contract wins over a visual study. The feel board is an illustration, not a specification.
- The approved spec wins over the design contract once it exists.
- If a new idea conflicts with either, record a decision first. Do not silently drift.
- Cite the relevant reference from `docs/reference/` when changing a design rule.
- Keep the human docs short and visual. Keep the AI docs exhaustive and explicit.
