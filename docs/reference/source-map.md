# Source map — what to read before changing an area

Use this table before making a change. It is the fastest way to keep TEMPO consistent with its standards. For product behavior, read the spec first (`docs/superpowers/specs/2026-10-25-tempo-design.md`); this table points to the standards and evidence behind each area.

| If you are changing… | Read first | Relevant decisions |
|---|---|---|
| The daily loop, brain dump, tray, or routines | [Spec §4 and §6](../superpowers/specs/2026-10-25-tempo-design.md), [Design contract §2–4](../design/feel-contract.md), [HIG onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding), [HIG layout](https://developer.apple.com/design/human-interface-guidelines/layout) | D-003, D-004, D-005, D-029 |
| Timeline layout, hour scale, or compact blocks | [HIG layout](https://developer.apple.com/design/human-interface-guidelines/layout), [WCAG 1.4.10 Reflow](https://www.w3.org/TR/WCAG22/#reflow) | D-020 |
| Drag, resize, or placement | [Spec §8 and §9.5](../superpowers/specs/2026-10-25-tempo-design.md), [HIG drag and drop](https://developer.apple.com/design/human-interface-guidelines/drag-and-drop), [HIG gestures](https://developer.apple.com/design/human-interface-guidelines/gestures), [WCAG 2.5.7](https://www.w3.org/TR/WCAG22/#dragging-movements), [MDN Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) | D-023, D-030 |
| Reflow, slippage, or undo | [Spec §6.5 and §9.5](../superpowers/specs/2026-10-25-tempo-design.md), [HIG undo and redo](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo), [HIG feedback](https://developer.apple.com/design/human-interface-guidelines/feedback), [NN/g response times](https://www.nngroup.com/articles/response-times-3-important-limits/) | D-006, D-007 |
| Carry-over, midnight, or day close | [Design contract §6](../design/feel-contract.md), [HIG feedback](https://developer.apple.com/design/human-interface-guidelines/feedback) | D-008, D-022, D-025 |
| Color, themes, or contrast | [HIG color](https://developer.apple.com/design/human-interface-guidelines/color), [HIG dark mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode), [WCAG 1.4.3](https://www.w3.org/TR/WCAG22/#contrast-minimum), [WCAG 1.4.11](https://www.w3.org/TR/WCAG22/#non-text-contrast) | D-015 |
| Typography or the wordmark | [HIG typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Geist](https://vercel.com/font), [Fontsource Geist](https://fontsource.org/fonts/geist) | D-018 |
| Sheets, fields, or keyboard behavior | [HIG sheets](https://developer.apple.com/design/human-interface-guidelines/sheets), [HIG modality](https://developer.apple.com/design/human-interface-guidelines/modality), [HIG text fields](https://developer.apple.com/design/human-interface-guidelines/text-fields), [HIG virtual keyboards](https://developer.apple.com/design/human-interface-guidelines/virtual-keyboards) | D-021, D-023 |
| Install, manifest, icons, or offline shell | [PWA notes](pwa.md), [web.dev Learn PWA](https://web.dev/learn/pwa/), [W3C Web App Manifest](https://www.w3.org/TR/appmanifest/) | D-001, D-019, D-021 |
| Storage, persistence, backup, or encryption | [PWA notes](pwa.md), [Privacy and data protection](../security/privacy.md), [Threat model](../security/threat-model.md), [MDN StorageManager.persist()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist), [MDN Web Crypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API), [Dexie](https://dexie.org/docs/) | D-002, D-025, D-035 |
| Import, export, `.ics`, or untrusted files | [Privacy and data protection](../security/privacy.md), [Controls](../security/controls.md), [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), [RFC 5545](https://datatracker.ietf.org/doc/html/rfc5545) | D-009, D-035 |
| AI loop, risk, or automation | [AI development notes](ai-development.md), [Agent threat model](../security/agent-threat-model.md), [OpenCode docs](https://opencode.ai/docs/), [GitHub Actions](https://docs.github.com/en/actions) | D-011, D-012, D-013, D-034 |
| Architecture or dependencies | [Stack notes](stack.md), [Security reference](security.md), [Controls](../security/controls.md), [Architecture](../ARCHITECTURE.md), [React](https://react.dev/), [Vite](https://vite.dev/guide/), [TypeScript](https://www.typescriptlang.org/docs/), [Dexie](https://dexie.org/docs/) | D-016, D-017, D-032, D-033, D-036 |
| Security, CSP, secrets, or supply chain | [Security program](../security/README.md), [Security reference](security.md), [Threat model](../security/threat-model.md), [Verification](../security/verification.md), [ASVS assessment](../security/asvs.md) | D-032, D-033, D-034, D-035 |
| Branch protection, CI gates, or release | [CI contract](../operations/ci.md), [Release](../operations/release.md), [Verification](../security/verification.md), [Secure SDLC](../security/secure-sdlc.md), [GitHub Actions hardening](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions) | D-010, D-012, D-031, D-034, D-036 |
| Accessibility | [UI/UX notes](ui-ux.md), [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [HIG accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [A11y Project checklist](https://www.a11yproject.com/checklist/) | D-023, D-024 |
| Performance | [UI/UX notes](ui-ux.md), [web.dev INP](https://web.dev/articles/inp), [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview), [Testing](../TESTING.md#lighthouse) | D-020, D-024, D-036 |
| Testing strategy, coverage, or a new test level | [Testing](../TESTING.md), [Controls](../security/controls.md), [Architecture](../ARCHITECTURE.md) | D-024, D-034 |
| Human-facing help or onboarding copy | [User guides](../human/user/install.md), [Docs hub](../human/README.md), [Developer docs](../human/developer/README.md), [Design contract §7](../design/feel-contract.md), [HIG onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding) | D-019, D-021, D-026 |
| Understanding a feature, its data flow, or how CI gates it | [Developer docs](../human/developer/README.md), [Feature diagrams](../human/developer/features/README.md), [CI diagrams](../human/developer/ci.md), [Architecture](../ARCHITECTURE.md) | D-010, D-036, D-037, D-038 |
| Documentation or the reference library | [Reference library](README.md), [AI index](../ai/README.md), [AGENTS.md](../../AGENTS.md) | D-026 |

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
Control(s): SEC-xx
References:
- <source title> — <URL or local path>
- <source title> — <URL or local path>
Verification:
- <test / manual pass / trace>
Not verified:
- <anything the reviewer must check>
```
