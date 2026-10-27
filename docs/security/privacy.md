# TEMPO privacy and data protection

**Status:** approved 2026-10-25 (D-035). This document is binding for storage, import/export, logging, and release decisions.

## Principles

- Local-only. IndexedDB is the source of truth. There is no TEMPO server, account, sync, push, analytics, or tracking.
- Collect only what the user types: tasks, routines, blocks, breaks, settings, and the dates needed to plan.
- Do not send plan data anywhere. No telemetry, crash reporting, remote config, ads, or third-party SDK.
- The user can export, replace, and clear their data without asking anyone.
- A backup is only useful if it can be restored. Test both directions.

## Data inventory

| Data | Where | Why | Retention |
|---|---|---|---|
| Tasks, blocks, routines, routine exceptions | IndexedDB on the device | The planner | Until the user deletes it or clears site data |
| Settings and meta | IndexedDB | Theme, install state, schema version | Same |
| JSON backup | User-selected file | Portability and recovery | User-controlled |
| Encrypted backup | User-selected file | Safer portability | User-controlled |
| `.ics` export | User-selected file | Calendar handoff | User-controlled |
| Loop audit log | Local machine, outside the repo | Accountability | 30 days, longer only for an incident |
| Build logs and artifacts | GitHub | CI evidence | GitHub retention |

No data is stored in URLs, cookies, localStorage, sessionStorage, or a remote service. No plan data is allowed in an issue, PR, commit, screenshot, model prompt, or log.

## Live data at rest

Live IndexedDB data is protected by the iOS app sandbox and the device passcode. TEMPO does not add a passphrase to live data in v1.

- The app must not claim that live data is encrypted by TEMPO.
- The install and settings copy tells the user to use a device passcode and to keep an encrypted backup.
- Clearing site data or deleting the app deletes the local plan. The UI warns before a destructive clear.
- There is no recovery service. If the device is lost and there is no backup, the data is gone.

This is a deliberate scope decision. Live-data passphrase encryption is deferred to v1.1 and needs its own threat model, unlock flow, performance budget, and migration plan.

## Encrypted backup (v1)

The encrypted backup is optional and protects data that leaves the device.

### Envelope

```json
{
  "format": "tempo-encrypted-backup",
  "version": 1,
  "kdf": "PBKDF2-SHA-256",
  "iterations": 600000,
  "cipher": "AES-256-GCM",
  "salt": "<base64, 16 bytes>",
  "iv": "<base64, 12 bytes>",
  "aad": "<base64 of the canonical header>",
  "ciphertext": "<base64>",
  "createdAt": "2026-10-25T12:00:00.000Z"
}
```

The plaintext is the normal `BackupFile` JSON. The header fields that are not secret are authenticated as additional data, so changing the KDF parameters, version, or cipher is detected.

### Rules

- Use Web Crypto (`crypto.subtle`), not a hand-rolled cipher.
- PBKDF2-HMAC-SHA-256, 600,000 iterations, 16-byte random salt.
- AES-256-GCM, 12-byte random IV, 128-bit tag. Never reuse an IV with the same key.
- Passphrase minimum 12 characters. Show strength guidance, not a fake score. Do not store or log it.
- No compression before encryption in v1. It adds a parser attack surface for little benefit at this size.
- Cap the encrypted file at 10 MB and the decoded plaintext at 10 MB before parsing.
- Reject an unknown `format`, `version`, `kdf`, or `cipher` before doing expensive work.
- A wrong passphrase and a tampered ciphertext both fail with the same generic message. Do not build an oracle.
- Validate the decrypted `BackupFile` with the same strict schema as a plaintext import. Decryption is not validation.
- Import is transactional. A failure leaves the previous data intact.
- The user confirms a replace import. A merge import never silently overwrites a newer record.
- The passphrase is never placed in a URL, query string, clipboard by default, telemetry, or log.

### Tests

- Round-trip encrypt/decrypt produces an identical backup.
- Wrong passphrase fails with the generic error.
- A flipped ciphertext bit fails authentication.
- Changed AAD, salt, IV, version, or iterations fails.
- A 10 MB + 1 byte file is rejected before decryption.
- Decrypted but invalid JSON is rejected before a write.
- A replace import that fails halfway leaves the old data intact.

## Plaintext JSON backup

- The UI labels it clearly: "Not encrypted. Anyone with the file can read your plan."
- The user chooses the file name; the app sanitises it and never uses a path from user input.
- JSON is generated from typed records, not string concatenation.
- No HTML, script, or executable content is added.
- The export is a snapshot; it does not include secrets or device identifiers.

## `.ics` export

- Escape backslash, semicolon, comma, and newline per RFC 5545.
- Fold lines at 75 octets.
- Remove control characters that are not allowed.
- Use floating local times (`DTSTART:YYYYMMDDTHHMMSS`) so the event stays in the user's local day.
- Do not include notes, locations, attendees, or a URL in v1.
- The file is a one-way handoff. It is not a sync channel.

## Logging and diagnostics

- The app does not log task titles or plan content.
- Error messages shown to the user are plain and actionable; they do not include stack traces or data.
- The loop log is redacted JSONL: run ID, issue number, model, tool names, changed files, check results, outcome. No tokens, cookies, prompts with personal data, or full environment.
- CI logs must not print secrets. Use `::add-mask::` where a value is unavoidable, and prefer not to handle it at all.
- A screenshot used for visual regression uses fixture data, never a real plan.

## User controls

- Export plaintext JSON.
- Export encrypted backup.
- Import with replace or merge, after confirmation.
- Clear all data, with a confirmation that explains it cannot be undone.
- Choose theme.
- No account, no email, no profile.

## Third parties

- GitHub hosts the public static app and the repository. It does not receive plan data from the app.
- The model provider used by the loop may receive repository and issue text. It must not receive secrets or plan data. The provider is disclosed in `docs/reference/ai-development.md`.
- There is no analytics, crash, font, image, or script third party at runtime.

## Incident

A privacy incident follows [incident-response.md](incident-response.md). If personal data reached a commit, issue, log, or model provider, treat it as a data-disclosure incident even if the repository is private.

## Review

Review this document before any storage change, export format change, encryption change, new log field, new third party, or release. Update the threat model and controls in the same change.
