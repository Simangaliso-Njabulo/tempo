# TEMPO threat model

**Status:** approved 2026-10-25. Review at every milestone and before any new data flow, dependency, permission, storage field, or network origin.

## Scope

In scope:

- The static PWA and its service worker.
- IndexedDB data, exports, imports, and screenshots of the app.
- The GitHub repository, GitHub Actions, Pages deployment, and release artifacts.
- The local improvement loop, its models, tools, tokens, and logs.

Out of scope for v1:

- A backend, accounts, authentication, sync, payments, multi-user sharing, or push.
- Native iOS code, App Store distribution, and Apple Developer services.
- Enterprise device management.

## System and data flow

```text
User
  -> Safari / installed PWA (same-origin static assets from GitHub Pages)
     -> React UI -> application use cases -> domain rules
     -> IndexedDB (plan data, settings, meta)
     -> File System / download (JSON backup, optional encrypted backup, .ics)
     -> Service worker cache (app shell only)
  -> GitHub Pages (public static files, no user data)

Contributor / loop
  -> local git worktree -> model provider -> tools (shell, edit, test)
  -> GitHub API (issues, branches, PRs, checks)
  -> GitHub Actions -> Pages artifact -> public app
```

There is no server-side TEMPO component and no user data on GitHub. GitHub sees repository content, issue/PR text, build logs, and any data a contributor puts there.

## Assets

| Asset | Classification | Why it matters |
|---|---|---|
| Tasks, blocks, routines, settings | Private personal data | Reveals plans, habits, and health/work patterns |
| JSON and encrypted backups | Private personal data | Complete copy of the user's plan history |
| `.ics` exports | Private personal data | Calendar entries and locations/titles |
| Device unlock and local browser profile | User-controlled | The practical at-rest protection for live data |
| Repository and build artifacts | Public | Integrity matters; anyone can inspect and fork |
| `GH_TOKEN`, model keys, signing material | Secret | Could allow repository or account compromise |
| Loop prompts, outputs, and logs | Potentially private | May contain issue text or plan fragments |
| CI/CD configuration and branch protection | Integrity-critical | A change can bypass every other control |

## Actors

- The user, including a person who finds an unlocked or stolen device.
- A malicious website, ad, or frame that tries to attack or clickjack the app.
- A malicious or corrupted import file.
- A compromised dependency, package registry account, or build action.
- A malicious contributor, issue author, or PR commenter.
- A model provider or model output.
- A compromised or over-eager agent.
- A mistake by the maintainer.

## Trust boundaries

| Boundary | Crossing | Rule |
|---|---|---|
| Browser sandbox <-> device | Local storage, downloads, clipboard | The browser is the security boundary; the app adds CSP, validation, and encryption for exports |
| App <-> imported file | User-selected file | Validate schema, size, types, and ranges before any write; never execute content |
| App <-> external origin | Network | No third-party runtime origin; `connect-src 'self'`; no remote fonts, scripts, or images |
| Repository <-> public | Public GitHub | No secrets or personal data; least-privilege tokens; pinned actions |
| CI <-> repository | `GITHUB_TOKEN`, secrets | Read-only default; explicit job permissions; no `pull_request_target` with untrusted code |
| Loop <-> repository | Git and GitHub API | Protected paths, diff limits, recheck of `loop:approved`, human merge for risky changes |
| Loop <-> model provider | Prompts and repository context | Treat as data disclosure; minimise, redact, never send secrets |
| Agent <-> tools | Shell, edit, network, browser | Fixed allowlist; least privilege; no arbitrary network or secret access |

## Threats and controls

Likelihood and impact are pre-control judgements. `T-01` to `T-12` are the working set; review them when the architecture changes.

| ID | STRIDE | Threat | Likelihood | Impact | Primary controls | Residual risk |
|---|---|---|---|---|---|---|
| T-01 | Tampering / Elevation | XSS through a task title, routine name, import, or URL rendered as HTML | Medium | High | React escaping; no `dangerouslySetInnerHTML`; no `eval`; strict CSP; validated imports; security lint | A React or browser 0-day |
| T-02 | Tampering | Malicious backup with huge arrays, prototype pollution, wrong types, duplicate IDs, or invalid ranges corrupts data | Medium | High | Size limits; explicit schema validator; `Object.create(null)` or `Map` for untrusted keys; reject unknown keys; transactional replace; tests | A validator gap; user ignores a warning |
| T-03 | Tampering | `.ics` injection via CRLF, commas, semicolons, or long lines | Low | Medium | RFC 5545 escaping; fold at 75 octets; strip control characters; tests | Calendar client bugs |
| T-04 | Tampering | Supply-chain compromise through a dependency or lockfile | Medium | High | Lockfile; `npm ci`; Dependabot; licence allowlist and shipped notices; `npm audit`; OSV-Scanner; provenance; human review for dependency changes | A new malicious maintainer release before advisory |
| T-05 | Tampering / Elevation | Compromised GitHub Action or workflow injection | Medium | High | Pin actions by full SHA; least-privilege `permissions`; no `pull_request_target` with untrusted checkout; `actionlint`; `zizmor`; protected workflows | GitHub platform compromise |
| T-06 | Information disclosure | Secret or personal data committed, logged, or sent to a model | Medium | High | No app secrets; token outside repo; secret scanning + push protection; Gitleaks; redacted logs; data minimisation; human review | A secret pasted into an issue before scanning |
| T-07 | Tampering | Prompt injection in an issue, PR, repo file, web page, or model output changes the loop's goal | High | High | Treat all content as data; fixed task prompt; `loop:approved` recheck; tool allowlist; protected paths; diff limits; no auto-merge for security | A subtle scope expansion that still fits the issue |
| T-08 | Elevation | Agent overreach: edits workflows, branch protection, secrets, release config, or tests | Medium | Critical | Dedicated low-privilege user; fine-grained token; CODEOWNERS; protected paths; deny rules; branch protection; no security auto-merge; human review | A misconfigured local environment |
| T-09 | Information disclosure / Denial | Lost or stolen unlocked device exposes live IndexedDB data | Medium | High | iOS device passcode and file protection; no data in URLs; optional encrypted export; quick lock guidance | Live-data passphrase is deferred to v1.1 |
| T-10 | Tampering | Service worker caches or serves attacker-controlled content | Low | High | Same-origin precache only; no runtime caching of third-party origins; integrity of build artifact; `generateSW` config review | A compromised Pages account |
| T-11 | Elevation | Clickjacking the app to trick the user into destructive actions | Low | Medium | No cross-origin embedding expected; GitHub Pages cannot set `frame-ancestors` via meta; document the gap | Framing remains possible; no high-value server action |
| T-12 | Denial | Huge import, infinite loop, or storage exhaustion | Medium | Medium | File-size cap; array-length caps; time-boxed parsing; quota error handling; no synchronous large work on the main thread | Browser quota limits |

## Abuse cases that must have tests

1. A task title containing `<img src=x onerror=...>` renders as text, never executes.
2. An import with a `__proto__` key, unknown fields, a 10 MB string, or 100,000 blocks is rejected without a write.
3. A replace import fails midway and leaves the previous data intact.
4. An `.ics` title containing `\r\nBEGIN:VEVENT` is escaped and folded.
5. A production build has no third-party runtime origin, no inline script, and no `unsafe-inline` style.
6. A malformed encrypted backup is rejected before decryption work or writes.
7. A wrong passphrase does not reveal whether the ciphertext is valid beyond the authentication failure.
8. The app still loads offline from the Home Screen after a deploy.

## Residual risks accepted for v1

- **Unlocked device:** live IndexedDB is protected by the OS, not a TEMPO passphrase. The user is told to use a device passcode and to export an encrypted backup.
- **No response headers on GitHub Pages:** CSP is delivered by `<meta>`; `frame-ancestors`, `X-Content-Type-Options`, and similar headers cannot be set. The app is same-origin and has no authenticated server actions, so the impact is limited but not zero.
- **Solo maintenance:** human review is a single person. The required checks and protected paths reduce, but do not remove, that risk.
- **Model provider disclosure:** issue text and repository context may be sent to the selected provider. Secrets and personal data are prohibited; the provider's retention policy is outside TEMPO's control.
- **Browser and platform 0-days:** TEMPO depends on Safari/WebKit and iOS file protection.
- **No live-data encryption in v1:** deferred to v1.1 by D-035. The encrypted export is the v1 protection for data leaving the device.

## Review triggers

- A new dependency, build tool, action, or model provider.
- A new network origin, permission, storage field, or export format.
- A change to import/export, authentication (none), service worker, CSP, or encryption.
- A security incident or near miss.
- A major browser, framework, or GitHub feature change.
- Before each release and quarterly.

## References

- [Security reference](../reference/security.md)
- [Controls](controls.md)
- [Agent threat model](agent-threat-model.md)
- [Privacy and data protection](privacy.md)
- [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Top 10:2025](https://owasp.org/Top10/2025/)
- [NIST SP 800-218 SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final)
