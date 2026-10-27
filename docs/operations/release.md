# Release

TEMPO ships as a static PWA on GitHub Pages. There is no app store, no paid account, and no server. A release is a green `main`, a deployed artifact, and a changelog entry.

## The path to production

```text
pull request
  → fourteen required checks green
  → squash merge to main
  → CI runs again on main
  → Deploy (on CI success) builds with VITE_BASE=/tempo/
  → check:pwa, SBOM, provenance attestation
  → upload-pages-artifact → deploy-pages
  → smoke test: the deployed page contains "TEMPO"
```

`deploy.yml` triggers on `workflow_run` for a completed CI run on `main` and only proceeds when that run concluded `success`. A red `main` never deploys.

## Versioning

- Version lives in `package.json`, the About sheet, and `CHANGELOG.md`.
- The service worker uses `registerType: 'prompt'`: the user decides when to reload. A deploy never reloads an open app.
- A schema change needs a new Dexie version, a migration test, and human review. Data loss is never acceptable in a release.

## Cutting a release

1. Confirm `main` is green and the latest Pages deploy answered.
2. Update `CHANGELOG.md`: move `Unreleased` items under the new version and date.
3. Bump `package.json` and `APP_VERSION` in `src/app/App.tsx`.
4. Run the release check:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/ops/release-check.ps1
   ```

   It runs `verify`, `e2e`, `a11y`, `visual`, and `lighthouse`, then fails if any command changed the working tree. It does not tag or push.

5. Open a pull request with the changelog and the version bump. Merge on green.
6. Tag the merge commit:

   ```powershell
   git tag -s v0.2.0 -m "TEMPO 0.2.0"
   git push origin v0.2.0
   ```

7. Confirm the Deploy run for that commit succeeded and the smoke test passed.
8. Run the manual iPhone checklist in [`docs/TESTING.md`](../TESTING.md#manual-iphone-checklist) against the deployed URL.

## Rollback

Pages serves the last successful artifact. To roll back:

1. Revert the offending commit on `main` through a pull request (never force-push).
2. Wait for CI and Deploy to finish.
3. Confirm the smoke test and re-run the iPhone checklist for the affected area.

A rollback is still a normal release: it needs the required checks.

## What a release never does

- It never deploys from a branch other than `main`.
- It never skips a required check.
- It never ships a secret. The app has no secret to ship; the workflows use `GITHUB_TOKEN` with least privilege.
- It never adds a third-party runtime origin. The published artifact loads only its own files.
- It never changes user data without a migration and a human review.

## Artifacts

| Artifact | Where | Retention |
|---|---|---|
| Pages site | `https://simangaliso-njabulo.github.io/tempo/` | Until the next deploy |
| `sbom.cdx.json` | Deploy and `security-supply-chain` artifacts | 90 days |
| Build provenance | GitHub attestations | As long as the repository exists |
| `lighthouse-report.html` | `lighthouse` job artifact | 90 days |
| Coverage | `unit` job artifact | 90 days |
| Playwright report | failure artifacts only | 90 days |

## First deploy

The first deploy is also the proof that the project-path base works. Check `/tempo/` in every asset URL, that the manifest `start_url` and `scope` resolve under `/tempo/`, and that the installed Home Screen app still loads offline.
