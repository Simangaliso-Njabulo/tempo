# Security reference

**The rule:** security decisions cite a source and a control. Do not invent a security requirement from memory, and do not add a paid service to satisfy one.

## Read before changing

- Storage, import/export, encryption, or local data: [Privacy and data protection](../security/privacy.md), [Threat model](../security/threat-model.md), [MDN Web Crypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).
- The service worker, CSP, or the document shell: [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP), [web.dev CSP](https://web.dev/articles/csp), [PWA notes](pwa.md).
- Dependencies, build, or release: [SLSA 1.2](https://slsa.dev/spec/v1.2/), [OpenSSF Scorecard](https://github.com/ossf/scorecard), [GitHub Actions hardening](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions).
- The loop or an agent: [Agent threat model](../security/agent-threat-model.md), [AI development notes](ai-development.md), [OWASP Agentic Top 10](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/).
- A finding, waiver, or release: [Controls](../security/controls.md), [Verification](../security/verification.md), [Waivers](../security/waivers/README.md).

## Standards adopted

| Source | What it governs | TEMPO use |
|---|---|---|
| [NIST SP 800-218 SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final) | Secure software development practices | The lifecycle in [secure-sdlc.md](../security/secure-sdlc.md); controls mapped by SSDF practice |
| [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/) | Verifiable web application security requirements | Level 2 target; N/A justified per chapter because there is no server, login, session, or multi-user API |
| [OWASP Top 10:2025](https://owasp.org/Top10/2025/) | Web application risk lens | A01, A02, A03, A05, A06, A08, and A10 are the main exposures |
| [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) | Agentic risk taxonomy (ASI01-ASI10) | [Agent threat model](../security/agent-threat-model.md) |
| [OWASP AI Agent Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html) | Tool least privilege, human approval, sandboxing, logging, prompt injection | Loop controls and review gates |
| [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/) | LLM application risks | Prompt injection, sensitive information disclosure, supply chain, excessive agency |
| [SLSA 1.2](https://slsa.dev/spec/v1.2/) | Build provenance and source integrity | Build L2 target for the Pages artifact: hosted build, `npm ci`, SBOM, provenance, protected source |
| [OpenSSF Scorecard](https://github.com/ossf/scorecard) | Repository security posture | Weekly scheduled signal; not a substitute for a control |
| [OpenSSF Best Practices Badge](https://www.bestpractices.dev/) | Open-source project hygiene | Passing level target |
| [GitHub CodeQL](https://codeql.github.com/docs/) | Static analysis | `security-static`, security-extended JavaScript/TypeScript |
| [GitHub secret scanning](https://docs.github.com/en/code-security/secret-scanning) | Secret detection | Platform scanning plus push protection |
| [GitHub dependency review](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-dependency-review) | Pull-request dependency risk | `security-supply-chain` |
| [GitHub Actions hardening](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions) | Workflow and token security | Pinned actions, least privilege, no untrusted `pull_request_target`, `actionlint`, `zizmor` |
| [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations) | Build provenance | Release attestation and artifact digest |
| [GitHub private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities) | Private reports | [SECURITY.md](../../SECURITY.md) |
| [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) | CSP directives and meta limitations | Strict meta CSP; `frame-ancestors` is not enforceable from meta |
| [MDN Web Crypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) | AES-GCM and PBKDF2 | Encrypted backup envelope |
| [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545) | iCalendar format | `.ics` escaping, folding, floating local time |
| [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) | Untrusted file handling | Backup size, type, and schema limits |
| [OWASP Deserialization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html) | Untrusted structured data | No object graph deserialization; strict JSON validation |
| [CISA SBOM guidance](https://www.cisa.gov/sbom) | Software bill of materials | CycloneDX SBOM per release |

## Wiz decision

Wiz is a commercial cloud-native application protection platform. Its public material is useful for threat modelling and agentic-risk framing, but it is not a free, self-hosted control that can be a required gate for a zero-cost public repository.

**Decision (D-033):** Wiz is optional manual review only. It is never a required dependency, never holds a repository secret, and never blocks merge or release. No Wiz account is needed to build, test, or release TEMPO. The free GitHub-native and OSS stack above is the required stack.

The Wiz Academy material may be read for background. Do not copy proprietary content into the repository.

## TEMPO interpretation

A local-only PWA removes server-side threats but concentrates risk elsewhere:

- **XSS becomes data theft.** There is no server session to steal, but the app can read the user's plan. React escaping, no dynamic HTML, and CSP matter.
- **Import is the main untrusted input.** A backup file can be malicious or corrupt. Validate before write, cap size, reject unknown keys, and keep the transaction atomic.
- **Supply chain is the main build risk.** A public repo with CI and a deploy target is attractive. Pin actions, lock dependencies, review updates, and attest the artifact.
- **The agent is a privileged insider.** It can edit code, run shell commands, and push. Treat issue text as hostile, constrain tools, protect security paths, and require a human merge for risky work.
- **Local data has no server backup.** Data loss is a security and privacy event. The encrypted export and restore test are product controls, not extras.
- **GitHub Pages limits headers.** The meta CSP is the available control. `frame-ancestors` and some headers cannot be set. Record the residual risk; do not pretend otherwise.

## Standards not adopted as required

| Source | Why not required |
|---|---|
| Wiz CNAPP | Commercial; no zero-cost required tier (D-033) |
| OWASP SAMM | Useful maturity model, but the SSDF mapping and control catalogue are enough for a one-person project |
| SOC 2 / ISO 27001 | Organisational certification, not a fit for a local open-source app |
| Paid SAST/DAST SaaS | Violates the zero-cost invariant; CodeQL, tests, and manual review cover the v1 scope |
| Bug bounty platform | No budget and no server-side scope |

## Citation rule

In a PR, issue, or decision, write:

```text
Control: SEC-06
Decision: D-032
Source: OWASP ASVS 5.0 V1/V3; MDN CSP
Verified: npm run security:policy; dist/index.html inspected at <commit>
```

If a source conflicts with the feel contract or the spec, stop and record a decision. Do not silently choose.

## Freshness

- Re-check the standards at each major release and quarterly.
- Pin the versions used in the assessment; do not cite "latest" without a date.
- If a source is superseded, update this file, the control map, and the affected decision in the same change.
- The threat model and controls are living documents. A stale control is a finding.

## Related

- [Security program](../security/README.md)
- [Threat model](../security/threat-model.md)
- [Agent threat model](../security/agent-threat-model.md)
- [Controls](../security/controls.md)
- [Verification](../security/verification.md)
- [Privacy](../security/privacy.md)
- [AI development notes](ai-development.md)
- [Stack notes](stack.md)
- [PWA notes](pwa.md)
