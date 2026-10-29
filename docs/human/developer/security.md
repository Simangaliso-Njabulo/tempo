# Security

The app has no secret to hold, so the controls are about what enters the device and what the artifact is allowed to do.

## Trust boundaries

```mermaid
flowchart TB
    subgraph U["Untrusted"]
        F["backup file the user picks"]
        ICS[".ics file handed to another app"]
        URL["URL query string"]
        ISS["issue text, PR comments, model output"]
    end
    subgraph T["Trusted - compiled app shell"]
        APP["React app, same-origin assets only"]
        DB[(tempo IndexedDB)]
    end
    F --> V["parse, validate every field, reject on first error"]
    V -->|"valid"| DB
    V -->|"invalid"| X["DomainError, previous data kept"]
    ICS --> APP
    URL --> APP
    ISS --> LOOP["AI loop - never instructions, never auto-merge"]
    APP --> CSP["CSP - same-origin scripts, styles, fonts, images, connections"]
```

## Rules that are always on

- No dynamic HTML: no `dangerouslySetInnerHTML`, `eval`, `new Function`, `innerHTML`, `document.write`.
- No third-party runtime origin: no CDN, remote font, analytics, or pixel.
- Fail closed: invalid input is rejected **before** a write; the previous data survives.
- No personal data in prompts, logs, issues, or screenshots — fixtures only.
- Encryption leaves the device only if the user asks: PBKDF2-HMAC-SHA-256 (600 000 iterations) + AES-256-GCM.

## Which gate checks what

```mermaid
flowchart LR
    SRC["source tree"] --> P1["security-policy - check-policy.mjs on the built artifact"]
    SRC --> P2["security-secrets - gitleaks over full history"]
    WF[".github/workflows"] --> P3["security-workflows - actionlint + zizmor --offline"]
    LOCK["package-lock.json"] --> P4["security-supply-chain - npm audit, OSV, licence allowlist"]
    P1 --> OK["green required check"]
    P2 --> OK
    P3 --> OK
    P4 --> OK
    NIGHT["drift-audit nightly"] --> SET["verify-security-settings.ps1"]
    SET --> OK
```

`check-policy.mjs` inspects `dist/` and the workflows for inline script, third-party fetch, unpinned actions, and secret-shaped strings. `check-licenses.mjs` reads only production dependencies (5 packages: dexie, dexie-react-hooks, react, react-dom, scheduler) and rejects any licence outside the allowlist, plus a stale third-party notice.

## Waivers

Agents may never create, extend, or delete a waiver or attestation. Critical is never waivable; high ≤30 days, medium ≤90 days. An expired record fails `security-policy` and pauses the loop.

Detail: [docs/security/README.md](../../security/README.md), [controls](../../security/controls.md), [threat model](../../security/threat-model.md).
