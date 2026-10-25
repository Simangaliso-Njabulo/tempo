# TEMPO implementation plans

**Status:** complete drafts for review. The approved spec is `docs/superpowers/specs/2026-10-25-tempo-design.md` (approved 2026-10-25). Implementation starts only after both plans are approved.

The work is split into two plans because the product app and the autonomous operations are independent subsystems. Each plan produces working, testable software on its own.

## Order

1. [App plan](2026-10-25-tempo-app.md) — build the working, local-first app: domain, data, UI, interactions, accessibility, performance, and the installable offline shell.
2. [Operations plan](2026-10-25-tempo-operations.md) — make the repository public and safe: CI, Pages, visual regression, release checks, the low-risk improvement loop, and the human/AI documentation set.

The app plan can run while the repository is local. The operations plan starts after the app plan's CI-ready checkpoint and after the user approves the public-release choices (license, repository visibility, and GitHub secrets).

**CI-ready checkpoint:** Task 5.6 Step 2's full app gate passes locally, the app plan's task boxes are checked, and `docs/quality/app-acceptance.md` records the evidence and any gaps. This checkpoint does not imply human acceptance or public release; it means the app is ready for CI and Pages work.

## Approval gate

1. Review both plans.
2. Approve them, or name the tasks and behaviors to change.
3. Implementation starts only after plan approval.
4. Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to execute.

## Rules that apply to every task

- Read the spec section named in the task before changing code.
- Use TDD: failing test, run it, minimal implementation, run it, commit.
- Keep the layer boundaries: `domain` → `application` → `infrastructure`/`presentation`, wired by `app`.
- No new runtime dependency without a decision and a bundle-size check.
- Do not edit pre-existing user changes outside the task.
- Keep the decision log, feel contract, and reference library true in the same change when behavior or platform assumptions change.
