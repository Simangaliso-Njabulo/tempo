# Security policy

TEMPO is a local-first PWA. It has no backend, accounts, sync, push, analytics, or tracking. The main risks are local data loss, a malicious dependency, and a compromised build.

## Reporting

Report a vulnerability privately through GitHub Security Advisories for this repository. Do not open a public issue for a vulnerability.

Include the affected version, the impact, and the smallest reproduction you can share. Do not include personal plan data or tokens.

## Scope

- The app shell, service worker, IndexedDB handling, import/export, and `.ics` output.
- The GitHub Actions workflows and Pages deployment.
- The loop runner and its token scope.

Out of scope for v1: a hosted backend, accounts, sync, push, and native app distribution. Those do not exist.

## Supported versions

The `main` branch is the only supported version. Fixes land through a pull request and deploy to GitHub Pages after the required checks pass.
