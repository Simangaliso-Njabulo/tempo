# Security attestations

**Status:** approved 2026-10-25. Attestations cover controls that CI cannot prove by itself.

## Rules

- Every attestation is dated, scoped, owned, and linked to evidence.
- The default expiry is 90 days.
- An expired attestation fails the drift audit and pauses the loop.
- The attester must have actually checked the evidence. Copying last quarter's statement is a false attestation.
- The agent may not create, edit, approve, or extend an attestation.
- Store one JSON record per attestation under `security/attestations/`, plus an optional Markdown narrative under `docs/security/attestations/` when the evidence needs prose. The checker reads only the JSON record:

```text
security/attestations/
  ATT-2026-001-branch-protection.json
  ATT-2026-002-loop-token.json
  ATT-2026-003-threat-model.json
  ATT-2026-004-asvs.json
  ATT-2026-005-device-test.json
```

## Record

```json
{
  "id": "ATT-2026-001",
  "control": "SEC-12",
  "owner": "@maintainer",
  "approver": "@maintainer",
  "attestedAt": "2026-10-25",
  "expires": "2027-01-23",
  "scope": "main on the public repository",
  "summary": "Required checks, strict status checks, no force-push, no deletion, admin enforcement, CODEOWNERS, secret scanning, Dependabot alerts, and private vulnerability reporting are configured.",
  "evidence": [
    "https://github.com/<owner>/tempo/actions/runs/<id>",
    "docs/security/evidence/ATT-2026-001-settings.json"
  ],
  "notVerified": [
    "GitHub platform-side enforcement cannot be tested from the repository alone."
  ]
}
```

`attestedAt` and `expires` are ISO `YYYY-MM-DD`. `expires` must be within 90 days of `attestedAt`. `evidence` is a non-empty array of durable links or committed files with secrets removed. The agent may not write this file.

## Required attestations

| Control | What | Cadence |
|---|---|---|
| SEC-09 | Secret scanning, push protection, and no secret in the repository | 90 days |
| SEC-12 | Branch protection, required checks, CODEOWNERS, admin enforcement | 90 days |
| SEC-13 | Auto-merge boundary and protected paths are still configured | 90 days |
| SEC-15 | Waivers and attestations are current | 90 days |
| SEC-21 | Loop user, token scope, tool allowlist, and audit log | 90 days |
| SEC-23 | Drift audit is running and its findings are handled | 90 days |
| SEC-25 | ASVS Level 2 assessment and N/A justifications | Each major release |
| SEC-17 | Device and encrypted-export recovery test on a real iPhone | Each release |

## Evidence links

Prefer durable evidence:

- A workflow run URL.
- A committed JSON export of repository settings, with secrets removed.
- A screenshot stored outside the public repository if it contains account details.
- A command output file with the date and commit SHA.

Do not paste tokens, cookies, personal data, or screenshots of a real plan.

## Failure

A missing, expired, or contradicted attestation is a drift finding. The loop pauses. The maintainer either re-verifies and updates the attestation, or records a waiver where a waiver is allowed. A critical control cannot be waived.
