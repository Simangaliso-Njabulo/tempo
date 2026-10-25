# Source map — what to read before changing an area

Use this table before making a change. It is the fastest way to keep TEMPO consistent with its standards.

| If you are changing… | Read first | Relevant decisions |
|---|---|---|
| The daily loop, brain dump, or tray | [Design contract §2–4](../design/feel-contract.md), [HIG onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding), [HIG layout](https://developer.apple.com/design/human-interface-guidelines/layout) | D-003, D-004, D-005 |
| Timeline layout, hour scale, or compact blocks | [HIG layout](https://developer.apple.com/design/human-interface-guidelines/layout), [WCAG 1.4.10 Reflow](https://www.w3.org/TR/WCAG22/#reflow) | D-020 |
| Drag, resize, or placement | [HIG drag and drop](https://developer.apple.com/design/human-interface-guidelines/drag-and-drop), [HIG gestures](https://developer.apple.com/design/human-interface-guidelines/gestures), [WCAG 2.5.7](https://www.w3.org/TR/WCAG22/#dragging-movements), [MDN Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) | D-023 |
| Reflow, slippage, or undo | [HIG undo and redo](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo), [HIG feedback](https://developer.apple.com/design/human-interface-guidelines/feedback), [NN/g response times](https://www.nngroup.com/articles/response-times-3-important-limits/) | D-006, D-007 |
| Carry-over, midnight, or day close | [Design contract §6](../design/feel-contract.md), [HIG feedback](https://developer.apple.com/design/human-interface-guidelines/feedback) | D-008, D-022, D-025 |
| Color, themes, or contrast | [HIG color](https://developer.apple.com/design/human-interface-guidelines/color), [HIG dark mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode), [WCAG 1.4.3](https://www.w3.org/TR/WCAG22/#contrast-minimum), [WCAG 1.4.11](https://www.w3.org/TR/WCAG22/#non-text-contrast) | D-015 |
| Typography or the wordmark | [HIG typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Geist](https://vercel.com/font), [Fontsource Geist](https://fontsource.org/fonts/geist) | D-018 |
| Sheets, fields, or keyboard behavior | [HIG sheets](https://developer.apple.com/design/human-interface-guidelines/sheets), [HIG modality](https://developer.apple.com/design/human-interface-guidelines/modality), [HIG text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields), [HIG virtual keyboards](https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards) | D-021, D-023 |
| Install, manifest, icons, or offline shell | [PWA notes](pwa.md), [web.dev Learn PWA](https://web.dev/learn/pwa/), [W3C Web App Manifest](https://www.w3.org/TR/appmanifest/) | D-001, D-019, D-021 |
| Storage, persistence, or backup | [PWA notes](pwa.md), [MDN StorageManager.persist()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist), [Dexie](https://dexie.org/docs/) | D-002, D-025 |
| `.ics` export or reminders | [RFC 5545](https://datatracker.ietf.org/doc/html/rfc5545), [PWA notes](pwa.md) | D-009 |
| AI loop, risk, or automation | [AI development notes](ai-development.md), [OpenCode docs](https://opencode.ai/docs/), [GitHub Actions](https://docs.github.com/en/actions) | D-011, D-012, D-013 |
| Architecture or dependencies | [Stack notes](stack.md), [React](https://react.dev/), [Vite](https://vite.dev/guide/), [TypeScript](https://www.typescriptlang.org/docs/), [Dexie](https://dexie.org/docs/) | D-016, D-017 |
| Accessibility | [UI/UX notes](ui-ux.md), [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [HIG accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [A11y Project checklist](https://www.a11yproject.com/checklist/) | D-023, D-024 |
| Performance | [UI/UX notes](ui-ux.md), [web.dev INP](https://web.dev/articles/inp), [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview) | D-020, D-024 |
| Documentation or the reference library | [Reference library](README.md), [AGENTS.md](../../AGENTS.md) | D-026 |

## Conflict protocol

If a source and the design contract disagree:

1. Stop. Do not pick the more convenient answer.
2. Write the conflict down: source, rule, proposed trade-off.
3. Add or update a decision in [`docs/design/decisions.md`](../design/decisions.md).
4. Link the decision from the design contract and this source map.
5. Only then implement.

## PR citation template

```text
Issue: #<number>
Decision: D-0xx
Risk: low | medium | high
References:
- <source title> — <URL or local path>
- <source title> — <URL or local path>
Verification:
- <test / manual pass / trace>
Not verified:
- <anything the reviewer must check>
```
