# Security waivers

**Status:** approved 2026-10-25. A waiver is a dated, owned exception. It is never a silent skip.

## Rules

- **Critical:** never waivable.
- **High:** maximum 30 days. Owner, compensating control, and fix issue required.
- **Medium:** maximum 90 days.
- **Low:** no waiver. Schedule the fix.
- Only the maintainer may approve a waiver.
- The agent may not create, edit, approve, extend, or delete a waiver.
- A waiver must be public unless it contains sensitive exploit detail. Even then, its ID, control, severity, owner, and expiry are public.
- An expired or malformed waiver fails `security-policy` and pauses the loop.
- A waiver cannot disable a required check. It documents why a specific finding is accepted while the check stays active.
- A waiver cannot cover a missing branch protection, secret scanning, or required check. Fix those.

## Location

```text
security/waivers/
  WVR-2026-001.json
  WVR-2026-002.json
```

Use one JSON file per waiver. The JSON is the machine-validated record; the issue holds the narrative. Do not edit an old waiver to extend it; create a new one with a new ID and link the old one.

## Schema

```json
{
  "id": "WVR-2026-001",
  "control": "SEC-08",
  "finding": "GHSA-xxxx-xxxx-xxxx in example-package",
  "severity": "high",
  "status": "approved",
  "scope": "production",
  "package": "example-package@1.2.3",
  "reason": "The vulnerable function is not reachable; the app never calls it.",
  "compensatingControl": "The package is pinned, the import is blocked by lint, and a test asserts the function is absent.",
  "owner": "@maintainer",
  "approver": "@maintainer",
  "approvedAt": "2026-10-25",
  "expires": "2026-11-24",
  "fixIssue": "#123",
  "evidence": ["https://github.com/<owner>/tempo/issues/123"]
}
```

Allowed values:

- `status`: `approved`, `expired`, `revoked`.
- `severity`: `high`, `medium`.
- `scope`: `production`, `development`, `ci`, `build`.
- Dates are ISO `YYYY-MM-DD`. `expires` is the field the checker reads.
- `owner` and `approver` are GitHub handles; `approver` is required.
- `evidence` is a non-empty array of durable links or paths.

## Approval flow

1. Open an issue with the finding, evidence, reachability, and proposed compensating control.
2. The maintainer reviews the risk and the fix plan.
3. If approved, the maintainer adds the YAML file and a control-map note.
4. CI validates the schema, severity, dates, and owner.
5. The drift audit warns at 14 days and fails at expiry.
6. The fix lands. The waiver is marked `revoked` or left to expire, then removed after the evidence is recorded.

## What a waiver does not do

- It does not make the finding safe.
- It does not remove the check.
- It does not cover a different version, package, or code path.
- It does not survive a major upgrade.
- It does not transfer to a fork or a different deployment.

## Validation

`security-policy` checks:

- The file parses and matches the schema.
- `severity` is `high` or `medium`.
- `high` expires within 30 days of approval.
- `medium` expires within 90 days.
- `approver` is the maintainer.
- `expires` is not in the past.
- `control` exists in [controls.md](../controls.md).
- `fixIssue` is present.
- The agent did not author the file (checked against the commit author and the loop's audit log).

A malformed waiver is a failure, not a warning.
