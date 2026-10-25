# AI development and automation notes

TEMPO uses a low-risk autonomous improvement loop. The loop is allowed to make small, well-evidenced changes. It is not allowed to invent the product, rewrite its foundations, or merge its own high-risk work.

## Read before changing the loop

- [OpenCode documentation](https://opencode.ai/docs/) — agent, skill, permission, and tool behavior.
- [OpenCode agents](https://opencode.ai/docs/agents/) and [skills](https://opencode.ai/docs/skills/).
- [AGENTS.md](https://agents.md/) — the convention this repository uses.
- [GitHub Actions](https://docs.github.com/en/actions) and [workflow syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions).
- [GitHub branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) and [rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets).
- [GitHub CodeQL](https://codeql.github.com/docs/) and [Dependabot](https://docs.github.com/en/code-security/dependabot).
- [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/).
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework).
- [Anthropic — Building effective agents](https://www.anthropic.com/engineering/building-effective-agents).
- [OpenAI — A practical guide to building agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf).
- [Model Context Protocol](https://modelcontextprotocol.io/).
- [Google PAIR — People + AI Guidebook](https://pair.withgoogle.com/guidebook/).

## Loop contract

| Rule | Detail |
|---|---|
| Trigger | Windows scheduled task every 3 hours, 08:00–22:00. |
| Work source | Only human-approved GitHub Issues labeled `loop:approved`. |
| Audit mode | May propose issues with evidence; may not implement invented features. |
| Manual run | May open a PR; may never auto-merge. |
| Auto-merge | Only `risk:low` changes, only on green CI, only with branch protection satisfied. |
| Change size | ≤400 changed lines and ≤12 files per PR. |
| Forbidden edits | GitHub workflows, loop scripts, branch protection, release configuration, dependency-update policy. |
| Tests | No deletion, no skipping, no weakened assertions, no coverage drop. |
| Human review | Required for storage, security, dependencies, data migrations, major UI, or anything that changes user data. |
| Circuit breaker | Stop after 3 consecutive failures. |
| Pause | Respect the `PAUSE` switch before doing anything else. |
| Audit trail | Every PR names the issue, risk, decision ID(s), references, and verification. |

## Risk classification

| Risk | Examples | Merge policy |
|---|---|---|
| `risk:low` | Documentation, copy fixes, isolated test additions, a small bug fix with a regression test, a purely visual token correction that does not change layout or data. | Auto-merge allowed on green CI. |
| `risk:medium` | Component behavior, interaction changes, new runtime dependency, new storage query, performance-sensitive refactor, visual change across screens. | Human review required. |
| `risk:high` | Storage schema, migrations, security, auth, dependency upgrades, workflow or loop changes, data export/import, release configuration, major UI. | Human review always; no auto-merge. |

When in doubt, raise the risk. A false `risk:low` is worse than an unnecessary review.

## What the loop may change

- A specific behavior described in a `loop:approved` issue.
- Tests that prove the behavior.
- Documentation that would otherwise become stale.
- A small, local visual correction that follows an existing token and pattern.
- A bug fix with a reproduction and a regression test.

## What the loop may never do

- Add a backend, account, sync, push, analytics, tracking, or paid service.
- Add an auto-scheduler.
- Invent a feature that is not in the approved spec or issue.
- Change the data model, storage schema, or migration behavior without human review.
- Upgrade dependencies or change the package manager without human review.
- Edit the workflows, loop scripts, branch protection, or release configuration.
- Delete, skip, or weaken tests.
- Lower coverage thresholds.
- Expose personal data in logs, prompts, URLs, or analytics.
- Add a new runtime dependency to solve a problem the platform already solves.
- Ignore the `PAUSE` switch or the circuit breaker.

## Model ladder

Use the first available model that can complete the task within the guardrails:

1. `opencode/deepseek-v4.1-flash-free`
2. `opencode/glm-5.3-flash-free`
3. `opencode/mimo-v2.6-flash-free`
4. `opencode/flint-40b-free`
5. local `ollama/qwen2.5-coder:7b` (unavailable until Ollama and the model are installed)

If the model cannot produce a change that passes the gates without exceeding the limits, stop and leave a comment on the issue instead of forcing a PR.

## Required PR evidence

Every loop PR must include:

- The issue number and title.
- The decision ID(s) it relies on.
- The risk label.
- The source(s) read.
- What changed and why.
- Tests added or updated.
- The verification commands and their results.
- What was not verified.
- A screenshot or short recording for any visual change.
- An offline check for any shell, storage, or install change.
- A note if a human must test on a real iPhone.

## Evaluation

A loop PR is eligible to merge only when:

- CI is green.
- The risk label is `risk:low`.
- Coverage did not drop.
- axe has zero serious or critical issues.
- Lighthouse meets the agreed thresholds for affected screens.
- The dark/light visual regression passes for visual changes.
- The offline reload test passes for shell/storage changes.
- The change is within the 400-line / 12-file limit.
- No forbidden files were touched.
- The PR cites its issue, decision, references, and verification.

If any gate fails, the loop fixes it or stops. It does not disable the gate.

## Failure handling

- Three consecutive failures trigger the circuit breaker and stop the loop.
- A failed run must leave a clear issue comment: what was attempted, what failed, and what a human should do next.
- A run must never “fix” a failure by weakening a test, skipping a check, or lowering a budget.
- The `PAUSE` switch is checked before any work. If it is on, the loop exits without opening a PR.

## Security and privacy

- Never put personal plan data, tokens, or secrets in prompts, logs, URLs, or commits.
- Use GitHub secrets for credentials; never commit them.
- Treat model output as untrusted code until CI and review have validated it.
- Follow the OWASP LLM Top 10 for prompt injection, insecure output handling, excessive agency, and supply-chain risk.
- Keep the loop’s permissions minimal. It should not have write access it does not need.
- Human review is the backstop for anything that touches data, security, dependencies, or release behavior.

## Prompt contract for a loop run

Use a prompt shaped like this:

```text
You are working on TEMPO. Read AGENTS.md, docs/design/feel-contract.md,
docs/design/decisions.md, and docs/reference/source-map.md first.

Work only on issue #<number>, which must have the loop:approved label.
Do not invent scope. Do not edit workflows, loop scripts, branch protection,
release config, or dependency policy. Do not delete or weaken tests.

Keep the change within 400 lines and 12 files.
Classify the risk honestly. If it is not risk:low, open a PR for human review
and do not merge.

In the PR, include the issue, decision ID(s), references, risk, verification,
and anything a human must test on a real iPhone.
```

## Sources

- [OpenCode](https://opencode.ai/docs/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [GitHub branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub CodeQL](https://codeql.github.com/docs/)
- [Dependabot](https://docs.github.com/en/code-security/dependabot)
- [OWASP LLM Top 10](https://genai.owasp.org/llm-top-10/)
- [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)
- [Anthropic — Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [OpenAI — A practical guide to building agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [AGENTS.md](https://agents.md/)
