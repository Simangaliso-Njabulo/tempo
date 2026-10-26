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
