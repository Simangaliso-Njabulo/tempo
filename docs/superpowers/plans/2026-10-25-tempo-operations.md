# TEMPO Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the TEMPO repository public and safe to maintain: protected `main`, real CI gates, GitHub Pages hosting, visual regression, release checks, the human/AI documentation set, and a Windows-scheduled low-risk improvement loop that cannot invent product scope or merge its own risky work.

**Architecture:** GitHub is the source of truth once the remote exists. `main` is protected; every change lands through a pull request. CI is the only merge authority. The loop is a local PowerShell runner that selects one human-approved issue, asks a model ladder for a change, enforces file/line/protected-path limits, runs the same gates as CI, opens a PR, and enables auto-merge only for `risk:low` on green CI.

**Spec:** `docs/superpowers/specs/2026-10-25-tempo-design.md` (approved 2026-10-25), especially §16.5, §17, §18, and §19.

**Reference:** `docs/reference/ai-development.md`, `docs/reference/stack.md`, `docs/reference/pwa.md`, `docs/reference/source-map.md`.

**Preconditions:**

1. The app plan is accepted, or its CI-ready checkpoint is complete.
2. The human has chosen the license and repository visibility.
3. The human has approved the public-release choices and the loop token scope.
4. The local repository has no uncommitted user work.

**Locked operations choices:**

- Public GitHub repository, GitHub Pages project hosting, no custom domain.
- Classic branch protection on `main`; squash merge; delete branch after merge.
- `.github/workflows/ci.yml` for required checks; `deploy.yml` for Pages; `visual-baselines.yml` for manually dispatched Ubuntu baselines.
- Playwright WebKit is the primary CI browser; Chromium is used for local cross-engine coverage and Lighthouse.
- Lighthouse CI (`@lhci/cli`) with a committed `lighthouserc.json`; no paid visual or performance service.
- The loop runs from a Windows scheduled task with a local `PAUSE` switch and a local lock/state directory excluded from Git.
- The loop uses a fine-grained GitHub token in the user environment, never in the repository.
- The license is a human decision. This plan recommends MIT but does not accept it on the human's behalf.
- **Security:** D-032–D-035 apply to every task. The required checks are `lint`, `typecheck`, `unit`, `e2e`, `a11y`, `build`, `size`, `visual`, `lighthouse`, `security-static`, `security-supply-chain`, `security-workflows`, `security-secrets`, and `security-policy`.
- **Pinning:** every GitHub Action is pinned to a full 40-character commit SHA with a version comment. Tags and branches are forbidden.
- **Merge boundary:** only `risk:low` product/docs work may auto-merge. Security, dependency, workflow, storage, permission, migration, and release changes need a human review and a human merge.
- **Model ladder:** try free models in descending capability for this codebase: `opencode/deepseek-v4.1-flash-free`, `opencode/glm-5.3-flash-free`, `opencode/mimo-v2.6-flash-free`, `opencode/flint-40b-free`, then `ollama/qwen2.5-coder:7b` if it is installed. On a quota, rate-limit, timeout, crash, or empty diff, try the next model once. Never retry the same model in the same run, never fall back to a paid model, and never exceed five attempts.
- **Trigger:** the Windows scheduled task is the only unattended trigger. Manual runs use `-Manual`. No GitHub event, webhook, `pull_request_target`, or chat message may start an unattended run.

## File map

```text
.github/
  CODEOWNERS
  dependabot.yml
  workflows/
    ci.yml
    security.yml
    drift-audit.yml
    deploy.yml
    visual-baselines.yml
  ISSUE_TEMPLATE/
    config.yml
    loop-approved.yml
    loop-proposed.yml
  pull_request_template.md
security/
  policy.json
scripts/
  security/
    check-policy.mjs
  ops/
    configure-repo.ps1
    configure-branch-protection.ps1
    verify-security-settings.ps1
    create-labels.ps1
    enable-pages.ps1
    release-check.ps1
  loop/
    run.ps1
    audit.ps1
    install-scheduled-task.ps1
    prompt.md
    README.md
tests/
  e2e/
    visual.spec.ts
    visual.spec.ts-snapshots/       # generated on Ubuntu, committed
lighthouserc.json
SECURITY.md
CHANGELOG.md
LICENSE                              # created only after the human chooses
docs/
  human/
    README.md
    install.md
    planning.md
    backup.md
    privacy.md
    shortcuts.md
  ai/
    README.md
  operations/
    repository.md
    ci.md
    release.md
    loop.md
  loop/
    README.md
    run-log.md
  ARCHITECTURE.md
  TESTING.md
```

## Milestone 0 — Public-release gate and repository bootstrap

### Task 0.1: Choose the license and public-release posture

**Human decision. No code is written until this is answered.**

- [ ] **Step 1: Choose the license**

Options, in order of recommendation for this project:

1. **MIT** — shortest, permissive, familiar, compatible with a personal open-source PWA. Recommended.
2. **Apache-2.0** — permissive with an explicit patent grant; more text.
3. **AGPL-3.0** — copyleft for network use; strongest sharing requirement, heaviest for a small local app.
4. **No public license yet** — keep the repository private until a license is chosen. The app and loop can still be built locally.

Do not publish the repository while the license is undecided. Keep it private until a license is chosen and recorded in the decision log.

- [ ] **Step 2: Record the accepted choice**

If the human chooses MIT, add to `docs/design/decisions.md`:

```md
| D-031 | License is MIT. The repository may be made public after `SECURITY.md`, the license file, and the public-release checklist are complete. | Accepted | Human decision 2026-10-25 |
```

Create `LICENSE` with the standard MIT text and the copyright line the human approves. Do not guess a legal name or year.

If the human chooses another license, record that exact choice and create the matching file. If the human defers, stop; keep the repository private and continue only with local app work.

- [ ] **Step 3: Choose the repository identity and visibility**

Record:

- GitHub owner and repository name, for example `Simangaliso-Njabulo/tempo`.
- The Pages path, derived from the repository name: `/tempo/`.
- Visibility: private during bootstrap, public after the release checklist.
- Whether the loop token is a fine-grained personal access token or a GitHub App. A fine-grained PAT is the simplest v1 choice.

- [ ] **Step 4: Confirm there are no secrets or personal data**

```powershell
git status --short
git grep -n -I -E "(ghp_|github_pat_|sk-|BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|api[_-]?key|password\s*=)" -- . ":!docs/reference/apple-hig/**"
```

Expected: no match, or only documented examples with no real value. Remove anything real before the remote exists.

- [ ] **Step 5: Commit the license and decision**

```powershell
git add LICENSE docs/design/decisions.md
git commit -m "docs: record the project license"
```

**Stop here until the human accepts the license and visibility choice.**

### Task 0.2: Create the remote and bootstrap the repository

**Files:**
- Modify: `README.md`
- Create: `docs/operations/repository.md`
- Create: `scripts/ops/configure-repo.ps1`

- [ ] **Step 1: Create the private remote**

The first push is a human bootstrap action; branch protection does not exist yet. After protection is enabled, every change goes through a PR.

```powershell
gh auth status
gh repo create <owner>/tempo --private --source=. --remote=origin --push
git remote -v
```

Expected: `origin` points at the new repository and `main` is pushed.

- [ ] **Step 2: Configure repository merge behavior**

`scripts/ops/configure-repo.ps1`:

```powershell
param(
  [Parameter(Mandatory)][string]$Owner,
  [Parameter(Mandatory)][string]$Repo
)

$ErrorActionPreference = 'Stop'
$body = @{
  allow_squash_merge          = $true
  allow_merge_commit          = $false
  allow_rebase_merge          = $false
  delete_branch_on_merge      = $true
  allow_auto_merge            = $true
} | ConvertTo-Json

$body | gh api -X PATCH "repos/$Owner/$Repo" --input -
if ($LASTEXITCODE -ne 0) { throw 'Could not configure repository merge behavior.' }
Write-Host 'Repository merge behavior is configured.'
```

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ops/configure-repo.ps1 -Owner <owner> -Repo tempo
```

Squash merge keeps `main` linear. Auto-merge is required for the low-risk loop, but branch protection still decides when it can complete.

- [ ] **Step 3: Document the repository**

`docs/operations/repository.md`:

```md
# Repository operations

- Owner/repository: `<owner>/tempo`
- Default branch: `main`
- Pages path: `/tempo/`
- Visibility: private until the public-release checklist passes
- Merge method: squash only
- Branch deletion: on merge
- Direct pushes to `main`: forbidden after protection is enabled
- Force pushes: forbidden
- Dependabot: enabled for npm and GitHub Actions, grouped, reviewed by a human
- Secret scanning: enabled with push protection
- Private vulnerability reporting: enabled
- CodeQL: enabled for JavaScript/TypeScript with security-extended queries
- CODEOWNERS: required review from the maintainer for protected paths
- Required checks: the fourteen checks enforced by `.github/workflows/ci.yml` and `.github/workflows/security.yml`
- Loop token: fine-grained, least privilege, stored outside the repository
```

Link it from `README.md` and `docs/reference/source-map.md`.

- [ ] **Step 4: Commit**

```powershell
git add README.md docs/operations/repository.md scripts/ops/configure-repo.ps1
git commit -m "docs: record repository operations"
git push origin main
```

### Task 0.3: Add the labels, issue templates, and pull-request template

**Files:**
- Create: `scripts/ops/create-labels.ps1`
- Create: `.github/ISSUE_TEMPLATE/config.yml`
- Create: `.github/ISSUE_TEMPLATE/loop-approved.yml`
- Create: `.github/ISSUE_TEMPLATE/loop-proposed.yml`
- Create: `.github/pull_request_template.md`

- [ ] **Step 1: Create the labels**

`scripts/ops/create-labels.ps1`:

```powershell
$ErrorActionPreference = 'Stop'

$labels = @(
  @{ Name = 'loop:approved'; Color = '1D76DB'; Description = 'Human-approved work for the low-risk loop' },
  @{ Name = 'loop:proposed'; Color = '5319E7'; Description = 'Audit proposal; a human must approve it' },
  @{ Name = 'loop:pr'; Color = '0E8A16'; Description = 'A pull request opened by the loop' },
  @{ Name = 'loop:blocked'; Color = 'B60205'; Description = 'The loop is blocked or its circuit breaker is open' },
  @{ Name = 'risk:low'; Color = 'C2E0C6'; Description = 'Eligible for auto-merge on green CI' },
  @{ Name = 'risk:medium'; Color = 'FEF2C0'; Description = 'Human review required' },
  @{ Name = 'risk:high'; Color = 'F9D0C4'; Description = 'Human review always; no auto-merge' },
  @{ Name = 'security:drift'; Color = 'D93F0B'; Description = 'Security posture drifted from policy; loop paused' },
  @{ Name = 'loop:paused'; Color = 'B60205'; Description = 'Stop the loop until a human clears this' },
  @{ Name = 'dependencies'; Color = '0366D6'; Description = 'Dependency or supply-chain change' },
  @{ Name = 'security'; Color = 'D93F0B'; Description = 'Security-sensitive change' }
)

foreach ($label in $labels) {
  gh label create $label.Name --color $label.Color --description $label.Description --force
  if ($LASTEXITCODE -ne 0) { throw "Could not create label $($label.Name)" }
}

Write-Host 'Labels are ready.'
```

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ops/create-labels.ps1
```

- [ ] **Step 2: Add the issue templates**

`.github/ISSUE_TEMPLATE/config.yml`:

```yaml
blank_issues_enabled: false
contact_links:
  - name: Security report
    url: https://github.com/<owner>/tempo/security/advisories/new
    about: Report a vulnerability privately. Do not open a public issue.
```

`.github/ISSUE_TEMPLATE/loop-approved.yml`:

```yaml
name: Loop-approved change
description: A small, human-approved change for the low-risk loop
title: "[loop] "
body:
  - type: markdown
    attributes:
      value: |
        A human must review this issue and add exactly one of `risk:low`, `risk:medium`, or `risk:high`.
        Do not add `loop:approved` until the issue is clear, bounded, and cited.
  - type: textarea
    id: problem
    attributes:
      label: Problem
      description: What is wrong or missing today?
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
      description: What should change, in observable terms?
    validations:
      required: true
  - type: textarea
    id: acceptance
    attributes:
      label: Acceptance criteria
      description: Testable statements. Include the test level where possible.
    validations:
      required: true
  - type: dropdown
    id: risk
    attributes:
      label: Risk
      options:
        - risk:low — copy, isolated test, docs, small non-behavioral refactor
        - risk:medium — component behavior, interaction, performance, visual change
        - risk:high — storage, security, dependency, migration, data, release
    validations:
      required: true
  - type: input
    id: decisions
    attributes:
      label: Decision ID(s)
      description: For example D-020. If none, say "none".
    validations:
      required: true
  - type: textarea
    id: references
    attributes:
      label: References
      description: Source map entries, design contract sections, or external sources.
    validations:
      required: true
  - type: textarea
    id: out_of_scope
    attributes:
      label: Out of scope
      description: What must the loop not touch?
    validations:
      required: true
  - type: textarea
    id: data
    attributes:
      label: Data and migration impact
      description: Say "none" or describe it. Any data impact is at least risk:high.
    validations:
      required: true
  - type: textarea
    id: iphone
    attributes:
      label: Real-iPhone check
      description: What must a human verify after the change?
    validations:
      required: true
```

`.github/ISSUE_TEMPLATE/loop-proposed.yml`:

```yaml
name: Loop audit proposal
description: An evidence-backed proposal from audit mode; not approved for code
title: "[proposal] "
body:
  - type: markdown
    attributes:
      value: |
        Audit mode may propose issues. A human must promote a proposal to `loop:approved` and add a risk label.
  - type: textarea
    id: evidence
    attributes:
      label: Evidence
      description: File and line, failing test, measured regression, or reference.
    validations:
      required: true
  - type: textarea
    id: proposal
    attributes:
      label: Proposed change
      description: The smallest change that addresses the evidence.
    validations:
      required: true
  - type: textarea
    id: why_now
    attributes:
      label: Why this is worth doing
    validations:
      required: true
  - type: textarea
    id: risk
    attributes:
      label: Suggested risk
      description: low, medium, or high, with a reason.
    validations:
      required: true
```

- [ ] **Step 3: Add the pull-request template**

`.github/pull_request_template.md`:

```md
## Issue

Closes #

## Risk

- [ ] `risk:low`
- [ ] `risk:medium`
- [ ] `risk:high`

## Decision IDs and references

- Decision:
- Source map / reference:

## What changed

## Why

## Verification

- [ ] `npm run verify`
- [ ] `npm run test:e2e`
- [ ] `npm run test:a11y`
- [ ] `npm run test:visual` (visual changes)
- [ ] Real iPhone check (platform or interaction changes)

## Not verified

## Data or migration impact

## Screenshots or recording

## Checklist

- [ ] No unrelated files or pre-existing user changes were overwritten.
- [ ] No secrets, tokens, personal data, analytics, backend, sync, push, or paid service were added.
- [ ] Tests were not deleted, skipped, or weakened.
- [ ] The design contract, decision log, and reference library are still true or were updated.
- [ ] Security controls touched are named.
- [ ] The risk label is correct; security, dependency, workflow, storage, permission, and release changes are marked `risk:high`.
- [ ] The abuse case for this change is tested, or an attestation is linked.
- [ ] No third-party runtime origin, remote font, CDN, tracking pixel, dynamic HTML, `eval`, or `new Function` was added.
- [ ] No waiver was created or extended by an agent.
```

- [ ] **Step 4: Commit**

```powershell
git add .github scripts/ops/create-labels.ps1
git commit -m "chore: add loop labels and contribution templates"
```

### Task 0.4: Protect `main` and enable Pages

**Files:**
- Create: `scripts/ops/configure-branch-protection.ps1`
- Create: `scripts/ops/enable-pages.ps1`
- Create: `docs/operations/ci.md`

- [ ] **Step 1: Configure branch protection**

`scripts/ops/configure-branch-protection.ps1`:

```powershell
param(
  [Parameter(Mandatory = $true)][string]$Owner,
  [Parameter(Mandatory = $true)][string]$Repo
)

$ErrorActionPreference = 'Stop'
$requiredChecks = @(
  'lint',
  'typecheck',
  'unit',
  'e2e',
  'a11y',
  'build',
  'size',
  'visual',
  'lighthouse',
  'security-static',
  'security-supply-chain',
  'security-workflows',
  'security-secrets',
  'security-policy'
)

$body = @{
  required_status_checks = @{
    strict = $true
    contexts = $requiredChecks
  }
  enforce_admins = $true
  required_pull_request_reviews = $null
  restrictions = $null
  allow_force_pushes = $false
  allow_deletions = $false
  required_linear_history = $true
  required_conversation_resolution = $true
} | ConvertTo-Json -Depth 10

$body | gh api -X PUT "repos/$Owner/$Repo/branches/main/protection" --input -
if ($LASTEXITCODE -ne 0) { throw 'Could not protect main.' }

Write-Host 'main is protected. Required checks:'
$requiredChecks | ForEach-Object { Write-Host " - $_" }
```

The repository is a solo-maintainer project, so pull-request approvals are not required at the GitHub level. `CODEOWNERS` still records the protected paths and will enforce review when a second maintainer exists. For v1, the human merge boundary is enforced by the risk label, the auto-merge boundary, and `security-policy`; the residual risk is recorded in `docs/security/threat-model.md`. A human reviews and merges every medium/high PR.

**Timing:** do not run this script until Task 1.1, Task 1.3, and Task 1.4 have landed the CI and security workflows. A required check that does not exist yet blocks every PR, including the PR that creates it. The first workflow push is a human bootstrap action before protection is enabled.

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ops/configure-branch-protection.ps1 -Owner <owner> -Repo tempo
```

Expected: `main` rejects direct pushes, force pushes, and deletion; required checks are the fourteen jobs in `.github/workflows/ci.yml` and `.github/workflows/security.yml`.

- [ ] **Step 2: Enable Pages from GitHub Actions**

`scripts/ops/enable-pages.ps1`:

```powershell
param(
  [Parameter(Mandatory = $true)][string]$Owner,
  [Parameter(Mandatory = $true)][string]$Repo
)

$ErrorActionPreference = 'Stop'

gh api -X POST "repos/$Owner/$Repo/pages" -f build_type=workflow
if ($LASTEXITCODE -ne 0) {
  gh api -X PUT "repos/$Owner/$Repo/pages" -f build_type=workflow
}
if ($LASTEXITCODE -ne 0) { throw 'Could not enable Pages.' }

$pages = gh api "repos/$Owner/$Repo/pages" | ConvertFrom-Json
Write-Host "Pages enabled: $($pages.html_url)"
```

Run it after the deploy workflow exists. If the repository is private, Pages availability depends on the plan; keep the repository private until the public-release checklist is done, then enable the public Pages deployment.

- [ ] **Step 3: Document the CI contract**

`docs/operations/ci.md`:

```md
# CI contract

`main` is protected. A pull request is ready only when these required checks pass:

1. `lint` — style, boundaries, and unsafe-pattern rules
2. `typecheck` — TypeScript
3. `unit` — Vitest coverage thresholds
4. `e2e` — Playwright WebKit iPhone
5. `a11y` — axe, zero serious or critical
6. `build` — production build and PWA artifact check
7. `size` — JS/CSS/font budgets
8. `visual` — dark/light screenshot regression
9. `lighthouse` — mobile Performance ≥95, Accessibility 100, Best Practices 100
10. `security-static` — CodeQL security-extended, no high/critical finding
11. `security-supply-chain` — dependency review, `npm audit`, OSV-Scanner, SBOM
12. `security-workflows` — `actionlint`, `zizmor`, full-SHA pins, least privilege
13. `security-secrets` — Gitleaks and GitHub secret scanning
14. `security-policy` — CSP, protected paths, risk label, waivers, required evidence

A red PR is not merged. There is no merge-anyway button for a security check. An infrastructure emergency needs a recorded human override and a retrospective; the loop may never override a check.

Required checks are not claims. They are active only after the workflow exists and has run on a PR. Until then, say they are planned.
```

- [ ] **Step 4: Commit**

```powershell
git add scripts/ops/configure-branch-protection.ps1 scripts/ops/enable-pages.ps1 docs/operations/ci.md
git commit -m "chore: protect main and document the CI contract"
```

## Milestone 1 — CI, Pages, and performance gates

### Task 1.1: Add the required-check workflow

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `package.json` (only if a script used below is missing)

- [ ] **Step 1: Add the workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: lint
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint

  typecheck:
    name: typecheck
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck

  unit:
    name: unit
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run test:coverage
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        if: always()
        with:
          name: coverage
          path: coverage/
          if-no-files-found: ignore

  e2e:
    name: e2e
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - uses: actions/cache@0057852bfaa89a56745cba8c7296529d2fc39830 # v4.3.0
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
      - run: npx playwright install --with-deps webkit
      - run: npm run test:e2e -- --project=webkit-iphone
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        if: failure()
        with:
          name: playwright-e2e
          path: |
            playwright-report/
            test-results/
          if-no-files-found: ignore

  a11y:
    name: a11y
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - uses: actions/cache@0057852bfaa89a56745cba8c7296529d2fc39830 # v4.3.0
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
      - run: npx playwright install --with-deps webkit
      - run: npm run test:a11y -- --project=webkit-iphone
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        if: failure()
        with:
          name: playwright-a11y
          path: |
            playwright-report/
            test-results/
          if-no-files-found: ignore

  build:
    name: build
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm run check:pwa

  size:
    name: size
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm run size

  visual:
    name: visual
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - uses: actions/cache@0057852bfaa89a56745cba8c7296529d2fc39830 # v4.3.0
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
      - run: npx playwright install --with-deps webkit
      - run: npx playwright test tests/e2e/visual.spec.ts --project=webkit-iphone
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        if: failure()
        with:
          name: playwright-visual
          path: |
            playwright-report/
            test-results/
          if-no-files-found: ignore

  lighthouse:
    name: lighthouse
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npx lhci autorun
```

- [ ] **Step 2: Add the Lighthouse configuration**

`lighthouserc.json`:

```json
{
  "ci": {
    "collect": {
      "startServerCommand": "npm run preview -- --host 127.0.0.1 --port 4173",
      "startServerReadyPattern": "Local:",
      "url": ["http://127.0.0.1:4173/"],
      "numberOfRuns": 1,
      "settings": {
        "preset": "mobile",
        "skipAudits": ["canonical", "is-crawlable"]
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.95 }],
        "categories:accessibility": ["error", { "minScore": 1 }],
        "categories:best-practices": ["error", { "minScore": 1 }],
        "categories:seo": "off"
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

Install the CLI as a dev dependency:

```powershell
npm install -D @lhci/cli
```

Record it in `docs/reference/stack.md`. It is a build/CI tool, not shipped to the browser.

- [ ] **Step 3: Verify the workflow locally as far as possible**

```powershell
npm run verify
npm run test:e2e -- --project=webkit-iphone
npm run test:a11y -- --project=webkit-iphone
npx playwright test tests/e2e/visual.spec.ts --project=webkit-iphone
npx lhci autorun
```

Expected: all gates pass locally. The visual test may fail until Task 2.1 adds its baselines; that is expected at this point. Do not push a red workflow to `main`; open a PR and let CI prove it.

- [ ] **Step 4: Commit**

```powershell
git add .github/workflows/ci.yml lighthouserc.json package.json package-lock.json docs/reference/stack.md
git commit -m "ci: add required checks and Lighthouse gate"
```

### Task 1.2: Deploy to GitHub Pages after green CI

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `docs/operations/release.md`

- [ ] **Step 1: Add the deploy workflow**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write
  attestations: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    if: github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          ref: ${{ github.event.workflow_run.head_sha }}

      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - run: npm run build
        env:
          VITE_BASE: /${{ github.event.repository.name }}/

      - run: npm run check:pwa
      - run: npm run security:sbom

      - uses: actions/attest-build-provenance@977bb373ede98d70efdf65b84cb5f73e068dcc2a # v3.0.0
        with:
          subject-path: dist/**

      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: sbom
          path: sbom.cdx.json
          if-no-files-found: error

      - uses: actions/configure-pages@983d7736d9b0ae728b81ab479565c72886d7745b # v5.0.0

      - uses: actions/upload-pages-artifact@56afc609e74202658d3ffba0e8f6dda462b719fa # v3.0.1
        with:
          path: dist

      - id: deployment
        uses: actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e # v4.0.5

      - name: Smoke-test the deployed shell
        run: |
          curl --fail --silent --show-error \
            --retry 6 --retry-delay 5 --retry-connrefused \
            "${{ steps.deployment.outputs.page_url }}" | grep -q "TEMPO"
```

- [ ] **Step 2: Document the release path**

`docs/operations/release.md`:

```md
# Release path

1. CI is green on `main`.
2. `Deploy` runs from the successful `CI` workflow run.
3. The build uses `VITE_BASE=/<repository>/` and the PWA manifest uses relative URLs.
4. The deployed shell is smoke-tested with `curl`.
5. Rollback is a revert on `main`; CI and Deploy run again.
6. The service worker update toast prevents a mid-edit reload.
7. No release tag is created until the v1 acceptance criteria pass.
```

- [ ] **Step 3: Commit and open a PR**

```powershell
git switch -c ops/deploy
git add .github/workflows/deploy.yml docs/operations/release.md
git commit -m "ci: deploy GitHub Pages after green CI"
git push -u origin ops/deploy
gh pr create --base main --head ops/deploy --title "Deploy GitHub Pages after green CI" --body "Adds the Pages workflow and release path. Required checks are unchanged."
```

Merge only after CI passes. The first deploy is the proof that the project-path base works.

## Milestone 1A — Security checks

### Task 1.3: Add the security scanning workflows

**Files:**
- Create: `.github/workflows/security.yml`
- Create: `.github/dependabot.yml`
- Modify: `package.json` (security scripts and SBOM tool)

This task creates four of the five required security checks. Task 1.4 adds `security-policy`. Do not configure branch protection until both tasks are green on a PR.

- [ ] **Step 1: Add the security workflow**

`.github/workflows/security.yml`:

```yaml
name: Security

on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: '17 3 * * 1'

permissions:
  contents: read
  actions: read
  security-events: write
  pull-requests: read

concurrency:
  group: security-${{ github.ref }}
  cancel-in-progress: true

jobs:
  security-static:
    name: security-static
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      contents: read
      actions: read
      security-events: write
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: github/codeql-action/init@2a2dd30f8030072d379eb0c9ea51789aa2ea9ca4 # v3.29.5
        with:
          languages: javascript-typescript
          queries: security-extended
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - uses: github/codeql-action/analyze@2a2dd30f8030072d379eb0c9ea51789aa2ea9ca4 # v3.29.5

  security-supply-chain:
    name: security-supply-chain
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm audit --audit-level=high
      - uses: actions/dependency-review-action@da24556b548a50705dd671f47852072ea4c105d9 # v4.7.1
        if: github.event_name == 'pull_request'
        with:
          fail-on-severity: high
          comment-summary-in-pr: always
          license-check: true
          allow-licenses: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD
      - name: Install OSV-Scanner
        run: go install github.com/google/osv-scanner/v2/cmd/osv-scanner@v2.3.0
      - run: osv-scanner scan --lockfile=package-lock.json
      - run: npm run security:sbom
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: sbom
          path: sbom.cdx.json
          if-no-files-found: error

  security-workflows:
    name: security-workflows
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-go@0aaccfd150d50ccaeb58ebd88d36e91967a5f35b # v5.4.0
        with:
          go-version: '1.24'
          cache: false
      - run: go install github.com/rhysd/actionlint/cmd/actionlint@v1.7.7
      - run: python3 -m pip install --user 'zizmor==1.15.0'
      - run: actionlint
      - run: python3 -m zizmor .github/workflows

  security-secrets:
    name: security-secrets
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@ff98106e4c7b2bc287b24eaf42907196329070c7 # v2.3.9
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The `security-supply-chain` job fails on a high vulnerability, a disallowed license, a lockfile mismatch, or a SBOM failure. The `security-workflows` job fails on an unpinned action, a shell-injection pattern, excessive permissions, or an unsafe trigger. The `security-secrets` job fails on a secret in the PR commits or history.

- [ ] **Step 2: Add the security scripts**

Add to `package.json`:

```json
"security:sbom": "cyclonedx-npm --output-file sbom.cdx.json",
"verify:security": "npm run security:policy && npm run security:deps && npm run security:workflows && npm run security:secrets",
"security:deps": "npm audit --audit-level=high",
"security:workflows": "actionlint",
"security:secrets": "gitleaks detect --source . --redact --no-banner"
```

Install the SBOM tool as a dev dependency:

```powershell
npm install -D @cyclonedx/cyclonedx-npm
```

`actionlint` and `gitleaks` are local tools. If they are not installed on the developer machine, say so and rely on the required check. Do not silently skip them.

- [ ] **Step 3: Add Dependabot**

`.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: daily
      time: '04:17'
    open-pull-requests-limit: 5
    groups:
      dev-dependencies:
        dependency-type: development
      production-dependencies:
        dependency-type: production
    labels:
      - dependencies
      - risk:high

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    labels:
      - dependencies
      - security
      - risk:high
```

Dependabot PRs never auto-merge. They are `risk:high` because they change the supply chain. A human reviews the diff, the release notes, and the green security checks.

- [ ] **Step 4: Verify the workflow locally**

```powershell
npm ci
npm audit --audit-level=high
npm run security:sbom
git diff --exit-code package-lock.json
```

`actionlint` and `gitleaks` run in CI. If the local binaries exist, also run `actionlint` and `gitleaks detect --source . --redact --no-banner`.

- [ ] **Step 5: Commit and open a PR**

```powershell
git switch -c ops/security-scanning
git add .github/workflows/security.yml .github/dependabot.yml package.json package-lock.json docs/reference/stack.md docs/security/verification.md
git commit -m "ci: add required security scanning"
git push -u origin ops/security-scanning
gh pr create --base main --head ops/security-scanning --title "Add required security scanning" --body "Adds CodeQL, supply-chain, workflow, and secret checks. Risk: high. Controls: SEC-07 to SEC-11, SEC-26. No auto-merge."
```

A human merges this PR after the checks are green. It is a security change and never auto-merges.

### Task 1.4: Add policy-as-code and CODEOWNERS

**Files:**
- Create: `security/policy.json`
- Create: `scripts/security/check-policy.mjs`
- Create: `.github/CODEOWNERS`
- Modify: `.github/workflows/security.yml`
- Modify: `package.json`
- Create: `docs/security/asvs.md` (assessment template; filled by a human)

`security-policy` is the check that makes the written rules executable. It runs on every PR after the build, so it can inspect the real artifact. It fails closed if the policy file is missing, malformed, or out of date.

- [ ] **Step 1: Add the policy**

`security/policy.json`:

```json
{
  "version": 1,
  "requiredChecks": [
    "lint", "typecheck", "unit", "e2e", "a11y", "build", "size", "visual", "lighthouse",
    "security-static", "security-supply-chain", "security-workflows", "security-secrets", "security-policy"
  ],
  "protectedPaths": [
    "^\\.github/",
    "^security/",
    "^\\.github/CODEOWNERS$",
    "^AGENTS\\.md$",
    "^docs/security/",
    "^docs/reference/security\\.md$",
    "^docs/reference/ai-development\\.md$",
    "^scripts/loop/",
    "^scripts/ops/",
    "^package\\.json$",
    "^package-lock\\.json$",
    "^vite\\.config\\.",
    "^index\\.html$",
    "^public/manifest\\.webmanifest$",
    "^src/infrastructure/export/",
    "^src/infrastructure/db/"
  ],
  "csp": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'",
  "waiverDays": { "high": 30, "medium": 90 },
  "attestationDays": 90,
  "limits": { "changedLines": 400, "changedFiles": 12 }
}
```

- [ ] **Step 2: Add the checker**

`scripts/security/check-policy.mjs`:

```js
import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const fail = (message) => errors.push(message);

async function readJson(file) {
  return JSON.parse(await readFile(path.join(root, file), 'utf8'));
}

async function walk(dir) {
  const entries = await readdir(path.join(root, dir), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(relative));
    else files.push(relative);
  }
  return files;
}

const policy = await readJson('security/policy.json').catch(() => {
  console.error('security-policy: security/policy.json is missing or invalid.');
  process.exit(1);
});

for (const key of ['version', 'requiredChecks', 'protectedPaths', 'csp', 'waiverDays', 'attestationDays', 'limits']) {
  if (!(key in policy)) fail(`policy is missing ${key}.`);
}
if (policy.version !== 1) fail('policy version must be 1.');
if (!Array.isArray(policy.requiredChecks) || policy.requiredChecks.length < 14) fail('requiredChecks is incomplete.');

const html = await readFile(path.join(root, 'dist/index.html'), 'utf8').catch(() => {
  fail('dist/index.html is missing; run npm run build first.');
  return '';
});
const meta = html.match(/<meta\s+http-equiv=["']Content-Security-Policy["']\s+content=["']([^"']+)["']/i);
if (!meta) fail('the production CSP meta tag is missing.');
else if (meta[1] !== policy.csp) fail('the production CSP does not match security/policy.json.');
if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) fail('index.html contains an inline script.');
if (/<style\b/i.test(html)) fail('index.html contains an inline style block.');
if (/on[a-z]+\s*=\s*["']/i.test(html)) fail('index.html contains an inline event handler.');

const workflowFiles = await walk('.github/workflows').catch(() => []);
for (const file of workflowFiles.filter((item) => item.endsWith('.yml') || item.endsWith('.yaml'))) {
  const text = await readFile(path.join(root, file), 'utf8');
  if (/pull_request_target\s*:/.test(text)) fail(`${file} uses pull_request_target.`);
  if (/secrets\s*:\s*inherit/.test(text)) fail(`${file} uses secrets: inherit.`);
  for (const match of text.matchAll(/^\s*uses:\s*([^\s#]+)/gm)) {
    const uses = match[1];
    if (uses.startsWith('./')) continue;
    if (!/@[0-9a-f]{40}$/.test(uses)) fail(`${file} has an unpinned action: ${uses}`);
  }
  if (!/^permissions\s*:/m.test(text)) fail(`${file} has no top-level permissions block.`);
}

const sourceFiles = await walk('src').catch(() => []);
const forbidden = [
  [/dangerouslySetInnerHTML/, 'dynamic HTML'],
  [/\beval\s*\(/, 'eval'],
  [/\bnew\s+Function\s*\(/, 'new Function'],
  [/\.innerHTML\s*=/, 'innerHTML assignment'],
  [/document\.write\s*\(/, 'document.write'],
  [/fetch\s*\(\s*['"`]https?:/, 'third-party fetch'],
];
for (const file of sourceFiles.filter((item) => /\.(ts|tsx|js|jsx)$/.test(item))) {
  const text = await readFile(path.join(root, file), 'utf8');
  for (const [pattern, label] of forbidden) {
    if (pattern.test(text)) fail(`${file} contains ${label}.`);
  }
}

const secretPatterns = [/ghp_[A-Za-z0-9]{20,}/, /github_pat_[A-Za-z0-9_]{20,}/, /sk-[A-Za-z0-9]{20,}/, /BEGIN (RSA|OPENSSH|EC) PRIVATE KEY/];
for (const file of [...sourceFiles, ...workflowFiles]) {
  const text = await readFile(path.join(root, file), 'utf8');
  for (const pattern of secretPatterns) if (pattern.test(text)) fail(`${file} looks like it contains a secret.`);
}

async function checkExpiringDir(dir, kind) {
  const files = await readdir(path.join(root, dir)).catch(() => []);
  for (const file of files.filter((item) => item.endsWith('.json'))) {
    const record = await readJson(path.join(dir, file)).catch(() => null);
    if (!record) {
      fail(`${dir}/${file} is not valid JSON.`);
      continue;
    }
    for (const key of ['control', 'owner', 'approver', 'expires', 'evidence']) {
      if (!record[key]) fail(`${dir}/${file} is missing ${key}.`);
    }
    if (!Array.isArray(record.evidence) || record.evidence.length === 0) {
      fail(`${dir}/${file} needs at least one evidence entry.`);
    }
    if (record.severity === 'critical') fail(`${dir}/${file} tries to waive a critical finding.`);
    if (kind === 'waiver' && !['high', 'medium'].includes(record.severity)) {
      fail(`${dir}/${file} has an invalid severity.`);
    }
    const limit = kind === 'waiver' ? policy.waiverDays[record.severity] : policy.attestationDays;
    const started = Date.parse(record.attestedAt ?? record.approvedAt);
    const expires = Date.parse(record.expires);
    const remaining = (expires - Date.now()) / 86_400_000;
    const window = (expires - started) / 86_400_000;
    if (!Number.isFinite(remaining) || remaining < 0) fail(`${dir}/${file} is expired.`);
    if (!Number.isFinite(window) || window > limit) fail(`${dir}/${file} exceeds the ${kind} limit of ${limit} days.`);
  }
}
await checkExpiringDir('security/waivers', 'waiver');
await checkExpiringDir('security/attestations', 'attestation');

if (process.env.GITHUB_EVENT_NAME === 'pull_request' && process.env.GITHUB_EVENT_PATH) {
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const labels = new Set((event.pull_request?.labels ?? []).map((label) => label.name));
  const body = event.pull_request?.body ?? '';
  for (const heading of ['## Issue', '## Risk', '## Decision IDs and references', '## Verification', '## Not verified', '## Data or migration impact']) {
    if (!body.includes(heading)) fail(`the PR body is missing ${heading}.`);
  }
  const changed = execFileSync('git', ['diff', '--name-only', `origin/${event.pull_request.base.ref}...HEAD`], { encoding: 'utf8' })
    .split('\n').filter(Boolean);
  const protectedFiles = changed.filter((file) => policy.protectedPaths.some((pattern) => new RegExp(pattern).test(file)));
  if (protectedFiles.length > 0 && !labels.has('risk:high')) fail(`protected paths need risk:high: ${protectedFiles.join(', ')}`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`security-policy: ${error}`);
  process.exit(1);
}
console.log('security-policy: policy, CSP, pins, secrets, waivers, attestations, and PR evidence are valid.');
```

- [ ] **Step 3: Wire the policy job**

Add `security-policy` to `.github/workflows/security.yml`:

```yaml
  security-policy:
    name: security-policy
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          fetch-depth: 0
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: node scripts/security/check-policy.mjs
```

Add `"security:policy": "node scripts/security/check-policy.mjs"` to `package.json`.

- [ ] **Step 4: Add CODEOWNERS**

`.github/CODEOWNERS`:

```text
* @Simangaliso-Njabulo
/.github/ @Simangaliso-Njabulo
/security/ @Simangaliso-Njabulo
/AGENTS.md @Simangaliso-Njabulo
/docs/security/ @Simangaliso-Njabulo
/docs/reference/security.md @Simangaliso-Njabulo
/docs/reference/ai-development.md @Simangaliso-Njabulo
/scripts/loop/ @Simangaliso-Njabulo
/scripts/ops/ @Simangaliso-Njabulo
/package.json @Simangaliso-Njabulo
/package-lock.json @Simangaliso-Njabulo
/vite.config.ts @Simangaliso-Njabulo
/index.html @Simangaliso-Njabulo
/public/manifest.webmanifest @Simangaliso-Njabulo
/src/infrastructure/export/ @Simangaliso-Njabulo
/src/infrastructure/db/ @Simangaliso-Njabulo
```

GitHub cannot require a solo maintainer to approve their own PR. CODEOWNERS is a durable record and becomes enforcing when a second maintainer exists; the v1 human-merge boundary is the risk label plus the loop's refusal to auto-merge.

- [ ] **Step 5: Add the ASVS assessment stub**

`docs/security/asvs.md` starts as a table with one row per ASVS 5.0 Level 2 chapter, `Status: not assessed`, and a `Justification` column. A human fills it before the public release. The checker does not treat a stub as an assessment; the release gate does.

- [ ] **Step 6: Run and commit**

```powershell
npm run build
npm run security:policy
git add security/policy.json scripts/security/check-policy.mjs .github/CODEOWNERS .github/workflows/security.yml package.json docs/security/asvs.md
git commit -m "security: add policy-as-code, CODEOWNERS, and CSP inspection"
```

Open a PR. `security-policy` must be green before branch protection requires it.

### Task 1.5: Verify repository settings and add drift detection

**Files:**
- Create: `scripts/ops/verify-security-settings.ps1`
- Create: `.github/workflows/drift-audit.yml`
- Modify: `scripts/ops/configure-repo.ps1`
- Modify: `docs/operations/ci.md`

- [ ] **Step 1: Enable the repository security features**

Add to `scripts/ops/configure-repo.ps1`, after the merge configuration:

```powershell
gh api -X PATCH "repos/$Owner/$Repo" `
  -f security_and_analysis[secret_scanning][status]=enabled `
  -f security_and_analysis[secret_scanning_push_protection][status]=enabled
if ($LASTEXITCODE -ne 0) { throw 'Could not enable secret scanning and push protection.' }

gh api -X PUT "repos/$Owner/$Repo/private-vulnerability-reporting"
if ($LASTEXITCODE -ne 0) { throw 'Could not enable private vulnerability reporting.' }
```

These settings are only available when the repository plan allows them. If the API says they are unavailable, stop and record an attestation with the exact limitation; do not pretend they are enabled.

- [ ] **Step 2: Add the settings verifier**

`scripts/ops/verify-security-settings.ps1` reads `security/policy.json`, then verifies with `gh api`:

- `main` protection requires every check in `requiredChecks`.
- Force pushes and deletions are disabled.
- Admin enforcement is on.
- Secret scanning and push protection are enabled.
- Dependabot alerts and security updates are enabled.
- Private vulnerability reporting is enabled.
- The default workflow token is read-only.
- Actions are restricted to GitHub-owned and verified creators.
- The loop token is not a repository secret and is not in the environment of a workflow.

Exit non-zero and print the exact missing setting. The script does not print a token.

- [ ] **Step 3: Add the drift audit**

`.github/workflows/drift-audit.yml` runs daily and on `workflow_dispatch`:

```yaml
name: Security drift audit

on:
  schedule:
    - cron: '41 2 * * *'
  workflow_dispatch:

permissions:
  contents: read
  issues: write
  security-events: read

jobs:
  audit:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: node scripts/security/check-policy.mjs
      - name: Check repository settings
        shell: pwsh
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: ./scripts/ops/verify-security-settings.ps1 -Owner ${{ github.repository_owner }} -Repo ${{ github.event.repository.name }}
      - name: Open a drift issue
        if: failure()
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh issue create \
            --title "security: drift detected $(date -u +%Y-%m-%d)" \
            --label "security:drift,loop:paused" \
            --body "The scheduled security drift audit failed. Fix the missing setting or expired record, then close this issue. The loop must stay paused until it is closed. Run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
```

`security:drift` and `loop:paused` labels are created by `scripts/ops/create-labels.ps1`. The issue is the human-visible circuit breaker; the loop also refuses to run while a `security:drift` issue is open.

- [ ] **Step 4: Add OpenSSF Scorecard**

Add a `scorecard` job to `.github/workflows/drift-audit.yml`:

```yaml
  scorecard:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions:
      security-events: write
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          persist-credentials: false
      - uses: ossf/scorecard-action@f2ea147fec3c2f0d459703eba7405b5e9bcd8c8f # v2.4.2
        with:
          results_file: results.sarif
          results_format: sarif
          publish_results: true
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: scorecard
          path: results.sarif
          if-no-files-found: error
```

Scorecard is a signal, not a vanity score. A failing check opens a review issue; it does not auto-merge anything.

- [ ] **Step 5: Run the verifier and commit**

```powershell
npm run build
npm run security:policy
powershell -ExecutionPolicy Bypass -File scripts/ops/verify-security-settings.ps1 -Owner <owner> -Repo tempo
git add scripts/ops/verify-security-settings.ps1 .github/workflows/drift-audit.yml scripts/ops/configure-repo.ps1 docs/operations/ci.md
git commit -m "security: verify repository settings and detect drift"
```

Run this only after the repository exists and the token has the required read permissions. A failure is a real finding; do not weaken the verifier to make it pass.

## Milestone 2 — Visual regression

### Task 2.1: Add the deterministic visual states and baselines workflow

**Files:**
- Create: `tests/e2e/visual.spec.ts`
- Create: `.github/workflows/visual-baselines.yml`
- Modify: `playwright.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Add the visual script and pin the screenshot comparison settings**

Add to `package.json`:

```json
"test:visual": "playwright test tests/e2e/visual.spec.ts"
```

Merge this into the existing `expect` block in `playwright.config.ts`; do not add a second `expect` key:

```ts
expect: {
  timeout: 5_000,
  toHaveScreenshot: {
    animations: 'disabled',
    caret: 'hide',
    maxDiffPixelRatio: 0.001,
  },
},
```

The visual job runs WebKit on Ubuntu. Baselines generated on Windows will not match Linux font rendering. Generate baselines only in the Ubuntu workflow; never commit a Windows-generated snapshot.

- [ ] **Step 2: Add the visual states**

`tests/e2e/visual.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { addFocusBlock } from './helpers';

const themes = ['dark', 'light'] as const;
const widths = [375, 393, 440] as const;

for (const theme of themes) {
  for (const width of widths) {
    test(`empty day ${theme} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.clock.install({ time: new Date('2026-10-25T08:30:00') });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`empty-${theme}-${width}.png`, { fullPage: true });
    });

    test(`planned day ${theme} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.clock.install({ time: new Date('2026-10-25T08:30:00') });
      await page.goto('/');
      await addFocusBlock(page, { title: 'Deep work', start: '09:00' });
      await addFocusBlock(page, { title: 'Review', start: '10:00' });
      await page.getByRole('button', { name: 'Add block' }).click();
      await page.getByRole('tab', { name: 'Break' }).click();
      await page.getByLabel('Start time').fill('11:00');
      await page.getByRole('button', { name: '15 min' }).click();
      await page.getByRole('button', { name: 'Add' }).click();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`planned-${theme}-${width}.png`, { fullPage: true });
    });
  }

  test(`add sheet ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 844 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.clock.install({ time: new Date('2026-10-25T08:30:00') });
    await page.goto('/');
    await page.getByRole('button', { name: 'Add block' }).click();
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`add-sheet-${theme}.png`);
  });

  test(`reflow preview ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 844 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.clock.install({ time: new Date('2026-10-25T08:55:00') });
    await page.goto('/');
    await addFocusBlock(page, { title: 'Deep work', start: '09:00' });
    await addFocusBlock(page, { title: 'Review', start: '10:00' });
    await page.clock.fastForward('00:36');
    await expect(page.getByText('1 block needs to move.')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`reflow-${theme}.png`);
  });

  test(`carried tray ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 844 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.clock.install({ time: new Date('2026-10-26T08:30:00') });
    await page.goto('/');
    await page.getByLabel('Brain dump').fill('Carried draft');
    await page.getByLabel('Brain dump').press('Enter');
    await page.evaluate(async () => {
      const request = indexedDB.open('tempo');
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const tx = db.transaction('tasks', 'readwrite');
      const store = tx.objectStore('tasks');
      const all = await new Promise<unknown[]>((resolve, reject) => {
        const read = store.getAll();
        read.onsuccess = () => resolve(read.result);
        read.onerror = () => reject(read.error);
      });
      const task = (all as Array<Record<string, unknown>>).find((item) => item.title === 'Carried draft');
      if (!task) throw new Error('Task not found');
      task.carriedFrom = '2026-10-25';
      const committed = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      await new Promise<void>((resolve, reject) => {
        const put = store.put(task);
        put.onsuccess = () => resolve();
        put.onerror = () => reject(put.error);
      });
      await committed;
      db.close();
    });
    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`carried-${theme}.png`);
  });
}
```

The raw IndexedDB seed is acceptable only for a visual fixture. It uses the existing `tasks` object store and the existing task shape; it does not change the schema. If the store name or shape changes, update the fixture in the same change.

- [ ] **Step 3: Add the baseline workflow**

`.github/workflows/visual-baselines.yml`:

```yaml
name: Visual baselines

on:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  update:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps webkit
      - run: npx playwright test tests/e2e/visual.spec.ts --project=webkit-iphone --update-snapshots
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: visual-baselines
          path: tests/e2e/visual.spec.ts-snapshots/
          if-no-files-found: error
```

Run the workflow from the Actions tab on a branch. Download the artifact, replace `tests/e2e/visual.spec.ts-snapshots/`, inspect the images, and commit them through a PR. The workflow never commits or pushes.

- [ ] **Step 4: Verify the visual gate**

```powershell
npx playwright test tests/e2e/visual.spec.ts --project=webkit-iphone
```

Expected on a clean checkout with committed Ubuntu baselines: all states pass. If a screenshot differs, inspect the diff before updating. A visual change requires a risk label and, for medium/high, human review.

- [ ] **Step 5: Commit**

```powershell
git add tests/e2e/visual.spec.ts .github/workflows/visual-baselines.yml playwright.config.ts
git commit -m "test: add deterministic dark and light visual regression"
```

## Milestone 3 — The low-risk improvement loop

### Task 3.1: Add the loop prompt, runner, and guardrails

**Files:**
- Create: `scripts/loop/prompt.md`
- Create: `scripts/loop/run.ps1`
- Modify: `.gitignore`
- Create: `docs/loop/README.md`

- [ ] **Step 1: Add the prompt contract**

`scripts/loop/prompt.md`:

```md
You are working on TEMPO. Read these first:

- AGENTS.md
- docs/design/feel-contract.md
- docs/design/decisions.md
- docs/reference/source-map.md
- docs/reference/ai-development.md

Work only on issue #{{ISSUE_NUMBER}}: {{ISSUE_TITLE}}

Issue body:

{{ISSUE_BODY}}

Risk label: {{RISK}}

Rules:

- Do not invent scope. Implement only what the issue and the approved spec describe.
- Do not edit GitHub workflows, scripts/loop, branch protection, release configuration, dependency policy, package.json, package-lock.json, the spec, the plans, or AGENTS.md.
- Do not delete, skip, or weaken tests. Do not lower coverage.
- Do not add a runtime dependency.
- Do not add a backend, accounts, sync, push, analytics, tracking, or a paid service.
- Keep the change within 400 changed lines and 12 files.
- Do not commit, push, open a pull request, or merge. The runner does that.
- If the issue is ambiguous or conflicts with the spec, stop and explain in your final message without changing files.

Verification is the runner's job, but you should run the narrowest relevant test while working.
```

- [ ] **Step 2: Add the runner**

`scripts/loop/run.ps1`:

```powershell
[CmdletBinding()]
param(
  [switch]$Manual,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $RepoRoot

$stateDir = Join-Path $RepoRoot '.loop'
$lockPath = Join-Path $stateDir 'lock.json'
$statePath = Join-Path $stateDir 'state.json'
$logPath = Join-Path $stateDir 'last-run.log'
$pausePath = Join-Path $RepoRoot 'PAUSE'
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null

$startedBranch = $false
$branchName = $null
$modelUsed = $null

function Write-RunLog {
  param([string]$Message)
  $line = "{0} {1}" -f (Get-Date).ToString('o'), $Message
  Write-Host "[loop] $Message"
  Add-Content -Path $logPath -Value $line -Encoding utf8
}

function Invoke-Checked {
  param([scriptblock]$Command, [string]$Message)
  & $Command
  if ($LASTEXITCODE -ne 0) { throw $Message }
}

function Reset-ModelChanges {
  # The run starts from a clean tree. Reset and remove untracked files so the
  # next model does not inherit a failed attempt. Ignored local state survives.
  Invoke-Checked { git reset --hard origin/main } 'Could not reset model changes.'
  Invoke-Checked { git clean -fd } 'Could not remove untracked model files.'
}

try {
  if (Test-Path $pausePath) {
    Write-RunLog 'PAUSE is present; exiting without work.'
    exit 0
  }

  if (-not $env:GH_TOKEN) { throw 'GH_TOKEN is not set for the loop user.' }
  foreach ($command in @('git', 'gh', 'opencode', 'npm')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "$command is not on PATH." }
  }

  if (Test-Path $lockPath) {
    $lock = Get-Content $lockPath -Raw | ConvertFrom-Json
    $age = (Get-Date) - [datetime]$lock.startedAt
    $alive = Get-Process -Id $lock.pid -ErrorAction SilentlyContinue
    if ($age.TotalMinutes -lt 90 -and $alive) {
      Write-RunLog 'Another loop run holds the lock; exiting.'
      exit 0
    }
    Remove-Item $lockPath -Force
  }

  @{ pid = $PID; startedAt = (Get-Date).ToString('o') } |
    ConvertTo-Json | Set-Content -Path $lockPath -Encoding utf8

  $state = if (Test-Path $statePath) {
    Get-Content $statePath -Raw | ConvertFrom-Json
  } else {
    [pscustomobject]@{ consecutiveFailures = 0; lastRunAt = $null; lastResult = $null }
  }

  if ([int]$state.consecutiveFailures -ge 3) {
    Write-RunLog 'Circuit breaker is open; a human must clear it.'
    exit 0
  }

  $status = git status --porcelain
  if ($LASTEXITCODE -ne 0) { throw 'git status failed.' }
  if ($status) { throw 'Working tree is dirty; refusing to run.' }

  Invoke-Checked { git fetch origin --prune } 'git fetch failed.'
  $currentBranch = git rev-parse --abbrev-ref HEAD
  if ($currentBranch -ne 'main') { throw "Expected main, found $currentBranch." }

  $behind = [int](git rev-list --count HEAD..origin/main)
  if ($behind -gt 0) { throw 'main is behind origin/main.' }

  $openPrs = [int](gh pr list --state open --label loop:pr --json number --jq 'length')
  if ($openPrs -gt 0) {
    Write-RunLog 'A loop PR is already open; exiting.'
    exit 0
  }

  $mainRun = gh run list --branch main --workflow CI --limit 1 --json conclusion | ConvertFrom-Json
  if ($mainRun.conclusion -ne 'success') { throw 'CI on main is not green.' }

  $deploys = gh run list --workflow Deploy --status in_progress --limit 1 --json databaseId | ConvertFrom-Json
  if ($deploys) { throw 'A deploy is in progress; refusing to run.' }

  $issues = gh issue list --state open --label loop:approved --limit 50 --json number,title,body,labels,url | ConvertFrom-Json
  if (-not $issues) {
    Write-RunLog 'No approved issues; exiting.'
    exit 0
  }

  $issue = $issues |
    Where-Object { @($_.labels | Where-Object { $_.name -like 'risk:*' }).Count -eq 1 } |
    Sort-Object number |
    Select-Object -First 1

  if (-not $issue) { throw 'No approved issue has exactly one risk label.' }

  $risk = ($issue.labels | Where-Object { $_.name -like 'risk:*' }).name
  Write-RunLog "Selected issue #$($issue.number) [$risk] $($issue.title)"

  if ($DryRun) {
    Write-RunLog 'Dry run: no branch, model, or PR will be created.'
    exit 0
  }

  $slug = ($issue.title.ToLowerInvariant() -replace '[^a-z0-9]+', '-' -replace '^-|-$', '')
  if ([string]::IsNullOrWhiteSpace($slug)) { $slug = "issue-$($issue.number)" }
  if ($slug.Length -gt 48) { $slug = $slug.Substring(0, 48).TrimEnd('-') }
  $branchName = "loop/$($issue.number)-$slug"

  Invoke-Checked { git switch -c $branchName origin/main } "Could not create $branchName."
  $startedBranch = $true

  $promptTemplate = Get-Content (Join-Path $PSScriptRoot 'prompt.md') -Raw
  $prompt = $promptTemplate.
    Replace('{{ISSUE_NUMBER}}', [string]$issue.number).
    Replace('{{ISSUE_TITLE}}', [string]$issue.title).
    Replace('{{ISSUE_BODY}}', [string]$issue.body).
    Replace('{{RISK}}', [string]$risk)

  if ($prompt.Length -gt 12000) {
    throw 'The issue prompt is too large. Narrow the issue before running the loop.'
  }

  $models = @(
    'opencode/deepseek-v4.1-flash-free',
    'opencode/glm-5.3-flash-free',
    'opencode/mimo-v2.6-flash-free',
    'opencode/flint-40b-free',
    'ollama/qwen2.5-coder:7b'
  )

  $modelSucceeded = $false
  foreach ($model in $models) {
    Write-RunLog "Trying model $model"
    $job = Start-Job -ScriptBlock {
      param($Model, $Prompt, $Root)
      Set-Location $Root
      & opencode run --model $Model --agent build $Prompt
      if ($LASTEXITCODE -ne 0) { throw "opencode exited $LASTEXITCODE" }
    } -ArgumentList $model, $prompt, $RepoRoot

    $finished = Wait-Job -Job $job -Timeout 1800
    if (-not $finished) {
      Stop-Job -Job $job
      Remove-Job -Job $job
      Write-RunLog "Model timed out: $model"
      Reset-ModelChanges
      continue
    }

    $output = Receive-Job -Job $job -ErrorAction SilentlyContinue
    $jobState = $job.State
    Remove-Job -Job $job

    if ($jobState -ne 'Completed') {
      Write-RunLog "Model failed: $model"
      Reset-ModelChanges
      continue
    }

    $changed = git status --porcelain
    if (-not $changed) {
      Write-RunLog "Model produced no changes: $model"
      Reset-ModelChanges
      continue
    }

    $modelUsed = $model
    $modelSucceeded = $true
    Write-RunLog "Model produced changes: $model"
    if ($output) { $output | Select-Object -First 20 | ForEach-Object { Write-RunLog "model: $_" } }
    break
  }

  if (-not $modelSucceeded) { throw 'All models failed to produce a change.' }

  $files = @(
    (git diff --name-only origin/main)
    (git ls-files --others --exclude-standard)
  ) | Where-Object { $_ } | Sort-Object -Unique

  if ($files.Count -eq 0) { throw 'No changed files were detected.' }
  if ($files.Count -gt 12) { throw "Change touches $($files.Count) files; limit is 12." }

  $forbidden = @(
    '^\.github/workflows/',
    '^scripts/loop/',
    '^package\.json$',
    '^package-lock\.json$',
    '^docs/design/decisions\.md$',
    '^docs/superpowers/specs/',
    '^docs/superpowers/plans/',
    '^AGENTS\.md$',
    '^\.github/dependabot\.yml$'
  )
  $violations = @()
  foreach ($file in $files) {
    foreach ($pattern in $forbidden) {
      if ($file -match $pattern) { $violations += $file }
    }
  }
  if ($violations.Count -gt 0) {
    throw "Protected path changed: $($violations -join ', ')"
  }

  $deleted = git diff --name-status origin/main |
    Where-Object { $_ -match '^D\s+' } |
    ForEach-Object { ($_ -split "`t")[1] }
  $deletedTests = @($deleted | Where-Object { $_ -match '(^|/)(tests?|__tests__)/|\.(test|spec)\.' })
  if ($deletedTests.Count -gt 0) {
    throw "Test deletion is forbidden: $($deletedTests -join ', ')"
  }

  $lineCount = 0
  foreach ($line in @(git diff --numstat origin/main)) {
    $parts = $line -split "`t"
    if ($parts[0] -match '^\d+$') { $lineCount += [int]$parts[0] + [int]$parts[1] }
  }
  foreach ($file in @(git ls-files --others --exclude-standard)) {
    if (Test-Path $file -PathType Leaf) {
      $lineCount += @(Get-Content $file -ErrorAction SilentlyContinue).Count
    }
  }
  if ($lineCount -gt 400) { throw "Change is $lineCount lines; limit is 400." }

  Invoke-Checked { git diff --check } 'Whitespace check failed.'
  Invoke-Checked { npm run verify } 'Repository verification failed.'
  Invoke-Checked { npm run test:e2e -- --project=webkit-iphone } 'End-to-end tests failed.'
  Invoke-Checked { npm run test:a11y -- --project=webkit-iphone } 'Accessibility tests failed.'
  Invoke-Checked { npm run test:visual -- --project=webkit-iphone } 'Visual regression failed.'

  Invoke-Checked { git add -A } 'git add failed.'
  Invoke-Checked { git commit -m "$($issue.title) (#$($issue.number))" } 'git commit failed.'
  Invoke-Checked { git push -u origin $branchName } 'git push failed.'

  $prBody = @"
Closes #$($issue.number)

## Risk

``$risk``

## Issue

$($issue.title) — $($issue.url)

## Decision IDs and references

See the issue. The runner did not invent scope.

## What changed

Model: ``$modelUsed``

## Verification

- ``npm run verify``
- ``npm run test:e2e -- --project=webkit-iphone``
- ``npm run test:a11y -- --project=webkit-iphone``
- ``npm run test:visual -- --project=webkit-iphone``
- Changed files: $($files.Count)
- Changed lines: $lineCount

## Not verified

- Real iPhone manual check, if the issue requires one.
- Any item the issue names as a human check.

## Data or migration impact

None unless the issue explicitly describes it. Any data impact should have been labeled `risk:high`.

## Screenshots or recording

Required for a visual change; see the issue.
"@

  $prUrl = gh pr create `
    --base main `
    --head $branchName `
    --title "$($issue.title) (#$($issue.number))" `
    --body $prBody `
    --label "loop:pr,$risk"
  if ($LASTEXITCODE -ne 0) { throw 'Could not open the pull request.' }

  $prNumber = [int](gh pr view $prUrl --json number --jq '.number')
  Write-RunLog "Opened PR #$prNumber"

  if (-not $Manual -and $risk -eq 'risk:low') {
    gh pr merge $prNumber --auto --squash --delete-branch
    if ($LASTEXITCODE -ne 0) {
      Write-RunLog 'Auto-merge could not be enabled; leaving the PR for a human.'
    } else {
      Write-RunLog 'Auto-merge enabled; branch protection decides when it lands.'
    }
  } else {
    Write-RunLog 'Human review required; auto-merge not enabled.'
  }

  gh issue comment $issue.number --body "The loop opened $prUrl using ``$modelUsed``. Risk: ``$risk``. $(if ($Manual) { 'Manual run; auto-merge is disabled.' } else { 'Auto-merge is enabled only for risk:low on green CI.' })"

  $state.consecutiveFailures = 0
  $state.lastRunAt = (Get-Date).ToString('o')
  $state.lastResult = 'pr-opened'
  $state | ConvertTo-Json | Set-Content -Path $statePath -Encoding utf8
  exit 0
}
catch {
  $message = $_.Exception.Message
  Write-RunLog "FAILED: $message"

  $state = if (Test-Path $statePath) { Get-Content $statePath -Raw | ConvertFrom-Json } else {
    [pscustomobject]@{ consecutiveFailures = 0; lastRunAt = $null; lastResult = $null }
  }
  $state.consecutiveFailures = [int]$state.consecutiveFailures + 1
  $state.lastRunAt = (Get-Date).ToString('o')
  $state.lastResult = 'failed'
  $state | ConvertTo-Json | Set-Content -Path $statePath -Encoding utf8

  if ($startedBranch -and $branchName) {
    try {
      Reset-ModelChanges
      Invoke-Checked { git switch main } 'Could not switch back to main.'
      git branch -D $branchName | Out-Null
    } catch {
      Write-RunLog "Cleanup failed: $($_.Exception.Message)"
    }
  }

  if ([int]$state.consecutiveFailures -ge 3) {
    New-Item -ItemType File -Path $pausePath -Force | Out-Null
    try {
      gh issue create `
        --title 'Loop circuit breaker open' `
        --body "The TEMPO loop stopped after 3 consecutive failures. The latest failure: $message`n`nA human must fix the cause, delete the local PAUSE file, and reset .loop/state.json before the loop resumes." `
        --label 'loop:blocked'
    } catch {
      Write-RunLog 'Could not open the circuit-breaker issue.'
    }
    Write-RunLog 'Circuit breaker open; PAUSE created.'
  }

  exit 1
}
finally {
  Remove-Item $lockPath -Force -ErrorAction SilentlyContinue
}
```

- [ ] **Step 3: Exclude local loop state**

Append to `.gitignore`:

```text
.loop/
PAUSE
```

The `PAUSE` switch is local and untracked. A human creates it to stop the loop and deletes it to resume. The circuit breaker creates it automatically after three failures.

- [ ] **Step 4: Document the loop**

`docs/loop/README.md`:

```md
# TEMPO loop

The loop is a maintainer tool. It is not shipped to users.

## Pause

Create `PAUSE` at the repository root. The next run exits without work. Delete it to resume.

## Circuit breaker

`.loop/state.json` counts consecutive failures. At 3, the loop creates a `loop:blocked` issue and writes `PAUSE`. A human fixes the cause, deletes `PAUSE`, and sets `consecutiveFailures` to `0` (or deletes the state file).

## Manual run

```powershell
powershell -ExecutionPolicy Bypass -File scripts/loop/run.ps1 -Manual
```

A manual run opens a PR but never auto-merges.

## Dry run

```powershell
powershell -ExecutionPolicy Bypass -File scripts/loop/run.ps1 -DryRun
```

## What the loop may touch

Only the issue. It may not touch workflows, loop scripts, branch protection, release configuration, dependencies, the spec, the plans, or `AGENTS.md`. It may not delete or weaken tests.

## Logs

`.loop/last-run.log` is local and untracked. It contains timestamps, model names, and outcomes, not issue bodies. GitHub issue and PR history is the audit trail.

## Token

`GH_TOKEN` is a fine-grained token in the loop user's environment. Minimum permissions: read issues, write issues/comments, write contents for branches, write pull requests, read metadata. No workflow, actions, secrets, or administration permission.
```

- [ ] **Step 5: Test the runner without changing code**

Create a small issue with the `loop:approved` and `risk:low` labels, then run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/loop/run.ps1 -DryRun
```

Expected: the runner selects the issue, prints the risk, and exits without a branch. If another approved issue is older, it selects that one; close or label it correctly.

- [ ] **Step 6: Commit**

```powershell
git add scripts/loop/prompt.md scripts/loop/run.ps1 docs/loop/README.md .gitignore
git commit -m "feat: add guarded low-risk loop runner"
```

### Task 3.2: Add the Windows scheduled task

**Files:**
- Create: `scripts/loop/install-scheduled-task.ps1`
- Modify: `docs/loop/README.md`
- Create: `docs/operations/loop.md`

- [ ] **Step 1: Add the installer**

`scripts/loop/install-scheduled-task.ps1`:

```powershell
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$runner = Join-Path $root 'scripts\loop\run.ps1'
if (-not (Test-Path $runner)) { throw "Runner not found: $runner" }

$argument = "-NoProfile -ExecutionPolicy Bypass -File `"$runner`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argument -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date '08:00') `
  -RepetitionInterval (New-TimeSpan -Hours 3) `
  -RepetitionDuration (New-TimeSpan -Hours 14)
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask `
  -TaskName 'TEMPO low-risk loop' `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description 'Runs the TEMPO low-risk improvement loop every 3 hours, 08:00-22:00.' `
  -Force

Write-Host 'Scheduled task installed: TEMPO low-risk loop'
Write-Host 'Set GH_TOKEN in the loop user environment before the first run.'
```

Run it once, then verify in Task Scheduler:

```powershell
Get-ScheduledTask -TaskName 'TEMPO low-risk loop' | Format-List TaskName, State, Triggers
```

Expected: triggers at 08:00, 11:00, 14:00, 17:00, and 20:00 local time. The task does not run at 23:00.

- [ ] **Step 2: Document the loop operations**

`docs/operations/loop.md`:

```md
# Loop operations

- Scheduler: Windows Task Scheduler, `TEMPO low-risk loop`.
- Cadence: every 3 hours, 08:00-22:00 local.
- One issue per run; one open `loop:pr` at a time.
- `PAUSE` is checked before every run.
- A local lock prevents overlapping runs.
- The loop refuses to run if the working tree is dirty, `main` is behind, CI on `main` is not green, or a deploy is in progress.
- Auto-merge: `risk:low` only, only on green required checks, only for non-manual runs.
- Manual runs never auto-merge.
- The circuit breaker opens after 3 consecutive failures and writes `PAUSE`.
- The loop token is least-privilege and lives in the user environment, never in the repository.
- The loop never edits workflows, loop scripts, branch protection, release configuration, dependencies, the spec, the plans, or `AGENTS.md`.
```

- [ ] **Step 3: Commit**

```powershell
git add scripts/loop/install-scheduled-task.ps1 docs/loop/README.md docs/operations/loop.md
git commit -m "ops: install the Windows loop schedule"
```

### Task 3.3: Add audit mode

**Files:**
- Create: `scripts/loop/audit.ps1`
- Modify: `docs/loop/README.md`

- [ ] **Step 1: Add the audit runner**

`scripts/loop/audit.ps1`:

```powershell
[CmdletBinding()]
param(
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $RepoRoot

$pausePath = Join-Path $RepoRoot 'PAUSE'
if (Test-Path $pausePath) { Write-Host 'PAUSE is present; audit exits.'; exit 0 }
if (-not $env:GH_TOKEN) { throw 'GH_TOKEN is not set.' }

$status = git status --porcelain
if ($status) { throw 'Working tree is dirty; audit refuses to run.' }

$prompt = @"
You are auditing TEMPO. Read AGENTS.md, docs/design/feel-contract.md,
docs/design/decisions.md, docs/reference/source-map.md, and
docs/reference/ai-development.md.

Look for evidence-backed, small improvements: a failing test, a measured
regression, stale documentation, a broken link, or a small bug with a clear
reproduction. Do not invent product features. Do not write code.

Return ONLY a JSON array. Each item must have:
- title: a short issue title
- body: problem, evidence, expected behavior, acceptance criteria, out-of-scope
- evidence: file/line, command output, or reference
- suggestedRisk: low, medium, or high
- decisionIds: array of decision IDs or []

Return at most 3 items. If there is nothing worth proposing, return [].
"@

$job = Start-Job -ScriptBlock {
  param($Prompt, $Root)
  Set-Location $Root
  & opencode run --model deepseek-v4.1-flash-free --agent plan $Prompt
  if ($LASTEXITCODE -ne 0) { throw "opencode exited $LASTEXITCODE" }
} -ArgumentList $prompt, $RepoRoot

$finished = Wait-Job -Job $job -Timeout 1200
if (-not $finished) {
  Stop-Job -Job $job
  Remove-Job -Job $job
  throw 'Audit model timed out.'
}

$output = (Receive-Job -Job $job) -join "`n"
$jobState = $job.State
Remove-Job -Job $job
if ($jobState -ne 'Completed') { throw 'Audit model failed.' }

$match = [regex]::Match($output, '(?s)\[\s*.*\s*\]')
if (-not $match.Success) { throw 'Audit model did not return a JSON array.' }

$proposals = $match.Value | ConvertFrom-Json
if ($null -eq $proposals) { $proposals = @() }
if (@($proposals).Count -gt 3) { $proposals = @($proposals)[0..2] }

foreach ($proposal in @($proposals)) {
  if ([string]::IsNullOrWhiteSpace($proposal.title) -or [string]::IsNullOrWhiteSpace($proposal.body)) {
    Write-Host 'Skipping a malformed proposal.'
    continue
  }
  $body = @"
## Evidence

$($proposal.evidence)

## Proposal

$($proposal.body)

## Suggested risk

$($proposal.suggestedRisk)

## Decision IDs

$($proposal.decisionIds -join ', ')

---
Proposed by audit mode. A human must review, add a risk label, and promote to `loop:approved` before any code is written.
"@
  if ($DryRun) {
    Write-Host "Would propose: $($proposal.title)"
    continue
  }
  gh issue create --title $proposal.title --body $body --label loop:proposed
  if ($LASTEXITCODE -ne 0) { throw "Could not create proposal: $($proposal.title)" }
}

$status = git status --porcelain
if ($status) {
  throw 'Audit modified the working tree; resetting is forbidden because user work may be present. Review manually.'
}
Write-Host 'Audit complete.'
```

Audit mode never writes code. It uses the read-only `plan` agent. The `git status` check at the end refuses to silently reset a tree the model might have touched.

- [ ] **Step 2: Document audit mode**

Add to `docs/loop/README.md`:

```md
## Audit

```powershell
powershell -ExecutionPolicy Bypass -File scripts/loop/audit.ps1 -DryRun
powershell -ExecutionPolicy Bypass -File scripts/loop/audit.ps1
```

Audit mode is manual. It proposes at most three `loop:proposed` issues with evidence. It cannot open PRs or write code. A human promotes a proposal to `loop:approved` and adds exactly one risk label.
```

- [ ] **Step 3: Test audit in dry-run mode**

```powershell
powershell -ExecutionPolicy Bypass -File scripts/loop/audit.ps1 -DryRun
```

Expected: either “nothing worth proposing” or a short list. It must not change files. If the model writes, the script fails and leaves the tree for human inspection.

- [ ] **Step 4: Commit**

```powershell
git add scripts/loop/audit.ps1 docs/loop/README.md
git commit -m "feat: add evidence-only audit mode"
```

## Milestone 4 — Human and AI documentation

### Task 4.1: Write the human documentation

**Files:**
- Create: `docs/human/README.md`
- Create: `docs/human/install.md`
- Create: `docs/human/planning.md`
- Create: `docs/human/backup.md`
- Create: `docs/human/privacy.md`
- Create: `docs/human/shortcuts.md`
- Modify: `README.md`

- [ ] **Step 1: Write the index**

`docs/human/README.md`:

```md
# TEMPO for humans

TEMPO is a calm, offline-first daily planner. Your day is a vertical timeline. You brain-dump first, then place what matters.

- [Install on iPhone](install.md)
- [Plan a day](planning.md)
- [Back up and restore](backup.md)
- [Privacy](privacy.md)
- [Keyboard and VoiceOver](shortcuts.md)

Everything stays on your iPhone. There is no account, no sync, no tracking, and no push notification.
```

- [ ] **Step 2: Write the install guide**

`docs/human/install.md`:

```md
# Install TEMPO on iPhone

1. Open the TEMPO page in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Tap **Add**.
5. Open TEMPO from the Home Screen.

The Home Screen app is the supported experience. It keeps the timeline and tray clear of browser chrome and works offline after the first load.

## Updates

When a new version is ready, TEMPO shows **New version ready** with **Reload** and **Later**. TEMPO never reloads while you are typing. Tap **Reload** when you are ready.

## Offline

TEMPO stores your day in the browser on this iPhone. It does not need a network connection after the app shell is cached. Back up before clearing Safari data or changing devices.
```

- [ ] **Step 3: Write the planning guide**

`docs/human/planning.md`:

```md
# Plan a day

## 1. Brain dump

Type what needs doing in **What needs doing?** and press Enter. Do not place anything yet. The goal is a useful plan in under 60 seconds.

## 2. Place

- Drag a task from the tray to the timeline.
- Or tap **Place** and choose a time.
- Tap **Add block** for a focus block or a break.

The drag ghost shows where the block will land and which later blocks will shift. The drop is one move, and one tap undoes it.

## 3. Routines

Routines are suggestions in the tray. They are not placed automatically. Drag or **Place** a routine to anchor it. Tap **Skip** to skip it for today.

## 4. Overrun

When a planned block runs past its end, TEMPO shows **N blocks need to move** with **Apply** and **Keep plan**. Apply shifts the remaining blocks; Undo restores the exact prior plan. Auto-apply is off by default.

## 5. Close the day

**Close day** lets you keep the day or let go of unfinished work. Letting go returns unfinished tasks to the tray and leaves future blocks alone. Nothing closes automatically.

## 6. Tomorrow

At midnight, unfinished tasks return to tomorrow's tray with a quiet **Carried over** badge. Routines and breaks do not carry over. Carried work is not placed automatically.
```

- [ ] **Step 4: Write the backup, privacy, and shortcuts guides**

`docs/human/backup.md`:

```md
# Back up and restore

TEMPO stores data locally in the browser. There is no cloud backup.

## Export

**Settings → Data and backup → Export backup** creates a JSON file. Keep it somewhere you trust.

## Import

**Settings → Data and backup → Import backup** validates the file before writing. Choose **Replace** or **Merge**. Replace asks for confirmation and offers to export the current data first.

## Calendar

**Export .ics** creates a calendar file with floating local times and the alarm you choose. It is a one-way export. TEMPO does not read your calendar.

## Reset

**Reset all data** deletes tasks, blocks, routines, settings, and metadata on this iPhone. It cannot be undone unless you have a backup.
```

`docs/human/privacy.md`:

```md
# Privacy

- TEMPO has no account and no sign-in.
- TEMPO has no backend and no sync.
- TEMPO has no analytics, tracking, ads, or third-party scripts.
- TEMPO does not send your plan anywhere.
- TEMPO has no push notifications. Reminders are in-app only while the app is open.
- Backups and `.ics` files are created only when you tap export.
- Clearing Safari data or deleting the app can delete your local data. Keep a backup.
```

`docs/human/shortcuts.md`:

```md
# Keyboard and VoiceOver

## Keyboard

- Tab moves through the skip link, date controls, timeline blocks, tray actions, and sheet controls.
- Enter or Space opens a focused block.
- Escape closes a sheet and returns focus to the control that opened it.
- The **Add block** sheet has labeled title, start time, and duration fields.
- The detail sheet offers **Move** and **Resize** alternatives to dragging.

## VoiceOver

- A block announces its type, title, start time, duration, and state.
- The carried badge is spoken as “Carried over.”
- The reflow preview is a live status announcement.
- Drag has a non-drag alternative: **Place** in the tray and **Move** in the detail sheet.
- Reduce Motion removes FLIP and ghost animation; the drop still works.
```

- [ ] **Step 5: Update the README**

`README.md` should lead with what TEMPO is, the install link, the planning loop, privacy, local development, and the source-of-truth docs. It must not claim a public release before the license and security policy exist.

- [ ] **Step 6: Commit**

```powershell
git add docs/human README.md
git commit -m "docs: add the human install, planning, backup, privacy, and shortcut guides"
```

### Task 4.2: Write the AI and operations documentation

**Files:**
- Create: `docs/ai/README.md`
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/TESTING.md`
- Create: `docs/loop/run-log.md`
- Modify: `docs/reference/source-map.md`

- [ ] **Step 1: Write the AI index**

`docs/ai/README.md`:

```md
# TEMPO for AI agents

Read in this order:

1. `AGENTS.md`
2. `docs/superpowers/specs/2026-10-25-tempo-design.md`
3. `docs/design/feel-contract.md`
4. `docs/design/decisions.md`
5. `docs/reference/README.md`
6. `docs/reference/source-map.md`
7. `docs/ARCHITECTURE.md`
8. `docs/TESTING.md`

The spec is the implementation contract. The decision log records what changed. The reference library records where the rules came from. Do not invent a feature outside a `loop:approved` issue.
```

- [ ] **Step 2: Document the implemented architecture**

`docs/ARCHITECTURE.md` should describe the actual folders, the dependency direction, the data flow from IndexedDB through the live day-plan reader to the React timeline, the use-case boundary, the UnitOfWork, the service worker boundary, and the test layers. Link to the spec rather than duplicating it.

- [ ] **Step 3: Document the test system**

`docs/TESTING.md` should list:

- `npm run test` and `npm run test:coverage`
- `npm run test:domain`
- `npm run test:e2e`
- `npm run test:a11y`
- `npm run test:visual`
- `npx lhci autorun`
- the device matrix
- the manual iPhone checklist
- how to update visual baselines (Ubuntu workflow only)

- [ ] **Step 4: Add the run log**

`docs/loop/run-log.md`:

```md
# Loop run log

The canonical audit trail is GitHub issue and pull-request history. This file is a short index of notable runs and circuit-breaker events.

| Date | Issue | Model | Result | Link |
|---|---|---|---|---|
```

Do not paste issue bodies or personal data here.

- [ ] **Step 5: Update the source map**

Add the new human docs, AI docs, operations docs, workflows, and loop scripts to `docs/reference/source-map.md` with “read before changing” guidance.

- [ ] **Step 6: Commit**

```powershell
git add docs/ai docs/ARCHITECTURE.md docs/TESTING.md docs/loop/run-log.md docs/reference/source-map.md
git commit -m "docs: add the AI architecture, testing, and loop references"
```

## Milestone 5 — Release readiness and handover

### Task 5.1: Add the release check and security policy

**Files:**
- Create: `scripts/ops/release-check.ps1`
- Create: `SECURITY.md`
- Create: `CHANGELOG.md`
- Modify: `docs/operations/release.md`

- [ ] **Step 1: Add the release check**

`scripts/ops/release-check.ps1`:

```powershell
$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path

$commands = @(
  @{ Name = 'verify'; Command = { npm run verify } },
  @{ Name = 'e2e'; Command = { npm run test:e2e -- --project=webkit-iphone } },
  @{ Name = 'a11y'; Command = { npm run test:a11y -- --project=webkit-iphone } },
  @{ Name = 'visual'; Command = { npm run test:visual -- --project=webkit-iphone } },
  @{ Name = 'lighthouse'; Command = { npx lhci autorun } }
)

foreach ($check in $commands) {
  Write-Host "== $($check.Name) =="
  & $check.Command
  if ($LASTEXITCODE -ne 0) { throw "$($check.Name) failed." }
}

$status = git status --porcelain
if ($status) { throw 'Release check changed the working tree; review before tagging.' }

Write-Host 'Release check passed. No tag was created.'
```

- [ ] **Step 2: Add the security policy**

`SECURITY.md`:

```md
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
```

- [ ] **Step 3: Add the changelog**

`CHANGELOG.md` starts with:

```md
# Changelog

All notable changes are recorded here. The format follows Keep a Changelog, and versions follow Semantic Versioning.

## [Unreleased]

- Initial local-first timeline planner.
```

Do not create a release tag until the v1 acceptance criteria pass.

- [ ] **Step 4: Commit**

```powershell
git add scripts/ops/release-check.ps1 SECURITY.md CHANGELOG.md docs/operations/release.md
git commit -m "chore: add release check, security policy, and changelog"
```

### Task 5.2: Make the repository public and prove the deployed path

**Human action. Do not run this task from the loop.**

- [ ] **Step 1: Run the public-release checklist**

- [ ] License is chosen and recorded.
- [ ] `SECURITY.md` has a private reporting path.
- [ ] No secrets or personal data are in the repo, issues, PRs, fixtures, screenshots, or logs.
- [ ] The app acceptance record is accepted.
- [ ] CI is green on `main`.
- [ ] Pages deploys from `main`.
- [ ] The deployed app works at `/<repository>/`, not only at `/`.
- [ ] The service worker scope covers the app shell.
- [ ] The offline reload works from the deployed Home Screen app.
- [ ] The loop token is least-privilege and stored outside the repo.
- [ ] Branch protection requires the fourteen checks.
- [ ] The loop is paused until a human starts it.

- [ ] **Step 2: Change visibility**

```powershell
gh repo edit <owner>/tempo --visibility public --accept-visibility-change-consequences
```

- [ ] **Step 3: Prove the deployed path**

Open `https://<owner>.github.io/tempo/` on a real iPhone. Install it from Safari. Reload offline. Confirm:

- The app loads at the project path.
- The manifest and icons resolve.
- The service worker registers and controls the page.
- The update toast appears after a new deploy.
- No network request goes to a third party.

- [ ] **Step 4: Record the release**

Add the deployed URL, commit, date, and evidence to `docs/operations/release.md`. Do not tag `v0.1.0` until the human accepts the release.

### Task 5.3: Start the loop in dry-run mode and hand over

- [ ] **Step 1: Run the loop dry-run on a real issue**

Create a small `loop:approved` + `risk:low` issue. Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/loop/run.ps1 -DryRun
```

Expected: exactly one issue selected; no branch, model, or PR.

- [ ] **Step 2: Run one supervised manual loop**

```powershell
powershell -ExecutionPolicy Bypass -File scripts/loop/run.ps1 -Manual
```

Expected: a PR with the issue link, risk, references, verification, and not-verified items. Auto-merge is disabled because the run is manual. Review the PR as a human. If it is bad, close it and fix the prompt or issue, not the gates.

- [ ] **Step 3: Install the schedule and observe one cycle**

```powershell
powershell -ExecutionPolicy Bypass -File scripts/loop/install-scheduled-task.ps1
```

Watch one scheduled run. Confirm the lock, log, PAUSE check, and no-op behavior when there is no approved issue.

- [ ] **Step 4: Hand over**

Record in `docs/operations/loop.md`:

- The loop is installed and paused or active.
- The token owner and scope.
- How to pause and resume.
- How to clear the circuit breaker.
- The date of the last successful supervised run.
- Known limitations.

## Operations plan definition of done

The operations plan is complete only when:

- `main` is protected and the fourteen required checks are the source of merge truth.
- Pages deploys only after green CI and serves the app at the project path.
- Visual baselines were generated on Ubuntu and pass in CI.
- The loop selects one human-approved issue, enforces the limits, runs the gates, and opens a PR with evidence.
- A manual loop run never auto-merges.
- A `risk:low` run can auto-merge only after green required checks.
- The circuit breaker and `PAUSE` switch are tested.
- A human has read and accepted the security policy, license, and public-release checklist.
- The human and AI documentation sets are current.
- The human accepts the operations plan and the public release.
