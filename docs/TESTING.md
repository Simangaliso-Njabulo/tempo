# Testing TEMPO

TEMPO is tested at four levels. Each level answers a different question, and a change is only done when the right levels pass.

| Level | Question it answers | Where | Command |
|---|---|---|---|
| Domain unit | Are the date, placement, reflow, carry-over, and routine rules correct? | `src/domain/**/*.test.ts` | `npm run test:domain` |
| Unit and component | Do use cases, adapters, and components behave correctly in isolation? | `src/application`, `src/infrastructure`, `src/presentation` | `npm run test` |
| Integration | Does the real container plus real Dexie produce a coherent screen? | `src/app/App.integration.test.tsx`, `src/presentation/components/ImportExport.integration.test.tsx` | `npm run test` |
| Journey e2e | Does the built app work in a real browser, offline, on a phone viewport? | `tests/e2e/*.spec.ts` | `npm run test:e2e` |

`npm run test:coverage` runs every Vitest file with coverage. Coverage is not a substitute for the e2e level; it only proves that lines were executed.

## Commands

```powershell
npm run test              # every Vitest file, no coverage
npm run test:watch        # watch mode while editing
npm run test:domain       # domain files only, with the 95% domain threshold
npm run test:coverage     # every Vitest file with the overall threshold
npm run test:e2e          # Playwright, both projects, minus @visual and @performance
npm run test:e2e:webkit   # Playwright, iPhone 13 WebKit only (the CI project)
npm run test:perf         # the 50 ms drag budget, one worker so frames are not starved
npm run test:a11y         # axe scans, tagged @a11y
npm run test:visual       # dark and light screenshot regression
npm run lighthouse        # Lighthouse against the production preview
npm run verify            # typecheck, lint, unit, build, size, PWA artifacts
```

`npm run verify` is the fast, deterministic gate. `npm run verify:full` adds coverage, e2e, the drag budget, and Lighthouse on the host machine.

The drag budget is not part of `test:e2e` on purpose. It measures the app, not the machine: two browsers sharing two CI cores once produced a 61 ms frame in code that had not changed. `npm run test:perf` runs those two tests on a single worker with the same 50 ms limit.

## Thresholds

Thresholds live in configuration and are never lowered to make a change pass.

| Scope | Config | Lines | Statements | Functions | Branches |
|---|---|---|---|---|---|
| Domain | `vitest.domain.config.ts` | 95 | 95 | 95 | 90 |
| Everything | `vitest.config.ts` | 80 | 80 | 80 | 75 |

Budgets are enforced by `scripts/check-size.mjs` and `scripts/check-pwa.mjs`:

| Budget | Limit | Current |
|---|---|---|
| JavaScript | 180 KB gzipped | 127.0 KB |
| CSS | 30 KB gzipped | 4.8 KB |
| UI + display font | 40 KB | 28.7 KB |

## Unit and component level

Vitest with `jsdom`. Files are colocated with the code they test (`Button.test.tsx` next to `Button.tsx`).

- `src/test/setup.ts` loads `@testing-library/jest-dom`, `fake-indexeddb/auto`, and a `window.matchMedia` stub. jsdom has no `matchMedia`; the app uses it only to resolve the **System** theme.
- Domain tests must not import React, Dexie, or the DOM. If a rule needs a clock or a database to test, it belongs in `application`.
- Component tests assert on roles and accessible names, not CSS classes. A test that only asserts a class name does not prove the screen works.

## Integration level

`src/app/App.integration.test.tsx` renders the real `App` with the real container, real repositories, and a real Dexie database backed by `fake-indexeddb`. It is the level that proves the wiring, not just the pieces.

It covers:

1. Add a task, place it on the timeline, undo the placement.
2. Complete, reopen, resize, move, and delete a block.
3. Add a focus block and a break without a task.
4. Persist theme and time format through the settings sheet.
5. Keep the install hint hidden until two blocks are planned, then dismiss it.
6. Close the day and keep an unfinished task for tomorrow.
7. Reset every task and block from the data sheet.

Two conventions make this level stable:

- Only `Date` is faked (`vi.useFakeTimers({ toFake: ['Date'] })`). Faking timers would deadlock `findBy*` and IndexedDB.
- The async timeout is widened (`configure({ asyncUtilTimeout })`) and each test has a 20 s budget, because a real IndexedDB write plus a live-query repaint can be slower than the 1 s default under parallel load. The assertions are unchanged.

`src/presentation/components/ImportExport.integration.test.tsx` round-trips an encrypted backup through the real sheet and proves a wrong passphrase fails closed. PBKDF2 is deliberately slow, so it has its own, wider budget.

## Journey e2e level

Playwright, two projects in `playwright.config.ts`:

| Project | Browser | Viewport | Use |
|---|---|---|---|
| `webkit-iphone` | WebKit | iPhone 13, 390 x 664 | The required CI project; closest to the shipped iPhone experience |
| `chromium-pixel` | Chromium | Pixel 7 | Cross-engine coverage and local checks |

Both run against `vite preview` on port 4173 with the production build. The suite covers:

| File | Proves |
|---|---|
| `first-run.spec.ts` | Brain dump, drag to the timeline, undo, the non-drag **Place** path, and the install hint as a footer that never covers the composer |
| `reflow-undo.spec.ts` | Overrun previews, applies, and undoes; a completed overrun does not ask |
| `carry-over.spec.ts` | Unfinished work returns at midnight with **Carried over**; finished work does not |
| `backup.spec.ts` | Export, reset, and import restores the local day |
| `offline.spec.ts` | The cached shell reloads with the network disabled |
| `security.spec.ts` | Strict CSP, no third-party request, task text rendered as text |
| `performance.spec.ts` | Drag stays inside the long-frame and DOM budgets, including reduced motion (`@performance`, run by `test:perf` on one worker) |
| `toast.spec.ts` | The undo toast sits above the tray and never covers its controls |
| `a11y.spec.ts` | axe has zero serious or critical issues (`@a11y`); every visible target is at least 44 by 44 |
| `visual.spec.ts` | Dark and light screenshots match their baselines, phone and desktop |

Helpers live in `tests/e2e/helpers.ts`. They seed a fixed date, place blocks through the real UI, and freeze the clock.

### Why drag tests look the way they do

- `fastForward(ms)` takes milliseconds; `setFixedTime` fixes `Date` only, not `performance.now()`.
- A 09:00 block sits near y = 673 on the iPhone viewport, so a drag test scrolls the timeline before aiming.
- The drag ghost and the reflow preview are visual; the tests assert the committed result and the undo, not the ghost.

## Accessibility

`npm run test:a11y` runs axe through `@axe-core/playwright` on the first-run screen, an open sheet, dark and light themes, and the tray. The gate is zero serious or critical issues.

The manual checks that automation cannot cover:

- VoiceOver reads a block as type, title, start time, duration, and state.
- VoiceOver reads **Carried over**.
- Rotor navigation reaches the timeline, the tray, and every sheet control.
- Reduce Motion removes the FLIP and ghost animation but the drop still commits.

## Visual regression

Baselines are platform-specific. Windows screenshots must not be committed; they will not match Linux rendering.

Twenty baselines, all WebKit: empty and planned days at 375, 393, and 440 px in both themes, the add sheet, the reflow preview, the carried tray, and a 1280 px desktop day in both themes (the side-column layout from the feel contract). `visual.spec.ts` skips the Chromium project because the baseline set is deliberately one engine, so `npm run test:visual` behaves the same locally as in CI.

- Update baselines only through the **Visual baselines** workflow (`.github/workflows/visual-baselines.yml`), which runs on `ubuntu-latest`, or on a Linux host with the same Playwright Docker image.
- Locally on Windows, run `npm run test:visual` to see the diff and the report, and read the failure as "my change moved a pixel", not as "the baseline is wrong".
- A visual change needs a screenshot in the pull request.

```powershell
# Linux, matching the CI image
docker run --rm -v "${PWD}:/work" -w /work mcr.microsoft.com/playwright:v1.64.1-noble `
  npx playwright test tests/e2e/visual.spec.ts --project=webkit-iphone --update-snapshots=all
```

`=all` matters. The default (`changed`) keeps the existing baseline whenever the
difference stays inside `maxDiffPixelRatio` (0.001), so a small but real change
— a duplicated word inside a clipped 22 px row — would be silently ignored and
the stale baseline uploaded.

## Lighthouse

`scripts/lighthouse.mjs` starts the production preview, runs Lighthouse with the mobile preset, writes `lighthouse-report.html`, and asserts mobile Performance >= 95, Accessibility 100, and Best Practices 100. SEO is not asserted: TEMPO is an app shell, not a crawlable site.

It runs three times and gates the median of each category. A shared CI runner is occasionally descheduled mid-task: one run reported a 1904 ms long task for a bundle that takes 114 ms of scripting on a quiet machine. The floors are unchanged and every sample is printed, so a real regression still shows up in all three runs. `LIGHTHOUSE_RUNS` must be an odd number, 3 or more.

It uses the pinned `lighthouse` dev dependency rather than `@lhci/cli`, because the LHCI tree carried high advisories that would fail `security-supply-chain` (D-036). Set `CHROME_PATH` when Chrome is not on the default path.

```powershell
npm run build
npm run lighthouse
```

## Manual iPhone checklist

Run this before a release, and after any change to gesture handling, the manifest, the service worker, or storage.

1. Install from Safari with **Add to Home Screen** and open the Home Screen app.
2. Add three tasks in under 60 seconds; the timeline is usable without scrolling sideways.
3. Drag a task with a finger and drop it; the target snaps to 15 minutes.
4. Drag a block down so it overruns; the preview appears and **Apply** shifts the rest.
5. Tap **Undo**; the exact prior plan returns.
6. Lock the phone for two minutes, unlock, and confirm the now line moved and nothing else did.
7. Turn on Airplane Mode and reload; the app opens from cache.
8. Open a sheet, focus a text field, and confirm the keyboard does not cover the field.
9. Use VoiceOver to place a task without dragging.
10. Export a backup, reset the app, and import the backup.
11. Export `.ics` and import it into Calendar; times are local and the alarm fires.
12. Change the theme to System, switch iOS to dark, return, and confirm the theme followed.
13. Delete the Home Screen app, reinstall, and confirm the app starts clean rather than half-restored.

## Device matrix

| Device | OS | Browser | Why |
|---|---|---|---|
| iPhone 13 (or newer) | iOS 18 / 26 | Safari, Home Screen app | Primary target |
| iPhone SE (3rd gen) | iOS 18 | Safari, Home Screen app | Small screen, 375 pt wide |
| iPad (10th gen) | iPadOS 18 | Safari | Right-column tray at >= 1024 px |
| Desktop | Windows / macOS | Chromium, Firefox, Safari | Keyboard, focus, responsive layout |

The automated matrix is WebKit iPhone 13 plus Chromium Pixel 7. The rest is the manual checklist above, recorded in the pull request.

## Adding a test

- Prefer the lowest level that can fail for the right reason. A rule goes in domain; a wiring bug goes in integration; a browser behavior goes in e2e.
- Test the abuse case too: a malformed import, a wrong passphrase, a script tag in a task title, a negative duration.
- Do not delete, skip, or weaken a test to make a change pass. Fix the code or write down why the expectation was wrong.
- The AI loop may not modify `vitest*.config.ts` or any test only to make CI green.
