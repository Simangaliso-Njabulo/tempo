# Stack notes

The stack is chosen for a local-first, installable iOS PWA that must stay small, testable, and understandable.

## Core stack

| Layer | Choice | Why | Source |
|---|---|---|---|
| UI | React 19 + TypeScript | Mature component model, strong typing, good local-state ergonomics. | [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/docs/) |
| Build | Vite | Fast local feedback and a small production bundle. | [Vite](https://vite.dev/guide/) |
| Persistence | Dexie over IndexedDB | Local-only storage with transactions, indexes, and migrations. | [Dexie](https://dexie.org/docs/) |
| Reactive data | `dexie-react-hooks` | Keeps local queries live without a server cache. | [dexie-react-hooks](https://dexie.org/docs/libs/dexie-react-hooks) |
| Styling | CSS Modules + token registry | Scoped styles, no runtime CSS-in-JS, one source of design tokens. | [CSS Modules](https://github.com/css-modules/css-modules) |
| PWA | `vite-plugin-pwa` / Workbox | Precaching and offline shell with a maintained service-worker path. | [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/), [Workbox](https://developer.chrome.com/docs/workbox) |
| Unit tests | Vitest | Fast, Vite-native unit and domain tests. | [Vitest](https://vitest.dev/guide/) |
| Component tests | Testing Library | Behavior-focused React tests. | [Testing Library](https://testing-library.com/docs/react-testing-library/intro/) |
| E2E | Playwright WebKit | The closest automated proxy for Safari behavior. | [Playwright](https://playwright.dev/docs/intro) |
| Accessibility | axe-core | Automated serious/critical checks. | [axe-core](https://github.com/dequelabs/axe-core) |
| Performance | Lighthouse | Budget checks for performance, accessibility, and best practices. | [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview) |
| Font | Geist Sans | Modern minimalist grotesque with excellent numerals; self-hosted subset, system fallback. | [Geist](https://vercel.com/font), [Fontsource](https://fontsource.org/fonts/geist) |
| Layer boundaries | `eslint-plugin-boundaries` | Enforces the domain/application/infrastructure/presentation split. | [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries) |
| Security | GitHub-native + free OSS | CodeQL, secret scanning, Dependabot, dependency review, `npm audit`, OSV-Scanner, Gitleaks, pinned actions, `actionlint`, `zizmor`, SBOM, provenance, Scorecard. No paid gate. | [Security reference](security.md) |
| Encryption | Web Crypto | Platform AES-GCM and PBKDF2 for the optional encrypted backup; no crypto library. | [MDN Web Crypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) |

## Architecture

```text
app (composition root)
├─ presentation  → application → domain
├─ infrastructure → application / domain
└─ domain        (no imports outward)
```

- `domain`: pure types and rules. Tasks, blocks, routines, reflow, carry-over, date/time math. No React, Dexie, DOM, or platform APIs.
- `application`: use cases and orchestration. Depends on domain types and ports; does not know Dexie or React.
- `infrastructure`: Dexie repositories, migrations, clock, `.ics` export, storage persistence, backup validation, encryption, import/export.
- `presentation`: React components, hooks, CSS Modules, pointer interaction.
- `app`: composition root and wiring.

Rules:

- One public entry point per layer.
- No cross-layer imports that skip a layer.
- Domain code is deterministic and testable without a browser.
- Time is injected through a clock port so tests can control midnight and DST.
- Storage is behind repository ports so the domain never sees Dexie.

## Data model

- `Task` — the thing to do, independent of when it is scheduled.
- `Block` — a placed interval on a day; references a task or routine.
- `Routine` — a recurring tray item with a preferred time and anchor behavior; the user places it manually (D-029).
- `RoutineException` — a one-day skip for a routine occurrence in v1; future move/override fields may be reserved but are not exposed.
- `Settings` — theme, time format, reflow/reminder preferences, install and backup state.
- `Meta` — schema version, last active date, real-plan dates, last backup, migration state.

Dates are local `YYYY-MM-DD` keys. Times are minute-of-day integers. Display formatting follows locale and the user’s 12/24-hour setting.

## PWA build notes

- `vite-plugin-pwa` is a dev dependency. It generates `manifest.webmanifest`, `sw.js`, and the Workbox precache manifest through `generateSW`.
- `workbox-window` is a dev dependency. It is the runtime helper behind `virtual:pwa-register/react`; registration is explicit in the update toast (Task 5.2), never an injected inline script.
- `registerType: 'prompt'` with `skipWaiting: false` and `clientsClaim: false`: a new worker waits until the user chooses Reload.
- `public/boot.css` is the only pre-hydration stylesheet. `public/theme-boot.js` is a same-origin classic script that applies the stored theme before paint. Neither weakens `style-src 'self'` or `script-src 'self'`.
- The production CSP meta is injected only for `build`, because the Vite dev server needs websocket and inline behaviour. `npm run verify:pwa` checks the built artifact for the CSP, the manifest, the service worker, the icons, and the absence of a third-party origin.

## Testing

- `@axe-core/playwright` is a dev dependency. It is the Playwright adapter around the existing `axe-core` engine, so the a11y journey can scan the real page without a second ruleset. The Playwright config itself lands in Task 5.5.

| Level | Scope |
|---|---|
| Domain unit | Reflow, anchor protection, carry-over, midnight, DST, overlap detection, undo grouping. Target ≥95%. |
| Application | Use-case orchestration with in-memory ports. |
| Infrastructure | Dexie repositories, migrations, import/export, `.ics` generation. |
| Component | Tray, timeline, block, sheet, install card, undo toast. |
| E2E | First run, plan, drag, reflow, undo, day close, carry-over, offline reload, import/export. |
| Accessibility | axe on key screens; manual VoiceOver and keyboard passes. |
| Security | XSS rendering, malicious import, import rollback, `.ics` injection, CSP/network, encrypted backup, service worker scope. |
| Visual | Dark/light, empty/planned, sheet, reflow preview, carried-over tray. |
| Performance | Drag trace, INP, long tasks, Lighthouse. |

## Security and data protection

- The app has no secret and no server. Security is enforced in the browser, the build, and the repository.
- CSP is delivered by `<meta>` because GitHub Pages cannot set response headers. `frame-ancestors` is not enforceable in a meta CSP and is recorded as residual risk.
- The production CSP allows only same-origin scripts, styles, fonts, images, and connections. No inline script and no `unsafe-inline` style. A small external boot stylesheet avoids a white flash without weakening the CSP.
- Imported JSON is untrusted. Validate schema, size, ranges, unknown keys, and references before a transactional write.
- `.ics` output is escaped and folded per RFC 5545.
- The optional encrypted backup uses PBKDF2-HMAC-SHA-256 (600,000 iterations), AES-256-GCM, a random 16-byte salt, and a random 12-byte IV. The envelope is versioned and authenticated.
- Live IndexedDB data is protected by the iOS app sandbox and device passcode. A TEMPO passphrase for live data is deferred to v1.1 (D-035).
- No personal data in logs, prompts, issues, screenshots, or analytics.
- The loop is untrusted code with a narrow token. See [the agent threat model](../security/agent-threat-model.md).

## Quality gates

- Domain coverage ≥95%; overall ≥80%.
- axe: zero serious or critical.
- Lighthouse mobile: Performance ≥95, Accessibility 100, Best Practices 100.
- JS ≤180 KB gzipped.
- CSS ≤30 KB gzipped.
- UI + display font ≤40 KB, one variable font, Latin subset.
- CLS ≤0.02.
- Initial DOM ≤1,500 nodes.
- No long task >50 ms during drag; INP p75 ≤200 ms.
- Offline reload from the Home Screen app passes.
- Dark/light visual regression passes.
- Security checks pass: `security-static`, `security-supply-chain`, `security-workflows`, `security-secrets`, `security-policy`.
- CSP has no `unsafe-inline` style or inline script; no third-party runtime origin.
- No unwaived high or critical finding; no expired waiver or attestation.

## Dependency policy

- Prefer platform APIs and small, focused libraries.
- No runtime dependency without a recorded decision and a bundle-size check.
- No analytics, tracking, remote-config, or A/B testing SDKs.
- No UI component library that would override the token system.
- No state-management library until local React state and Dexie hooks demonstrably fail.
- No date library until the date requirements are clear; if added, it must be tree-shakeable and timezone-safe.
- No drag-and-drop library for the iOS timeline until Pointer Events prove insufficient.
- Dependencies are human-reviewed. The autonomous loop must not upgrade them.
- Every dependency change passes dependency review, `npm audit`, OSV-Scanner, and a lockfile check. High or critical findings block merge.
- New dependencies need a recorded decision, a bundle-size check, a license check, and a threat-model note if they add code execution, network, or data access.
- Prefer Web Crypto, React, Dexie, and platform APIs over a new library. No remote runtime origin.
- GitHub Actions are pinned to full commit SHAs and run with least privilege. Workflow changes are human-reviewed.

## Font notes

- Family: Geist Sans (SIL OFL 1.1).
- Self-host one variable font, Latin subset, preloaded.
- `font-display: swap`; metrics-matched fallback.
- System fallback: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif`.
- Use `font-variant-numeric: tabular-nums` on times, durations, and counts.
- Keep inputs at 17 px minimum to avoid iOS focus zoom.
- No icon font; inline SVG sprite only.

## Locked choices and remaining open choices

Locked:

- Dates: hand-rolled local-date helpers; no date library.
- `.ics`: hand-rolled minimal RFC 5545 writer.
- PWA: `vite-plugin-pwa` with `generateSW` and prompt updates.
- Visual regression: Playwright screenshots.
- Performance gate: the `lighthouse` dev dependency driven by `scripts/lighthouse.mjs`; not `@lhci/cli`, whose tree carries high advisories (D-036).
- SBOM: `@cyclonedx/cyclonedx-npm` producing `sbom.cdx.json`.
- Transaction boundary: a small `UnitOfWork` around Dexie transactions.
- Font: copy the Latin variable WOFF2 from `@fontsource-variable/geist`; no runtime font request.
- Encryption: Web Crypto only; no crypto library.

Still open:

- Exact font subsetting pipeline.
- Dexie migration details beyond the additive, data-preserving rule.
- Whether a custom service worker becomes necessary if `generateSW` cannot meet the iOS shell requirements.

Record the choice in the decision log before adding a dependency.

## Sources

- [React](https://react.dev/), [Vite](https://vite.dev/guide/), [TypeScript](https://www.typescriptlang.org/docs/)
- [Dexie](https://dexie.org/docs/), [dexie-react-hooks](https://dexie.org/docs/libs/dexie-react-hooks)
- [CSS Modules](https://github.com/css-modules/css-modules)
- [Vitest](https://vitest.dev/guide/), [Playwright](https://playwright.dev/docs/intro), [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [axe-core](https://github.com/dequelabs/axe-core), [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview)
- [Workbox](https://developer.chrome.com/docs/workbox), [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/)
- [Geist](https://vercel.com/font), [Fontsource Geist](https://fontsource.org/fonts/geist)
- [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries)
- [Security reference](security.md), [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/), [OWASP Top 10:2025](https://owasp.org/Top10/2025/)
- [MDN Web Crypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API), [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [NIST SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final), [SLSA 1.2](https://slsa.dev/spec/v1.2/), [OpenSSF Scorecard](https://github.com/ossf/scorecard)
