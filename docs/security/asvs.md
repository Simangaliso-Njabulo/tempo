# OWASP ASVS 5.0 Level 2 assessment

**Scope:** the TEMPO PWA, its build, its CI, and its deployment to GitHub Pages.
**Assessment:** self-assessment prepared 2026-10-27 against OWASP ASVS 5.0, Level 2.
**Status:** chapters below are assessed; the dated human attestation required by SEC-25 has **not** been recorded yet. Until `security/attestations/asvs-2026-10-27.json` exists, this document is evidence, not a passed control.

Read with [`controls.md`](controls.md), [`threat-model.md`](threat-model.md), [`verification.md`](verification.md), and [`agent-threat-model.md`](agent-threat-model.md).

## How to read the status column

| Status | Meaning |
|---|---|
| Met | The requirement is implemented and has an automated or reproducible check. |
| Met (platform) | The requirement is satisfied by GitHub Pages or the iOS sandbox, not by app code. |
| N/A | The requirement cannot apply: the feature does not exist. The reason is stated. |
| Gap | A real, known shortfall with a compensating control and a follow-up. |

## Summary

| Chapter | Area | Status | Evidence |
|---|---|---|---|
| V1 | Encoding and sanitization | Met | React escaping; no `dangerouslySetInnerHTML`; `security-static`; `security.spec.ts` |
| V2 | Validation and business logic | Met | Domain invariants; import validator; abuse tests |
| V3 | Web frontend security | Met with gaps | Strict CSP meta; no third-party origin; meta-only header (gap) |
| V4 | API and web service | N/A | No API |
| V5 | File handling | Met | Backup import validation; `.ics` escaping |
| V6 | Authentication | N/A | No accounts |
| V7 | Session management | N/A | No server session |
| V8 | Authorization | N/A | No users or roles |
| V9 | Self-contained tokens | N/A | No tokens |
| V10 | OAuth and OIDC | N/A | No federation |
| V11 | Cryptography | Met | Web Crypto AES-256-GCM; PBKDF2-HMAC-SHA-256 |
| V12 | Secure communication | Met (platform) | HTTPS-only Pages |
| V13 | Configuration | Met | CSP, pins, no debug surface |
| V14 | Data protection | Met | Local-only; no analytics; encrypted export |
| V15 | Secure coding and architecture | Met | Layered boundaries; threat model; secure SDLC |
| V16 | Logging and error handling | Met | No personal data in logs; user-safe errors |
| V17 | WebRTC | N/A | No WebRTC |

## V1 — Encoding and sanitization

- All user text renders through React text nodes. There is no `dangerouslySetInnerHTML`, `innerHTML` assignment, `eval`, `new Function`, or `document.write`; `scripts/security/check-policy.mjs` fails the build if any appears under `src/`.
- `security.spec.ts` types markup into a task title and asserts the app shows it as text and creates no element.
- `.ics` output escapes `\`, `;`, `,`, and newlines and folds long lines per RFC 5545. Unit tests cover the escaping.
- CSS is authored in CSS Modules and built into one same-origin stylesheet. No user string reaches a style attribute.
- CSP is `default-src 'self'` with no `unsafe-inline` and no `unsafe-eval`.

## V2 — Validation and business logic

- `LocalDate` is validated as a real `YYYY-MM-DD` calendar date. Minutes are integers inside 0–1439. Durations are a fixed set.
- Domain services reject overlaps, out-of-range starts, and edits to a block outside its day with a `DomainError` carrying a stable code and a user-safe message.
- The import path validates the whole document before writing: shape, version, array caps, field types, and unknown-key rejection. A failure leaves the previous data untouched.
- Business-logic abuse cases are tested: wrong passphrase, malformed backup, negative or oversized duration, completion of an already-done block.

## V3 — Web frontend security

Met, with one documented gap.

- The production document carries a strict CSP meta tag, injected at build time and compared byte-for-byte with `security/policy.json` by `security-policy`.
- No third-party origin: no CDN, no remote font (Geist is bundled), no analytics, no tracking pixel. `security.spec.ts` records every request and fails on a cross-origin one.
- No `postMessage`, no `window.open`, no client-side routing that accepts a URL parameter into the DOM.
- Framing: GitHub Pages does not allow custom response headers, so `frame-ancestors` cannot be set as a header. The meta CSP is the only lever, and `frame-ancestors` is ignored in a meta tag. **Gap:** clickjacking protection depends on GitHub Pages not being framed by an attacker. Compensating control: no destructive action is reachable without a fresh user gesture, and the app holds no credentials to steal. Follow-up: revisit if TEMPO ever gains a backend.

## V4 — API and web service

N/A. TEMPO has no API, no server, and no cross-origin data exchange. All data access is IndexedDB inside the origin.

## V5 — File handling

- The only inbound file is a JSON backup, chosen by the user through a file input and read as text.
- Size is capped before parsing. The parser rejects unknown keys, wrong types, duplicate IDs, and dates outside the supported range.
- Import never executes file content. It is parsed as data, validated, and written through a transaction.
- Outbound files are a JSON backup (plain or encrypted) and an `.ics` calendar. The filename is generated, not taken from user input.

## V6–V10 — Authentication, session, authorization, tokens, OAuth

N/A for every requirement.

TEMPO has no accounts, no sign-in, no server session, no roles, no bearer tokens, and no federation. There is nothing to authenticate to and no token to steal. The iOS Home Screen app inherits the device passcode and the app sandbox.

The one credential in the project is the maintainer's GitHub and loop token, which live in the maintainer's environment, never in the repository or the app. That credential is governed by SEC-09 and the agent threat model, not by ASVS V6–V10.

## V11 — Cryptography

- The encrypted export uses AES-256-GCM with a random 96-bit IV per export.
- The key is derived with PBKDF2-HMAC-SHA-256, a random 128-bit salt, and a documented iteration count. The parameters travel in the file header so a later version can raise them.
- Web Crypto (`crypto.subtle`) is the only crypto implementation. There is no hand-rolled cipher, no custom KDF, and no key in the bundle.
- Decryption failure is indistinguishable from a wrong passphrase and leaves the existing data untouched.
- Tests cover round-trip success, wrong passphrase, truncated file, and tampered ciphertext (auth-tag failure).

## V12 — Secure communication

Met by the platform. GitHub Pages serves the app over HTTPS only, and the PWA requires a secure context for service workers. The app makes no outbound connection other than same-origin asset and navigation requests; `connect-src 'self'` enforces it.

## V13 — Configuration

- The production build has no source maps shipped, no dev server, no debug panel, and no environment-specific secret.
- `npm ci` runs from a committed lockfile. Actions are pinned to full commit SHAs. Workflows declare least-privilege `permissions`.
- `security-policy` rejects `pull_request_target`, `secrets: inherit`, unpinned actions, missing permissions, inline script, inline style, and inline event handlers.
- The CSP is part of the build, not a manual step, and a drift between `vite.config.ts` and `security/policy.json` fails the gate.

## V14 — Data protection

- All plan data stays in IndexedDB inside the origin. There is no backend, sync, push, analytics, or telemetry.
- No personal data reaches a prompt, an issue, a log, a screenshot, or a committed fixture. Tests and screenshots use fixture data.
- The service worker caches only the app shell and its own assets; it never caches plan data into a shared cache key.
- The optional encrypted export is the only path that moves data off the device, and only when the user asks.
- Clearing site data deletes the plan. The app says so and points at the backup guide; it does not pretend to be durable cloud storage.

## V15 — Secure coding and architecture

- Four layers (`domain`, `application`, `infrastructure`, `presentation`) with a one-way dependency direction, enforced by `eslint-plugin-boundaries`. A cross-layer relative import fails `lint`.
- `domain` has no React, Dexie, or DOM import, so the rules are testable without a browser.
- The threat model covers assets, trust boundaries, and abuse cases; the agent threat model covers the loop, its token, its tools, and prompt injection.
- Every change carries a risk label, decision IDs, control IDs, verification, and a "not verified" section. `security-policy` enforces the sections.
- Security-sensitive areas are protected by CODEOWNERS and can never auto-merge.

## V16 — Logging and error handling

- The app has no logger and no remote error reporting. Errors surface as a plain, user-safe message; a `DomainError` code is shown as text, never a stack trace.
- The loop's local log records timestamps, model names, and outcomes only. It never records an issue body, a token, or plan data.
- Workflows do not print secrets: no `echo "${{ secrets.* }}"`, no `set -x` around a token, and `GITHUB_TOKEN` is read-scoped by default.
- `security-secrets` runs the Gitleaks 8.30.1 binary, pinned by SHA-256, over the full history with no API token, and GitHub secret scanning with push protection blocks a push containing a known secret.

## V17 — WebRTC

N/A. TEMPO opens no peer connection, requests no camera or microphone, and enumerates no devices.

## Level 2 gaps and follow-ups

| Gap | Compensating control | Follow-up |
|---|---|---|
| No `frame-ancestors` / clickjacking header (Pages cannot set headers) | No credentials to steal; destructive actions need a fresh gesture | Revisit if a backend or account is ever added |
| CSP delivered as a meta tag, not a header | The document is static, has no inline script, and loads only same-origin assets; `security-policy` compares the tag with policy | Move to a header if hosting ever allows it |
| No Trusted Types enforcement | No DOM sink exists: no `innerHTML`, no dynamic HTML, no `eval`; the pattern scan fails the build if one appears | Adopt `require-trusted-types-for 'script'` when Safari supports it |
| No automated dependency-freshness SLA beyond Dependabot | Dependabot daily, OSV-Scanner, `npm audit`, licence allowlist | Track advisory age in the drift audit |

## Re-assessment

Re-run this assessment on each major release, and whenever a boundary changes: a new network origin, a new stored field, a new import format, a new automation surface, or a new platform permission. A new gap gets a control, a test, or a dated attestation with an expiry. An expired attestation fails `security-policy`.

## Recording the attestation

A human maintainer records the attestation; an agent may not. The file lives at `security/attestations/asvs-2026-10-27.json` and must name the control (`SEC-25`), the owner, the approver, the date, the 90-day expiry, and at least one evidence entry pointing at this document and a green `security-policy` run.
