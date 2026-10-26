# TEMPO — Reference library

**The rule:** build from these sources, not from memory. Before changing design, UI, platform behavior, accessibility, performance, storage, or the AI loop, read the relevant source and cite it in the change.

This library is deliberately boring: links, local snapshots, and short notes about what each source governs. It is not a substitute for the approved spec. It is the evidence behind the spec.

## Source hierarchy

When sources disagree, use this order:

1. **The user’s explicit instruction** for this project.
2. **The approved product spec** (`docs/superpowers/specs/`), once it exists.
3. **The design contract** (`docs/design/feel-contract.md`) and **decision log** (`docs/design/decisions.md`).
4. **Platform requirements and standards**: Apple HIG, Safari/WebKit behavior, W3C/MDN, WCAG 2.2.
5. **Product and craft guidance**: NN/g, Laws of UX, Refactoring UI, web.dev.
6. **Stack documentation**: React, Vite, TypeScript, Dexie, testing tools.
7. **AI-development and automation guidance**: OpenCode, GitHub Actions, OWASP, NIST.
8. **Security standards and controls**: SSDF, ASVS, OWASP Top 10, SLSA, OpenSSF, and the local control map.

Do not silently choose a lower layer over a higher one. If a platform limitation makes a design rule impossible, record the limitation and the trade-off in the decision log.

## Start here

| Need | Read |
|---|---|
| What TEMPO should feel like | [Design contract](../design/feel-contract.md) |
| What has been decided | [Decision log](../design/decisions.md) |
| What to read before changing a specific area | [Source map](source-map.md) |
| iOS, Safari, install, offline, storage | [PWA and iOS notes](pwa.md) |
| Interaction, accessibility, visual craft | [UI/UX and accessibility notes](ui-ux.md) |
| AI loop, risk, automation, evaluation | [AI development notes](ai-development.md) |
| Security standards, threat model, controls, waivers | [Security reference](security.md) |
| Framework, data, testing, bundle budget | [Stack notes](stack.md) |
| Apple HIG local snapshots | [Apple HIG index](apple-hig/README.md) |

## What lives here

### Apple platforms

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) — the primary platform reference.
- [Local HIG snapshots](apple-hig/README.md) — 36 pages downloaded from Apple’s Markdown endpoints on 2026-10-25. The live pages remain canonical.
- [Apple Developer Forums — Safari and Web](https://developer.apple.com/forums/tags/safari-and-web) — field reports and regressions.
- [Safari release notes](https://developer.apple.com/documentation/safari-release-notes) — behavior changes that affect the shell.

### PWA and web platform

- [web.dev — Learn PWA](https://web.dev/learn/pwa/) — installability, service workers, offline, storage, updates.
- [MDN — Progressive web apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps) — platform API reference.
- [W3C — Web App Manifest](https://www.w3.org/TR/appmanifest/) — manifest semantics.
- [W3C — Service Workers](https://www.w3.org/TR/service-workers/) — worker lifecycle.
- [MDN — Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) — the drag implementation path on iOS.
- [MDN — Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) — the only reliable now-line refresh trigger.
- [MDN — StorageManager.persist()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist) — persistent storage request.
- [WebKit — Web Push for web apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) — why push is out of scope without a server.
- [RFC 5545](https://datatracker.ietf.org/doc/html/rfc5545) — iCalendar and `VALARM`.

### UI, UX, and accessibility

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and the [quick reference](https://www.w3.org/WAI/WCAG22/quickref/).
- [NN/g — 10 usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/).
- [NN/g — Response times: the 3 important limits](https://www.nngroup.com/articles/response-times-3-important-limits/).
- [Laws of UX](https://lawsofux.com/).
- [Refactoring UI](https://www.refactoringui.com/) — practical visual hierarchy and spacing.
- [The A11y Project checklist](https://www.a11yproject.com/checklist/).
- [Inclusive Design Principles](https://inclusive-design-principles.org/).
- [web.dev — Interaction to Next Paint](https://web.dev/articles/inp) and [Optimize INP](https://web.dev/articles/optimize-inp).

### AI development and automation

- [OpenCode documentation](https://opencode.ai/docs/).
- [OpenCode agents](https://opencode.ai/docs/agents/) and [skills](https://opencode.ai/docs/skills/).
- [AGENTS.md](https://agents.md/) — the open convention for agent instructions.
- [GitHub Actions](https://docs.github.com/en/actions) and [workflow syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions).
- [GitHub branch protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) and [rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets).
- [GitHub CodeQL](https://codeql.github.com/docs/) and [Dependabot](https://docs.github.com/en/code-security/dependabot).
- [OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/).
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework).
- [Anthropic — Building effective agents](https://www.anthropic.com/engineering/building-effective-agents).
- [OpenAI — A practical guide to building agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf).
- [Model Context Protocol](https://modelcontextprotocol.io/).
- [Google PAIR — People + AI Guidebook](https://pair.withgoogle.com/guidebook/).

### Security

- [Security reference](security.md) — adopted standards, tooling, the Wiz decision, and the citation rule.
- [Security program](../security/README.md) — ways of working, severity, and self-correction.
- [Threat model](../security/threat-model.md) — assets, trust boundaries, threats, and residual risk.
- [Agent threat model](../security/agent-threat-model.md) — ASI01-ASI10 mapped to the loop.
- [Controls](../security/controls.md) — the control catalogue and evidence.
- [Verification](../security/verification.md) — required checks and commands.
- [Privacy and data protection](../security/privacy.md) — local data, encrypted export, logging.
- [Incident response](../security/incident-response.md) — containment and recovery.
- [NIST SP 800-218 SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final), [OWASP ASVS 5.0](https://owasp.org/www-project-application-security-verification-standard/), [OWASP Top 10:2025](https://owasp.org/Top10/2025/), [OWASP Agentic Top 10 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/).
- [SLSA 1.2](https://slsa.dev/spec/v1.2/), [OpenSSF Scorecard](https://github.com/ossf/scorecard), [OpenSSF Best Practices Badge](https://www.bestpractices.dev/).
- [GitHub CodeQL](https://codeql.github.com/docs/), [secret scanning](https://docs.github.com/en/code-security/secret-scanning), [dependency review](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/about-dependency-review), [Actions hardening](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions).
- [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP), [MDN Web Crypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API), [RFC 5545](https://datatracker.ietf.org/doc/html/rfc5545).
- [Wiz](https://www.wiz.io/) — optional manual reading only; not a required dependency (D-033).

### Stack

- [React 19](https://react.dev/), [Vite](https://vite.dev/guide/), [TypeScript](https://www.typescriptlang.org/docs/).
- [Dexie](https://dexie.org/docs/) and [dexie-react-hooks](https://dexie.org/docs/libs/dexie-react-hooks).
- [CSS Modules](https://github.com/css-modules/css-modules).
- [Vitest](https://vitest.dev/guide/), [Playwright](https://playwright.dev/docs/intro), [Testing Library](https://testing-library.com/docs/react-testing-library/intro/).
- [axe-core](https://github.com/dequelabs/axe-core), [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview).
- [Workbox](https://developer.chrome.com/docs/workbox) and [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/).
- [Geist](https://vercel.com/font) and [Fontsource Geist](https://fontsource.org/fonts/geist).
- [ESLint boundaries](https://github.com/javierbrea/eslint-plugin-boundaries) for layer enforcement.

## Local snapshots

The Apple HIG pages in [`apple-hig/`](apple-hig/) are local Markdown snapshots for offline reading and stable quoting. They were downloaded on **2026-10-25** from `https://developer.apple.com/design/human-interface-guidelines/<page>.md`.

- The live Apple page is canonical. Refresh before making a platform-sensitive decision if the snapshot is older than a few months or if iOS has shipped a new major version.
- The snapshots are research material, not part of the app bundle.
- Apple HIG content is © Apple Inc. Keep the copyright notice with the snapshots and do not redistribute them as part of a commercial product.

## Freshness and review

- Review this library before a design freeze, before starting implementation of a new area, and before merging any change to the AI loop or the security controls.
- Refresh the HIG snapshots when iOS ships a new major version or when a platform behavior is in doubt.
- Re-check the PWA notes whenever Safari ships a major release.
- Re-check the security standards and the threat model at each major release, quarterly, and after any incident.
- Do not add a source you have not read. A link with no note is not a reference.

## Citation format

Use a short citation in PRs, commits, and design notes:

```text
Decision: D-020
References: HIG Layout; WCAG 2.5.7; MDN Pointer events
Verification: manual iPhone pass + automated drag test
```

For local snapshots, cite the file and the live source:

```text
HIG Layout (local: docs/reference/apple-hig/layout.md; live: developer.apple.com/design/human-interface-guidelines/layout)
```

## What this library is not

- It is not a license to copy a platform’s visual style. TEMPO has its own calm, precise identity.
- It is not a substitute for testing on a real iPhone.
- It is not a static archive. If a source becomes wrong or obsolete, update or remove it and record why.
