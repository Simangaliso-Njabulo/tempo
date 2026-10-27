# Repository operations

- Owner/repository: `Simangaliso-Njabulo/tempo`
- Visibility: public (D-031). The release checklist below still runs before the first public deploy.
- Default branch: `main`
- Pages URL: <https://simangaliso-njabulo.github.io/tempo/>
- Pages base path: `/tempo/`
- Merge method: squash only
- Branch deletion: on merge
- Auto-merge: allowed, but only for `risk:low` with every required check green
- Direct pushes to `main`: forbidden after protection is enabled
- Force pushes and branch deletion: forbidden
- Linear history: required
- CODEOWNERS: the maintainer reviews every protected path
- Required checks: the fourteen jobs in `.github/workflows/ci.yml` and `.github/workflows/security.yml`
- Dependabot: npm daily, GitHub Actions weekly, grouped, always `risk:high`
- Secret scanning: enabled, with push protection
- Private vulnerability reporting: enabled
- Dependabot alerts and security updates: enabled
- Default workflow token: read-only; pull-request approval is not granted
- Actions: restricted to selected creators (GitHub-owned, `ossf/scorecard-action@*`), full SHA pinning required
- CodeQL: JavaScript/TypeScript, `security-extended`
- Loop token: fine-grained, least privilege, stored in the loop user's environment

## Bootstrap

The first push is a human action: branch protection cannot exist before the branch does.

```powershell
gh auth status
git remote add origin https://github.com/Simangaliso-Njabulo/tempo.git
git push -u origin main
```

Then run the settings scripts in this order:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ops/configure-repo.ps1 -Owner Simangaliso-Njabulo -Repo tempo
powershell -ExecutionPolicy Bypass -File scripts/ops/create-labels.ps1
powershell -ExecutionPolicy Bypass -File scripts/ops/enable-pages.ps1 -Owner Simangaliso-Njabulo -Repo tempo
```

Protect `main` only after all fourteen checks have run at least once on a pull request. GitHub rejects a required check it has never seen.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ops/configure-branch-protection.ps1 -Owner Simangaliso-Njabulo -Repo tempo
powershell -ExecutionPolicy Bypass -File scripts/ops/verify-security-settings.ps1 -Owner Simangaliso-Njabulo -Repo tempo
```

## Public-release checklist

Run this before the first public deploy and after any change to the licence, the security policy, or the deployment workflow.

- [ ] `LICENSE` names the copyright holder and the year (MIT, D-031).
- [ ] `SECURITY.md` explains private reporting and links a working advisory form.
- [ ] `CHANGELOG.md` describes the release.
- [ ] `npm run verify` passes.
- [ ] `npm run test:coverage` passes every threshold.
- [ ] `npm run test:e2e`, `npm run test:a11y`, and `npm run test:visual` pass on `webkit-iphone`.
- [ ] `npm run lighthouse` meets Performance 95, Accessibility 100, Best Practices 100.
- [ ] `npm run verify:security` passes with `actionlint` and `gitleaks` installed.
- [ ] The production artifact has the approved CSP, no inline script, and no third-party origin.
- [ ] No secret, token, or personal plan data appears in the diff, the history, or a screenshot.
- [ ] Branch protection and secret scanning are verified by `verify-security-settings.ps1`.
- [ ] The Pages deployment answers at the published URL.

## Labels

`scripts/ops/create-labels.ps1` is the single source. It creates:

| Label | Meaning |
|---|---|
| `loop:approved` | Human-approved work the loop may implement |
| `loop:proposed` | Audit proposal; a human must promote it |
| `loop:pr` | A pull request opened by the loop |
| `loop:blocked` | The loop is blocked or its circuit breaker is open |
| `risk:low` | Eligible for auto-merge on green CI |
| `risk:medium` | Human review required |
| `risk:high` | Human review always; never auto-merged |
| `security:drift` | The posture drifted from policy; loop paused |
| `loop:paused` | Stop the loop until a human clears this |
| `dependencies`, `security` | Supply-chain and security changes |

## Settings drift

`.github/workflows/drift-audit.yml` runs `scripts/ops/verify-security-settings.ps1` daily. A missing setting, an expired waiver, or a stale attestation opens a `security:drift` issue with `loop:paused` and fails the audit. The loop reads the open issue and refuses to run.

## Rotating the loop token

1. Create a new fine-grained token with the minimum scopes in `docs/loop/README.md`.
2. Set `GH_TOKEN` for the loop user.
3. Revoke the old token.
4. Run `scripts/loop/run.ps1 -DryRun` and confirm it selects one issue.

The token never enters the repository, a workflow file, a log, or a prompt.
