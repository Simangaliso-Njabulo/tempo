# Secure development lifecycle

**Status:** approved 2026-10-25. This document defines how TEMPO is built, reviewed, and corrected. It is binding for humans and agents.

## Roles

| Role | Owns | Cannot do alone |
|---|---|---|
| Maintainer (human) | Product scope, decisions, waivers, attestations, protected settings, risky merges | Waive a critical finding |
| Contributor (human or agent) | A small change with tests and evidence | Merge a security, dependency, workflow, storage, permission, or release change |
| Reviewer (human) | Correctness, security, tests, docs, and scope | Review their own change when a second person is available |
| CI | Objective gates | Replace human judgement for non-automatable controls |
| Loop runner | One approved low-risk change | Invent scope, edit protected paths, merge risky work, create waivers |

A solo maintainer is a known residual risk. The required checks, protected paths, and dated attestations reduce it. They do not create a second reviewer.

## Phases and gates

### 1. Define

- Record the user problem and the decision ID.
- Classify risk: `risk:low`, `risk:medium`, `risk:high`.
- Identify assets, data flows, trust boundaries, and new dependencies.
- Add or update the threat model when anything crosses a boundary.
- Write acceptance criteria, including the abuse case that must fail safely.
- For a loop change, use only a human-approved `loop:approved` issue.

**Gate:** the issue or PR names the decision, the reference, the risk, and the security impact.

### 2. Design

- Choose the smallest design that fits the architecture.
- Prefer platform APIs and existing patterns.
- Define validation at every untrusted boundary: import, storage read, URL, file, model output.
- Define the failure mode: reject, preserve old data, show a plain error, never partially write.
- Define the test level: domain unit, application integration, Playwright, or manual attestation.

**Gate:** the design has a threat-model entry, a validation rule, and a rollback path.

### 3. Build

- Tests first where practical.
- No new runtime dependency without a recorded decision.
- No third-party runtime origin.
- No `dangerouslySetInnerHTML`, `eval`, `new Function`, or remote script.
- No secret in the app, repository, logs, or prompt.
- Keep the diff small. The loop cap is 400 changed lines and 12 files.

**Gate:** local `npm run verify` passes; the diff contains no protected-path change without human review.

### 4. Verify

- Run the required checks in [verification.md](verification.md).
- Run the abuse cases in [threat-model.md](threat-model.md).
- Confirm the production artifact, not only the dev server, has the expected CSP and no third-party origin.
- Confirm coverage has not fallen.
- Record what was not verified.

**Gate:** all required checks are green; evidence is linked; no unexplained skip.

### 5. Review

- The reviewer checks scope, data flow, validation, tests, and docs.
- Security-sensitive changes require a human reviewer with write access.
- The reviewer rejects a PR that weakens a test, hides a failure, or adds scope.
- The loop cannot approve or merge a security, dependency, workflow, storage, permission, or release change.

**Gate:** at least one human approval for risky work; CODEOWNERS approval for protected paths.

### 6. Release

- Run the release check on a clean tree.
- Verify the Pages artifact, service worker, CSP, fonts, and offline reload.
- Generate an SBOM and provenance attestation for the artifact.
- Confirm no waiver or attestation is expired.
- Tag only after the release checklist is signed.

**Gate:** release evidence is recorded; a failed or unknown gate blocks the release.

### 7. Operate and improve

- Secret scanning, Dependabot, CodeQL, and the drift audit run on schedule.
- A high or critical finding is handled through [incident-response.md](incident-response.md).
- A confirmed defect gets a regression test and a threat-model update.
- A repeated failure triggers a process change, not just a fix.

**Gate:** the post-incident review is complete and the control map is updated.

## Risk classification

| Label | Examples | Review | Auto-merge |
|---|---|---|---|
| `risk:low` | Copy, docs, a small tested UI fix, a non-security refactor with no behavior change | CI + human spot-check | Only on green CI, never for a manual loop run |
| `risk:medium` | New component, non-trivial logic, a new test helper, a visual change | Human review | No |
| `risk:high` | Security, dependencies, workflows, permissions, storage, migrations, import/export, encryption, release, branch protection, user data | Human review + CODEOWNERS | Never |

If the label is wrong, the higher classification wins. The loop must not downgrade its own risk.

## Protected paths

These paths require human review and are never auto-merged:

```text
.github/**
security/**
CODEOWNERS
AGENTS.md
docs/security/**
docs/reference/security.md
docs/reference/ai-development.md
scripts/loop/**
scripts/ops/**
package.json
package-lock.json
vite.config.*
index.html
public/manifest.webmanifest
src/infrastructure/export/**
src/infrastructure/db/**
```

The exact list lives in `security/policy.json` once the operations plan creates it. Until then, this list is the contract. The loop must fail closed if the policy file is missing.

## Waivers

A waiver is a last resort, not a preference.

- Critical: never waivable.
- High: at most 30 days; owner, compensating control, and fix plan required.
- Medium: at most 90 days.
- Low: no waiver; schedule the fix.
- A waiver must name the control, finding, scope, owner, approval, start, expiry, and compensating control.
- The agent may not create, edit, approve, or extend a waiver.
- An expired waiver fails the `security-policy` check.
- The waiver is public in `security/waivers/` unless it contains sensitive detail; even then, the existence and owner are public.

See [waivers/README.md](waivers/README.md).

## Attestations

Some controls cannot be proven by CI, such as "the human reviewed the threat model" or "the token scope was checked in GitHub settings."

- Each attestation is dated, named, and linked to evidence.
- It expires after 90 days unless the cadence says otherwise.
- An expired attestation fails the drift audit and pauses the loop.
- The template is in [attestations/README.md](attestations/README.md).

## Self-correction

The process is designed to notice its own drift:

1. `security-policy` checks the repository against `security/policy.json`.
2. `drift-audit` checks branch protection, required checks, secret scanning, Dependabot, pins, waivers, attestations, and Scorecard on a schedule.
3. Any mismatch opens a `security:drift` issue, applies `loop:paused`, and fails the audit.
4. The loop refuses to run while `security:drift` is open or `PAUSE` exists.
5. A human fixes the drift, records evidence, and removes the pause.
6. A repeat of the same drift is an incident, not a normal fix.

The loop cannot resolve its own drift. That is deliberate.

## Change control for this document

Changing this document, the control map, the waiver policy, branch protection, or the required checks is a `risk:high` change. It needs a human review and a decision-log update. The loop may open the PR; a human merges it.

## References

- [NIST SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final)
- [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Top 10:2025](https://owasp.org/Top10/2025/)
- [SLSA 1.2](https://slsa.dev/spec/v1.2/)
- [OpenSSF Scorecard](https://github.com/ossf/scorecard)
- [GitHub Actions security hardening](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)
- [Security reference](../reference/security.md)
