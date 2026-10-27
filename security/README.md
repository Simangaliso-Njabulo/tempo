# Machine-readable security records

This directory holds the records that `scripts/security/check-policy.mjs` reads. Prose belongs in `docs/security/`; this directory is data.

| Path | Purpose |
|---|---|
| `policy.json` | The enforced contract: required checks, protected paths, the exact CSP, waiver and attestation windows, and the loop's file and line limits. |
| `waivers/` | Time-boxed exceptions. One JSON file per waiver. Created and approved only by a human. |
| `attestations/` | Dated human attestations for controls that cannot be automated. One JSON file per attestation, 90-day expiry. |

## Rules

- An agent may not create, edit, extend, or delete a waiver or an attestation.
- A critical finding is never waived.
- A high waiver lasts at most 30 days; a medium waiver at most 90 days; low findings are fixed, not waived.
- Every waiver and attestation names the control, the finding, the scope, the owner, the approver, the dates, the compensating control, and the fix issue.
- An expired or malformed record fails `security-policy` and pauses the loop.

## Records a release needs

| Control | Record | Owner |
|---|---|---|
| SEC-16 (build provenance) | Platform attestation, verified per release | Maintainer |
| SEC-17 (local data at rest) | Device-sandbox attestation | Maintainer |
| SEC-20 (no personal data in prompts and logs) | Privacy attestation | Maintainer |
| SEC-25 (ASVS Level 2) | `asvs-YYYY-MM-DD.json` pointing at [`docs/security/asvs.md`](../../docs/security/asvs.md) | Maintainer |

## policy.json is the only source

`security-policy` reads `policy.json` and nothing else for the required checks, the protected paths, and the CSP. `scripts/ops/configure-branch-protection.ps1` and `scripts/ops/verify-security-settings.ps1` both read it, so a change to the contract lands in three places at once or not at all.
