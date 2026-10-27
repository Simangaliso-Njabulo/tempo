# Security verification

**Status:** specified 2026-10-25. The commands below are the target contract. They become real when the operations plan creates the scripts and required checks; until then, run what exists and record the gap.

## Rule

A security claim needs evidence. The evidence is a command and its result, a test, an artifact inspection, or a dated human attestation. "I reviewed it" is not evidence unless it is written down with a date and a scope.

## Required checks on every pull request

| Check | Proves | Command / workflow | Blocking |
|---|---|---|---|
| `lint` | Style, types, layer boundaries, unsafe-pattern rules | `npm run lint` | Yes |
| `typecheck` | Type safety | `npm run typecheck` | Yes |
| `unit` | Domain and application behaviour, coverage floors | `npm run test:coverage` | Yes |
| `e2e` | Real browser journeys on WebKit iPhone | `npm run test:e2e -- --project=webkit-iphone` | Yes |
| `a11y` | axe has zero serious or critical issues | `npm run test:a11y -- --project=webkit-iphone` | Yes |
| `build` | Production build succeeds and PWA artifacts exist | `npm run build && npm run check:pwa` | Yes |
| `size` | JS, CSS, and font budgets | `npm run size` | Yes |
| `visual` | Dark and light screenshot regression | `npm run test:visual -- --project=webkit-iphone` | Yes |
| `lighthouse` | Mobile Performance >=95, Accessibility 100, Best Practices 100 | `npx lhci autorun` | Yes |
| `security-static` | CodeQL finds no high/critical issue in the changed code | CodeQL workflow, security-extended | Yes |
| `security-supply-chain` | No high/critical vulnerable dependency; lockfile and SBOM are consistent | dependency review, `npm audit --audit-level=high`, OSV-Scanner, CycloneDX | Yes |
| `security-workflows` | Workflows parse, are pinned, and have least privilege | `actionlint`, `zizmor` | Yes |
| `security-secrets` | No secret in the diff or history | Gitleaks + GitHub secret scanning | Yes |
| `security-policy` | CSP, protected paths, risk label, waiver expiry, required sections, no third-party runtime origin | `node scripts/security/check-policy.mjs` | Yes |

`main` requires all of these. A red check is not merged. There is no "merge anyway" button for security checks except a recorded incident override by the maintainer, followed by a retrospective.

## Scheduled checks

| Job | Cadence | Proves | Failure action |
|---|---|---|---|
| CodeQL | On PR, push to `main`, and weekly | Static analysis stays current | Open a security issue; block release |
| Dependabot | Daily | Dependency updates are proposed | Normal review; vulnerable updates are prioritised |
| Secret scanning | Continuous, platform | A pushed secret is detected | Revoke, rotate, incident |
| `drift-audit` | Daily | Branch protection, required checks, pins, scanning, waivers, attestations, Scorecard | Open `security:drift`, apply `loop:paused`, fail |
| OpenSSF Scorecard | Weekly | Repository hardening signals | Review findings; not a vanity score |
| OSV-Scanner | On PR and daily | Known vulnerabilities beyond npm audit | Block or waiver |
| SBOM + provenance | Every release | Artifact contents and build origin | Block release |

## Local commands

Fast loop:

```powershell
npm run lint
npm run typecheck
npm test
```

Before a PR:

```powershell
npm run verify
npm run test:e2e -- --project=webkit-iphone
npm run test:a11y -- --project=webkit-iphone
npm run test:visual -- --project=webkit-iphone
npm run verify:security
```

Target `package.json` additions:

```json
{
  "scripts": {
    "verify": "npm run typecheck && npm run lint && npm test && npm run build && npm run size && npm run check:pwa && npm run security:policy",
    "verify:security": "npm run security:policy && npm run security:deps && npm run security:workflows && npm run security:secrets",
    "security:policy": "node scripts/security/check-policy.mjs",
    "security:deps": "npm audit --audit-level=high && osv-scanner scan --lockfile=package-lock.json",
    "security:workflows": "actionlint && zizmor .github/workflows",
    "security:secrets": "gitleaks detect --source . --redact --no-banner",
    "security:sbom": "cyclonedx-npm --output-file sbom.cdx.json"
  }
}
```

If a tool is unavailable locally, say so and rely on the required CI check. Do not silently skip it.

## Artifact inspection

Run against `dist/`, never only the dev server:

```powershell
npm run build
Get-Content dist/index.html
Get-ChildItem -Recurse dist | Select-String -Pattern 'https?://' -CaseSensitive
```

Pass conditions:

- `index.html` has the approved CSP meta tag.
- No inline `<script>` or inline event handler.
- No `unsafe-inline` or `unsafe-eval` in `script-src`.
- No third-party script, style, font, image, or connect origin.
- The manifest, icons, service worker, and font are same-origin.
- The CSP still allows the app shell to boot offline.

## Abuse-case tests

These must exist and pass:

| Test | File | Assertion |
|---|---|---|
| XSS in task text | `src/presentation/**/*.test.tsx` | Markup is rendered as text; no script executes |
| Malicious import keys | `src/infrastructure/export/backup-file.security.test.ts` | `__proto__`, unknown fields, bad ranges, and huge arrays are rejected before a write |
| Import rollback | application integration test | A failed replace leaves the previous database intact |
| `.ics` injection | `src/infrastructure/export/ics-writer.test.ts` | CRLF, commas, semicolons, and long lines are escaped and folded |
| CSP and network | `tests/e2e/security.spec.ts` | No third-party request; CSP meta is present; no inline script |
| Encrypted backup | `src/infrastructure/export/encrypted-backup.test.ts` | Round-trip works; wrong passphrase and tampered ciphertext fail closed |
| Offline reload | `tests/e2e/offline.spec.ts` | Reload from the Home Screen works with the network off |
| Service worker scope | `tests/e2e/security.spec.ts` | Only same-origin precache entries are served |

## Manual attestations

The following cannot be proven by this repository's CI alone:

- GitHub branch protection, secret scanning, push protection, Dependabot, and private vulnerability reporting are enabled.
- The loop token is fine-grained, scoped to this repository, and has no admin rights.
- The loop runs as a dedicated low-privilege Windows user.
- The threat model was reviewed at the milestone.
- The ASVS Level 2 assessment and N/A justifications were reviewed.
- The device and export recovery flow was tested on a real iPhone.

Each gets an attestation under `security/attestations/` with a date, reviewer, evidence, and 90-day expiry. The drift audit treats missing or expired attestations as failures.

## What is not covered

- GitHub Pages cannot set `frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, or HSTS. The meta CSP is the available control. This is a documented residual risk, not a claim of full header coverage.
- A local-only app cannot prove that a stolen unlocked device is safe. The device passcode and optional encrypted export are the controls.
- A public repository cannot prevent a determined attacker from reading the code. It can prevent secrets and personal data from being there.
- A model provider's retention and training policy is outside TEMPO's control. Minimise and redact.
- A single maintainer cannot provide independent review. Required checks reduce the risk; they do not remove it.

## Failure handling

1. Stop. Do not merge or release.
2. Capture the failing command and the relevant, redacted output.
3. Classify severity using [README.md](README.md).
4. Fix the cause. Do not disable, skip, or weaken the check.
5. If a time-boxed exception is genuinely needed, follow [waivers/README.md](waivers/README.md). The agent cannot do this.
6. Add a regression test or a new abuse case.
7. Record the evidence and update the control map.

## References

- [Controls](controls.md)
- [Secure SDLC](secure-sdlc.md)
- [Incident response](incident-response.md)
- [GitHub Actions security hardening](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)
- [CodeQL](https://codeql.github.com/docs/)
- [OSV-Scanner](https://google.github.io/osv-scanner/)
- [SLSA 1.2](https://slsa.dev/spec/v1.2/)
