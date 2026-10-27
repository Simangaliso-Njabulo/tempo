# CI contract

`main` is protected. A pull request is ready only when all fourteen required checks pass.

## Required checks

| Check | Workflow | Proves |
|---|---|---|
| `lint` | `ci.yml` | Style, layer boundaries, unsafe-pattern rules |
| `typecheck` | `ci.yml` | TypeScript |
| `unit` | `ci.yml` | Vitest with coverage thresholds |
| `e2e` | `ci.yml` | Playwright WebKit iPhone journeys |
| `a11y` | `ci.yml` | axe, zero serious or critical |
| `build` | `ci.yml` | Production build and PWA artifacts |
| `size` | `ci.yml` | JS, CSS, and font budgets |
| `visual` | `ci.yml` | Dark and light screenshot regression |
| `lighthouse` | `ci.yml` | Median of three runs: mobile Performance >= 95, Accessibility 100, Best Practices 100 |
| `security-static` | `security.yml` | CodeQL `security-extended`, no high or critical finding |
| `security-supply-chain` | `security.yml` | Licence allowlist from the lockfile, `npm audit`, OSV-Scanner, SBOM |
| `security-workflows` | `security.yml` | `actionlint`, `zizmor --offline`, full-SHA pins, least privilege |
| `security-secrets` | `security.yml` | Gitleaks binary over full history, plus GitHub secret scanning |
| `security-policy` | `security.yml` | CSP, protected paths, risk label, waivers, PR evidence |

A red pull request is not merged. There is no merge-anyway button for a security check. An infrastructure emergency needs a recorded human override and a retrospective; the loop may never override a check.

Required checks are not claims. They are active only after the workflow exists and has run on a pull request. Until then, `docs/security/verification.md` says they are planned.

## What each job actually runs

```text
lint          npm ci && npm run lint
typecheck     npm ci && npm run typecheck
unit          npm ci && npm run test:coverage        (uploads coverage/)
e2e           npm ci && playwright install --with-deps webkit
              npm run test:e2e -- --project=webkit-iphone
              npm run test:perf -- --project=webkit-iphone   (single worker)
a11y          same browser install
              npm run test:a11y -- --project=webkit-iphone
build         npm ci && npm run build && npm run check:pwa
size          npm ci && npm run build && npm run size
visual        same browser install
              npx playwright test tests/e2e/visual.spec.ts --project=webkit-iphone
lighthouse    npm ci && npm run build && npm run lighthouse
security-*    see .github/workflows/security.yml
```

Every job pins its actions to a full commit SHA. `security-policy` fails the build if a pin is shortened, a workflow gains `pull_request_target`, a workflow uses `secrets: inherit`, or a workflow has no top-level `permissions` block.

## Why WebKit is the CI browser

WebKit is the engine that ships on iPhone. The Chromium project exists for cross-engine coverage and is run locally and in the visual-baselines workflow. A change that only passes in Chromium is not done.

## Lighthouse without LHCI

The `lighthouse` job runs `npm run lighthouse`, which starts the production preview, runs Lighthouse with the mobile preset, writes `lighthouse-report.html`, and fails when a category is below its floor. It deliberately does not use `@lhci/cli`: that tree carried 13 high advisories with no non-breaking fix, which would fail `security-supply-chain` forever. See D-036.

`lighthouse-report.html` is uploaded as an artifact on every run.

## Visual baselines

Baselines are Linux-only. The `visual` check compares against committed PNGs produced on `ubuntu-latest`.

To regenerate them, dispatch **Visual baselines** from the Actions tab (`.github/workflows/visual-baselines.yml`). The workflow runs the visual spec with `--update-snapshots` and uploads the result. Download it, inspect every image, and commit the new baselines with a screenshot in the pull request.

Never commit Windows screenshots as baselines. They do not match Linux font rendering and will fail every later run.

## Scheduled workflows

| Workflow | Cadence | Failure action |
|---|---|---|
| `security.yml` | Weekly (Monday 03:17 UTC) plus every push | Open an issue and block release |
| `drift-audit.yml` | Daily (02:41 UTC) | Open `security:drift` + `loop:paused`; the loop stops |
| Dependabot | npm daily, Actions weekly | Normal review; vulnerable updates are prioritised |
| Secret scanning | Continuous | Revoke, rotate, incident |

## Reproducing CI locally

```powershell
npm ci
npm run verify
npm run test:coverage
npm run test:e2e -- --project=webkit-iphone
npm run test:a11y -- --project=webkit-iphone
npm run lighthouse
```

`npm run verify:security` needs `actionlint` and `gitleaks` on `PATH`. CI installs pinned versions of both; locally they are a one-time setup step.

## Cost

Every workflow uses GitHub-hosted runners on the free tier. There is no paid service, no paid seat, and no paid API anywhere in the pipeline.
