# Security controls

**Status:** specified 2026-10-25. Each control is `planned` until its verification is observed and recorded. Do not mark a control `active` because a document describes it.

## How to use this map

- Every change names the control IDs it touches.
- Every control has one verification path: an automated check, a test, or a dated human attestation.
- A control that cannot be automated is not ignored; it gets an attestation with an owner and expiry.
- A control failure blocks merge, release, or the loop according to its severity.
- `N/A` is allowed only with a reason, and only for a control that genuinely does not apply.

## Control catalogue

| ID | Control | Standard mapping | Implementation | Verification | Status |
|---|---|---|---|---|---|
| SEC-01 | Threat model and data-flow review before a new boundary | SSDF PW.1, PW.2; ASVS V1, V15 | `docs/security/threat-model.md`, `agent-threat-model.md`; review trigger in PR template | PR checklist + human review; drift audit checks last review date | Planned |
| SEC-02 | Security requirements and honest risk classification | SSDF PO.1, PS.2; ASVS V1 | Issue/PR risk label; `AGENTS.md`; this map | `security-policy` checks label and required sections | Planned |
| SEC-03 | Architecture boundaries cannot be bypassed | SSDF PW.5; ASVS V1, V15 | ESLint `no-restricted-imports`; domain purity; ports | `lint` | Planned |
| SEC-04 | Untrusted input is validated before use or write | SSDF PW.5, PW.7; ASVS V2, V5 | Backup schema validator; range and size limits; `.ics` escaping; no dynamic HTML | `unit`, `security-static`, import abuse tests | Planned |
| SEC-05 | Output is encoded for its context | ASVS V1; OWASP Top 10 A03 | React escaping; no `dangerouslySetInnerHTML`; CSS Modules; escaped export fields | `lint`, `security-static`, XSS tests | Planned |
| SEC-06 | Strict production CSP and no third-party runtime origin | ASVS V1, V3; OWASP Top 10 A02, A05 | Meta CSP; self-hosted assets; external boot CSS; `connect-src 'self'`; no inline script | `security-policy` inspects built `index.html`; Playwright network assertions | Planned |
| SEC-07 | Dependencies are locked, reviewed, and inventoried | SSDF PS.1, PS.3, PW.4; ASVS V14, V15 | `package-lock.json`; licence allowlist from the lockfile; Dependabot; OSV-Scanner; SBOM; shipped notices | `security-supply-chain` | Planned |
| SEC-08 | Known-vulnerable dependencies block merge | SSDF RV.1; ASVS V14 | `npm audit --audit-level=high`; OSV-Scanner; Dependabot alerts | `security-supply-chain` | Planned |
| SEC-09 | Secrets never enter the repository or logs | SSDF PS.6, RV.1; ASVS V2, V7, V16 | No app secrets; token outside repo; secret scanning + push protection; Gitleaks; redacted loop log | `security-secrets`; GitHub settings attestation | Planned |
| SEC-10 | Static analysis runs on every change and on schedule | SSDF PW.7, RV.1; ASVS V1, V5 | CodeQL JavaScript/TypeScript; security-extended queries | `security-static` (PR + schedule) | Planned |
| SEC-11 | Workflows are hardened and pinned | SSDF PW.6, PS.5; ASVS V14 | Full-SHA action pins; least-privilege `permissions`; no `pull_request_target` with untrusted code; `actionlint`; `zizmor` | `security-workflows` | Planned |
| SEC-12 | Branch protection and review are enforced | SSDF PO.5, PS.2; ASVS V1, V15 | Required checks; linear history; no force-push; CODEOWNERS; admin enforcement | `scripts/ops/verify-security-settings.ps1`; drift audit | Planned |
| SEC-13 | Security-sensitive changes need a human merge | SSDF PO.5; ASVS V1 | Protected paths; auto-merge boundary; CODEOWNERS | `security-policy`; branch protection audit | Planned |
| SEC-14 | Exceptions are explicit, owned, and expiring | SSDF PO.3, PO.5; ASVS V1 | `security/waivers/`; schema; severity limits; agent cannot edit | `security-policy`; drift audit | Planned |
| SEC-15 | Non-automatable controls have dated attestations | SSDF PO.5; ASVS V1 | `security/attestations/`; 90-day expiry | Drift audit | Planned |
| SEC-16 | Builds are reproducible enough to verify and have provenance | SSDF PS.3, PW.4; SLSA Build L2 | `npm ci`; clean runner; CycloneDX SBOM; `actions/attest`; Pages artifact digest | `security-supply-chain`; release check; attestation verification | Planned |
| SEC-17 | Local data is protected at rest by the platform and an optional encrypted export | ASVS V14; OWASP Top 10 A02 | IndexedDB in the iOS app sandbox; no data in URLs; Web Crypto AES-GCM + PBKDF2 export; no plaintext logs | Unit tests; manual device test; privacy attestation | Planned |
| SEC-18 | Imports fail closed and preserve the previous data | ASVS V2, V5; OWASP Top 10 A08 | Validate all fields; cap size and arrays; reject unknown keys; transactional replace; confirm destructive import | Import abuse tests; `unit` | Planned |
| SEC-19 | Exports are escaped and bounded | ASVS V1, V5 | RFC 5545 escaping and folding; JSON only; no HTML; filename sanitisation | `.ics` tests; export tests | Planned |
| SEC-20 | No personal data in prompts, issues, logs, screenshots, or analytics | ASVS V14; privacy | Data minimisation; redaction; no analytics; fixture data only; log schema | `security-secrets`; PR review; privacy attestation | Planned |
| SEC-21 | Agent scope, identity, and tools are constrained | OWASP ASI01-ASI10; SSDF PO.5 | Dedicated user; fine-grained token; tool allowlist; protected paths; diff caps; `PAUSE`; lock; circuit breaker; audit log | Runner tests; drift audit; `security-policy` | Planned |
| SEC-22 | Prompt injection cannot expand scope or grant authority | OWASP ASI01, ASI06, ASI09 | Fixed prompt; untrusted content fencing; `loop:approved` recheck; no auto-merge for risky work; human merge | Prompt-injection tests; PR review | Planned |
| SEC-23 | The security posture is audited for drift | SSDF PO.5, RV.3; OpenSSF Scorecard | `drift-audit.yml`; Scorecard; settings verifier; `security:drift` issue; pause | Scheduled workflow; attestation | Planned |
| SEC-24 | Vulnerabilities can be reported and handled privately | SSDF RV.2, RV.3 | `SECURITY.md`; GitHub private advisory; incident playbooks; disclosure window | `security-policy`; manual test of advisory link | Planned |
| SEC-25 | ASVS Level 2 is assessed with justified N/A | ASVS 5.0 | `docs/security/asvs.md` (created with the assessment); evidence per chapter | Human attestation; re-assessment each major release | Planned |
| SEC-26 | Security tests cover the abuse cases, not just the happy path | SSDF PW.8, RV.1 | XSS, import, `.ics`, CSP, encryption, offline tests | `unit`, `e2e`, `security-policy` | Planned |
| SEC-27 | OpenSSF Best Practices Badge is pursued and kept passing | SSDF PO.5 | Repository metadata, security policy, release notes, test evidence | Badge status; drift audit link | Planned |
| SEC-28 | Security findings have SLAs and a regression test | SSDF RV.1, RV.3 | Severity table in `README.md`; issue labels; post-incident review | Drift audit; issue age report | Planned |

## Standards coverage

| Standard | TEMPO position |
|---|---|
| NIST SSDF 1.1 | Adopted. All PO, PS, PW, and RV practices are mapped above. The solo-maintainer context is recorded as a residual risk. |
| OWASP ASVS 5.0 Level 2 | Target. Some chapters are N/A because there is no server, login, session, API, or multi-user authorization. The assessment records each N/A. |
| OWASP Top 10:2025 | Used as a threat lens. A01, A02, A03, A05, A06, A08, and A10 are the main exposures; the rest are mostly N/A. |
| OWASP Top 10 for Agentic Applications 2026 | Adopted for the loop. ASI01-ASI06 and ASI08-ASI10 apply; ASI07 is N/A in v1 (single agent). |
| OWASP AI Agent Security Cheat Sheet | Used for tool least privilege, human approval, sandboxing, logging, and prompt-injection handling. |
| SLSA Build L2 | Target for the Pages artifact. Hosted GitHub Actions, `npm ci`, SBOM, provenance, and a protected source branch. |
| OpenSSF Scorecard | Scheduled; findings inform hardening, but a score is not a substitute for the controls. |
| OpenSSF Best Practices Badge | Passing level target; evidence is public. |
| Wiz | Not a dependency. Optional manual review only. No required secret or paid tier. |

## Evidence format

A PR or release records:

```text
Control(s): SEC-06, SEC-26
Decision(s): D-032, D-034
Reference(s): docs/reference/security.md; OWASP ASVS 5.0 V1/V3
Verified: command, result, artifact digest or screenshot path
Not verified: what remains, owner, follow-up issue
```

An attestation records the same, plus reviewer, date, and expiry.

## Review

Review this map when a control is added, removed, automated, waived, or found ineffective. A control that has never been verified is a claim, not a control.
