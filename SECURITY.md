# Security policy

TEMPO is a local-first daily planner PWA. It has no backend, accounts, sync, push, analytics, or tracking. Plan data stays in the browser's IndexedDB on the user's device unless the user exports it.

## Supported versions

| Version | Supported |
|---|---|
| `0.1.x` (pre-release and v1) | Yes |
| Older pre-release builds | No |

There is no hosted service to patch. The supported version is the current `main` and the latest deployed Pages build.

## Reporting a vulnerability

**Please do not open a public issue with exploit details, secrets, or personal data.**

Use the **Security** tab of this repository and choose **Report a vulnerability** to open a private GitHub security advisory. If that is unavailable, open a minimal public issue asking for a private contact channel without disclosing the vulnerability.

Include:

- What you tested and the result.
- The affected version or commit.
- The smallest reproduction, with fixture data only.
- The impact you believe it has.
- Whether you want credit.

Do not include real plan data, device identifiers, tokens, or another person's information.

## What is in scope

- The PWA and its service worker.
- Import, export, encrypted backup, and `.ics` handling.
- The production build and GitHub Pages artifact.
- GitHub Actions, branch protection, and release configuration.
- The local improvement loop, its tools, token scope, and audit log.
- Dependency and supply-chain issues that affect the app or release.

## What is out of scope

- A lost or stolen **unlocked** device. Live data is protected by the iOS device passcode and app sandbox, not by a TEMPO passphrase in v1.
- GitHub platform vulnerabilities. Report those to GitHub.
- The model provider's own service. Report those to the provider.
- Social engineering, physical access, or denial of service against a third party.
- Issues that require the user to install a malicious browser extension or jailbreak the device.
- Missing security headers that GitHub Pages cannot set. This is a documented residual risk in `docs/security/threat-model.md`.

## What to expect

- Acknowledgement within 3 business days.
- An initial assessment within 7 business days.
- A fix or a written plan for high and critical issues as soon as practical.
- A private advisory and a coordinated disclosure date after a fix.
- Credit if you want it.

No bug bounty is offered. Do not imply or assume one.

## Safe harbour

We will not pursue legal action for good-faith security research that:

- Avoids privacy harm, data destruction, and service disruption.
- Uses only your own device, account, and data.
- Does not access another person's data.
- Gives us a reasonable chance to fix the issue before public disclosure.
- Follows this policy.

This is not a legal contract or a waiver of any third party's rights.

## Security documentation

- [Security program](docs/security/README.md)
- [Threat model](docs/security/threat-model.md)
- [Agent threat model](docs/security/agent-threat-model.md)
- [Controls](docs/security/controls.md)
- [Verification](docs/security/verification.md)
- [Incident response](docs/security/incident-response.md)
- [Privacy and data protection](docs/security/privacy.md)

## Our commitments

- No secrets in the app.
- No third-party runtime origin.
- No analytics or tracking.
- Security-sensitive changes need human review and never auto-merge.
- Every exception is dated and expires.
