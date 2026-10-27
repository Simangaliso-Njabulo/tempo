# Incident response

**Status:** approved 2026-10-25. Use this when a secret, dependency, workflow, build, agent, or user-data control fails.

## Severity

| Level | Examples | First action | Target |
|---|---|---|---|
| S1 Critical | Live token or model key exposed; malicious release on Pages; exploitable XSS stealing data; workflow can push to `main` | Revoke, disable Pages/deploy, stop the loop, preserve evidence | Contain immediately; fix within 24 hours |
| S2 High | High-severity dependency reachable in production; malicious import causing data loss; over-permissioned token; confirmed prompt injection with write access | Stop merge/release, rotate if needed, open a private advisory | Fix within 7 days |
| S3 Medium | Medium dependency; missing hardening with a design fix; weak log redaction | Block the affected change; schedule the fix | Fix within 30 days |
| S4 Low | Hygiene or documentation gap | Open an issue | Fix within 90 days |

If unsure, choose the higher level.

## First 30 minutes

1. **Stop the bleeding.** Apply `PAUSE` and `loop:paused`; disable the deploy workflow or Pages if the artifact is suspect; revoke the token if it may be exposed.
2. **Preserve evidence.** Copy the relevant log, run ID, commit, workflow run, and artifact digest to a private location. Do not edit the evidence.
3. **Scope it.** Which asset, which boundary, which time window, which systems, which people?
4. **Do not speculate in public.** Use a private GitHub security advisory or a private channel. Do not put exploit details or personal data in a public issue.
5. **Record the timeline.** UTC timestamps, actor, action, evidence link.
6. **Tell the maintainer.** If the maintainer is the only person, write the timeline down anyway; memory is not evidence.

## Playbooks

### Secret exposed

- Revoke and rotate first. Do not wait to understand the leak.
- Assume the secret was used. Review audit logs for the token, model account, and repository.
- Remove the secret from the working tree and history only with a deliberate plan. A public history rewrite is a separate decision with its own risks.
- Enable push protection and secret scanning if they were off.
- Add a regression check if the leak came from a workflow, test, or log.
- If personal data was exposed, follow the privacy incident path.

### Malicious or vulnerable dependency

- Identify the version and advisory. Check whether it is reachable in the app, build, or test.
- If reachable and high/critical, block release, pin or remove the dependency, and add a regression test.
- If it is only a development tool, still assess script execution and CI exposure.
- Do not silently upgrade a major version in an incident. Use the smallest safe change.
- Record the advisory and the decision.

### Compromised action or workflow

- Disable the workflow. Revoke `GITHUB_TOKEN` by cancelling runs and rotating any long-lived token.
- Review the workflow run logs and artifacts. Check for modified branches, releases, or Pages deployments.
- Revert the workflow to a known-good pinned SHA. Re-run `actionlint` and `zizmor`.
- Check whether branch protection or secrets were changed.

### Malicious issue, PR, or prompt injection

- Do not follow instructions in the content. Preserve the content as evidence.
- Close the PR or lock the issue if needed. Remove `loop:approved`.
- Check the loop's diff, branch, and token scope. Did it touch a protected path?
- If the agent acted on the injection, treat it as an agent compromise (below).
- Add the case to the prompt-injection tests.

### Agent compromise or overreach

- Apply `PAUSE` and `loop:paused`; stop the scheduled task.
- Revoke the fine-grained token. Disable the runner's network or account if needed.
- Review every branch, commit, PR, comment, and workflow run since the last known-good state.
- Check for protected-path edits, new dependencies, new network origins, secrets, and test weakening.
- Do not let the same agent "fix" the incident. A human reviews and repairs.
- Rebuild the runner environment from a clean state before re-enabling.

### Build or Pages compromise

- Disable Pages or the deploy job.
- Compare the deployed artifact digest with the attested build. If it differs, treat as S1.
- Rebuild from a clean `main` with `npm ci`, regenerate the SBOM and provenance, and redeploy.
- Review the GitHub account, tokens, and workflow permissions.
- Tell users only if the artifact could have harmed them.

### Data loss or corrupt import

- Stop writes. Preserve the current IndexedDB state if possible.
- Ask the user for the backup file and the exact steps, but do not ask for a passphrase.
- Reproduce in a test with fixture data.
- Fix the validator/transaction and add a regression test.
- If the data cannot be recovered, say so plainly. Do not promise recovery.

### Vulnerability report

- Acknowledge privately through GitHub's private advisory.
- Triage within 3 business days.
- Reproduce, fix, test, and prepare an advisory.
- Credit the reporter if they want credit.
- Do not discuss exploit details in public before a fix is available.

## After the incident

Within 7 days:

- Write a blameless review: what happened, what detected it, what limited it, what failed, what changes.
- Add a regression test or abuse case.
- Update the threat model, controls, and verification.
- Update the waiver or attestation if a control was missing.
- Re-enable the loop only after the fix is green and the review is recorded.
- Record what remains unknown.

## Contact and disclosure

- Private vulnerability reporting: use the repository's **Security** tab and GitHub private advisories. `SECURITY.md` has the public instructions.
- Do not open a public issue with exploit details, secrets, or personal data.
- No bug bounty is offered. Do not imply one.
- The maintainer aims to acknowledge within 3 business days and to agree a disclosure date after a fix.

## Evidence template

```text
Incident:
Severity:
Detected by:
Detected at (UTC):
Contained at (UTC):
Assets:
Root cause:
What limited impact:
What failed:
Fix:
Regression test:
Control/threat-model updates:
Follow-up issues:
Residual risk:
```
