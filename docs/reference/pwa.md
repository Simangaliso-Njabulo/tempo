# PWA, Safari, and iOS platform notes

TEMPO is an installable web app used from the iPhone Home Screen. The platform is capable, but it is not a native app. This document records the constraints that shape the product and the sources behind them.

## Canonical sources

| Topic | Source |
|---|---|
| PWA foundations | [web.dev — Learn PWA](https://web.dev/learn/pwa/) |
| Installability | [web.dev — Installation](https://web.dev/learn/pwa/installation) |
| Service workers | [W3C Service Workers](https://www.w3.org/TR/service-workers/), [MDN Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) |
| Offline data | [web.dev — Offline and background operation](https://web.dev/learn/pwa/offline-data) |
| Storage | [web.dev — Storage](https://web.dev/learn/pwa/storage), [MDN StorageManager.persist()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist) |
| Manifest | [W3C Web App Manifest](https://www.w3.org/TR/appmanifest/), [MDN Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) |
| Pointer input | [MDN Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) |
| Visibility | [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) |
| Web Push on iOS | [WebKit — Web Push for web apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) |
| Safari release notes | [Apple — Safari release notes](https://developer.apple.com/documentation/safari-release-notes) |
| Calendar export | [RFC 5545](https://datatracker.ietf.org/doc/html/rfc5545) |
| Content Security Policy | [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP), [web.dev CSP](https://web.dev/articles/csp) |
| Local encryption | [MDN Web Crypto](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) |

## Platform constraints

| Constraint | What it means for TEMPO | Source / status |
|---|---|---|
| No `beforeinstallprompt` on iOS | Install guidance must be custom: a dismissible card with exact Safari instructions. Never fake a native install prompt. | [MDN BeforeInstallPromptEvent](https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent) |
| iOS 26 opens Home Screen sites as web apps by default | The manifest still matters for name, icon, start URL, and display. Test the actual Home Screen launch, not just a Safari tab. | Safari 26 behavior; verify on device |
| Home Screen web apps have isolated storage | Safari and the Home Screen app do not share data. Test both contexts. | WebKit storage behavior |
| Home Screen apps are exempt from Safari’s 7-day script-writable storage cap | Still call `navigator.storage.persist()` after the first real plan and provide JSON export. | WebKit storage policy; [MDN persist()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist) |
| Service workers can be paused | The app must render from cache immediately on launch. Do not rely on a background worker to compute the day. | [WebKit/Safari behavior](https://webkit.org/) |
| No reliable HTML5 drag-and-drop on iOS | Use Pointer Events with pointer capture. Provide a visible “Move”/“Place” alternative for every drag. | [MDN Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events), [WCAG 2.5.7](https://www.w3.org/TR/WCAG22/#dragging-movements) |
| No background timers | Update the now line on `visibilitychange` and while visible. Do not promise background alarms. | [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) |
| No custom haptics or vibration | Do not design around haptics. Use visual and tactile-feeling press states instead. | WebKit/iOS behavior |
| No Web Push without a server | Use in-app reminders plus `.ics` export with `VALARM`. | [WebKit Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) |
| iOS 26.1 status-bar/fullscreen regression | Do not depend on translucent status bars or content under the status bar. Use an opaque top band and an app-shell grid. | Field note; verify against Safari 26.1 release notes and Apple Developer Forums |
| Fixed/sticky positioning regressions in some iOS configurations | Prefer a CSS grid app shell with an internal scroll area over `position: fixed` chrome. | Field note; verify on each iOS release |

## Required PWA surface

- `viewport-fit=cover`, `height: 100dvh` with a `100vh` fallback.
- App-shell grid: header / internal timeline scroll / tray. No fixed or sticky chrome.
- Safe areas: `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
- Opaque top band matching the theme; `theme-color` light and dark variants.
- Inline critical CSS in `index.html` for the background and wordmark, so there is no white flash before hydration. **Production exception:** use a small self-hosted `public/boot.css` linked before the module instead of an inline `<style>`, so the CSP can stay `style-src 'self'` with no `unsafe-inline`. The dev server may inline for speed; the production artifact must not.
- Manifest:
  - `name`, `short_name`, `start_url`, `scope`
  - `display: "standalone"`, `display_override: ["standalone", "minimal-ui"]`
  - `background_color`, `theme_color`
  - 192, 512, and 1024 icons, plus a maskable icon
- `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, 180×180 `apple-touch-icon`.
- Standalone detection via `navigator.standalone` and `matchMedia("(display-mode: standalone)")`.
- Service worker: precache the app shell; cache-first for the shell; no third-party runtime requests.
- Persistent storage request after the first real plan; JSON export/import in Settings.
- Offline reload test from the Home Screen app, not only from a Safari tab.

## Install card

- Never show on first launch.
- Show after the second real plan, when the product has demonstrated value.
- Dismissible and rate-limited.
- Exact iOS 26 instructions: Share → Add to Home Screen → Add.
- Do not use `beforeinstallprompt`; it does not exist on iOS.

## Storage and data safety

- IndexedDB is the source of truth. Dexie is the access layer.
- Request persistent storage after the first real plan.
- Provide a human-readable JSON backup and restore, plus an optional passphrase-encrypted backup.
- The plaintext export is clearly labelled "Not encrypted."
- The encrypted export uses PBKDF2-HMAC-SHA-256 (600,000 iterations) and AES-256-GCM via Web Crypto. The passphrase is never stored or logged. There is no recovery if it is forgotten.
- Live IndexedDB data is protected by the iOS app sandbox and device passcode. TEMPO does not add a passphrase to live data in v1 (D-035).
- Treat storage denial and quota pressure as normal states, not rare errors.
- Never put personal plan data in a URL, log, analytics event, or remote request.
- Home Screen and Safari are separate storage contexts; document that clearly in export/restore.
- Validate every imported file before a write. A failed import leaves the previous data intact.
- Clearing site data or deleting the app deletes the local plan. Warn before the destructive action.

## Content Security Policy and headers

- GitHub Pages cannot set custom response headers. Use a `<meta http-equiv="Content-Security-Policy">` in `index.html`.
- Production policy: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'`.
- No inline script. No inline `style` attribute. No `unsafe-inline` or `unsafe-eval`.
- No third-party script, style, font, image, or connect origin.
- `frame-ancestors` is ignored in a meta CSP. The app cannot prevent framing via GitHub Pages; record this as residual risk. There are no authenticated server actions, which limits the impact.
- The service worker precaches same-origin app-shell assets only. Do not runtime-cache third-party origins.
- Verify the built `dist/index.html`, not the dev server.

## Reminders and calendar export

- In-app reminders only while the app is open.
- `.ics` export of today’s plan with optional `VALARM` alarms.
- Import into Apple Calendar is the user’s action; do not claim background notifications.
- Use RFC 5545 semantics for dates, times, and alarms.

## Test matrix

- iPhone SE (3rd gen), 375×667 — smallest target.
- iPhone 15/16, 393×852 — primary.
- iPhone 17 Pro Max, 440×956 — large target.
- iOS 18.4 minimum and iOS 26.x primary.
- Standalone Home Screen app and Safari tab.
- Dark and light.
- Reduce Motion on/off.
- Increased Contrast on/off.
- 200% text / zoom.
- Low Power Mode.
- Airplane mode.
- Storage pressure / persistence denied.
- Wrong passphrase and tampered encrypted backup.
- Malicious JSON import (oversized, unknown fields, prototype-pollution key).
- `.ics` import with CRLF/commas/semicolons in the title.
- CSP: no third-party request, no inline script, no console CSP violation.
- Midnight rollover and DST transition.

## Open verification items

- [ ] Confirm the exact iOS 26.1 status-bar behavior on the target device and record the workaround.
- [ ] Confirm the Home Screen web-app default in iOS 26 and the exact install copy.
- [ ] Confirm persistent-storage behavior after a Home Screen install.
- [ ] Confirm service-worker pause/restart behavior after several days.
- [ ] Confirm `.ics` import and alarm behavior in Apple Calendar.
- [ ] Confirm the app launches offline after a cold device restart.
- [ ] Confirm the production CSP has no violations and no third-party origin.
- [ ] Confirm the external boot stylesheet prevents a white flash without `unsafe-inline`.
- [ ] Confirm encrypted export and restore on a real iPhone, including a wrong passphrase.
- [ ] Confirm that a failed replace import leaves the existing plan intact.
