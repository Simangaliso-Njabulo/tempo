# UI/UX and accessibility notes

TEMPO should feel calm, precise, tactile, forgiving, and fast. This document records the principles behind that bar and the accessibility requirements that are not optional.

## Core sources

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) — platform conventions, layout, color, typography, motion, sheets, gestures, feedback, undo.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [quick reference](https://www.w3.org/WAI/WCAG22/quickref/) — the accessibility floor.
- [NN/g — 10 usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) — the review lens.
- [NN/g — Response times: the 3 important limits](https://www.nngroup.com/articles/response-times-3-important-limits/) — interaction budgets.
- [Laws of UX](https://lawsofux.com/) — Fitts, Hick, Doherty, Peak-End, Zeigarnik.
- [Refactoring UI](https://www.refactoringui.com/) — hierarchy, spacing, contrast, depth.
- [The A11y Project checklist](https://www.a11yproject.com/checklist/) — practical audit list.
- [Inclusive Design Principles](https://inclusive-design-principles.org/) — design for differences.
- [web.dev — INP](https://web.dev/articles/inp) and [Optimize INP](https://web.dev/articles/optimize-inp) — responsiveness.

## The five qualities

1. **Quiet** — low chrome, no guilt, no confetti, no streak pressure.
2. **Precise** — linear time, tabular numerals, predictable snapping.
3. **Tactile** — blocks lift, snap, and settle; pressed states feel physical.
4. **Forgiving** — preview before consequences, undo after them, no dead ends.
5. **Fast** — local-first, optimistic, under 100 ms for direct manipulation.

## Usability heuristics we test against

- **Visibility of system status:** the now line, current block, save state, and offline state are always clear.
- **Match between system and the real world:** a day is a vertical timeline; times read like a calendar, not a database.
- **User control and freedom:** undo, redo, cancel, dismiss, and “Move”/“Place” alternatives.
- **Consistency and standards:** standard iOS sheet, keyboard, and focus behavior.
- **Error prevention:** preview reflow, confirm destructive actions, protect anchored blocks.
- **Recognition over recall:** visible labels and icons; no hidden gesture is the only path.
- **Aesthetic and minimalist design:** time is the decoration; no ornamental charts or gradients.
- **Help users recover from errors:** plain language, data-safety reassurance, specific recovery action.
- **Help and documentation:** short, contextual, optional; never gate the product behind a tour.

## Laws of UX in practice

| Law | TEMPO application |
|---|---|
| Fitts’s Law | Primary actions sit in the bottom third; 44 pt targets; adjacent targets are 8 px apart. |
| Hick’s Law | One decision per sheet; progressive disclosure; the tray starts simple. |
| Doherty Threshold | Direct manipulation feedback ≤100 ms; INP p75 ≤200 ms; optimistic UI for local writes. |
| Peak-End Rule | The evening close and the carry-over moment are designed, quiet, and kind. |
| Zeigarnik Effect | Unfinished blocks are visible but not guilt-inducing; no streak pressure, no red. |
| Jakob’s Law | Familiar iOS patterns: sheets, tab-free navigation, standard text fields. |

## WCAG 2.2 requirements for TEMPO

| Criterion | Level | TEMPO requirement |
|---|---|---|
| 1.3.1 Info and Relationships | A | Semantic headings, lists, labels, and relationships. |
| 1.4.3 Contrast (Minimum) | AA | 4.5:1 for normal text. |
| 1.4.10 Reflow | AA | No loss of content or function at 320 CSS px / 200% zoom. |
| 1.4.11 Non-text Contrast | AA | 3:1 for UI components and meaningful graphics. |
| 1.4.12 Text Spacing | AA | Content survives increased line height and spacing. |
| 2.1.1 Keyboard | A | Every action reachable by keyboard; logical order; no traps. |
| 2.3.3 Animation from Interactions | AAA | Respect reduced motion; no essential meaning in animation. |
| 2.4.7 Focus Visible | AA | 2 px accent outline, 2 px offset; 3 px in high contrast. |
| 2.5.7 Dragging Movements | AA | Every drag has a single-pointer alternative: “Move”/“Place”. |
| 2.5.8 Target Size (Minimum) | AA | At least 24×24 CSS px; TEMPO uses Apple’s 44×44 pt. |
| 3.3.1 Error Identification | A | Plain-language error, specific cause, recovery action. |
| 4.1.2 Name, Role, Value | A | Correct roles and labels for custom timeline interactions. |

## Interaction budgets

- **0.1 s** — direct-manipulation feedback feels instantaneous. Drag lift, press, and snap must land here.
- **1.0 s** — the user notices the system working. Keep interactions under 1 s; target under 400 ms.
- **10 s** — a progress indicator and an exit are required. TEMPO should never have a 10 s blocking action.
- **INP p75 ≤200 ms** — the web.dev “good” threshold.
- **Long tasks during drag: none >50 ms.**

## Visual review checklist

- Is there one clear focal point per screen?
- Is hierarchy created by size, weight, spacing, and alignment rather than decoration?
- Is every color doing semantic work?
- Does the timeline read correctly at a glance in dark and light?
- Are the now line and current block unmistakable without color alone?
- Is every important action reachable without a hidden gesture?
- Does the empty state feel open, not broken?
- Does the error state tell the user what happened and what to do next?
- Does the sheet feel like a scoped task, not a second app?
- Does the screen still work at 200% text and 320 px width?
- Does it respect Reduce Motion and Increased Contrast?
- Is there any guilt, streak pressure, or fake urgency? Remove it.

## Accessibility review checklist

- VoiceOver reads the date heading, timeline list, tray list, and each block’s title, type, start–end, duration, anchored/carried state, and actions.
- Keyboard-only pass completes the primary flow.
- One-thumb pass completes the primary flow.
- Focus is visible on every interactive element.
- Drag has a visible alternative.
- Undo is announced and reachable from history.
- Errors are specific and recoverable.
- Inputs are 17 px minimum and use the correct keyboard.
- `prefers-reduced-motion`, `prefers-contrast: more`, and `prefers-reduced-transparency` are honored.
- No text below 12 px; informative text is 13 px or larger.

## What not to do

- Do not use color alone to communicate type or state.
- Do not use red for a conflict or a carried-over block.
- Do not use confetti, streaks, guilt copy, or artificial urgency.
- Do not use glassmorphism, large blurs, or animated gradients.
- Do not hide essential actions behind long-press only.
- Do not use horizontal swipe for important or destructive actions.
- Do not animate the reflow; make it instant and undoable.
