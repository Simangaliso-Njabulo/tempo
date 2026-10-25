# TEMPO — Design Part 4: The Feel Contract

Status: Approved 2026-10-25 (D-028). Typography direction updated 2026-10-25 to Geist Sans (modern minimalist). This extends Design Parts 1–3 and is consolidated into the implementation spec.

Date: 2026-10-25

Reference library: `docs/reference/README.md`. Source map: `docs/reference/source-map.md`. The citations live there; this document records the conclusions.

---

## 1. Research digest — what the sources say and what it changes

### Apple Human Interface Guidelines

| Source | Rule that matters for TEMPO |
|---|---|
| Layout | Respect safe areas. Provide at least 44×44 pt touch targets. Use spacing and alignment to create hierarchy, not decoration. |
| Color | Every color must work in light, dark, and increased-contrast contexts. Do not rely on color alone. Use semantic color roles. |
| Typography | Use sizes people can read easily. Prefer familiar, legible type. Font weight affects legibility. Keep hierarchy obvious. |
| Motion | Motion should be purposeful, brief, and optional. Respect Reduce Motion. Avoid decorative or continuous animation. |
| Sheets | A sheet is for a scoped task related to the current context. Make dismissal clear. Do not stack modals unnecessarily. |
| Gestures | Use standard gestures. Avoid custom gestures that conflict with system gestures or scrolling. Provide alternatives. |
| Drag and drop | Direct manipulation should feel physical, but drag cannot be the only way to do something. |
| Undo and redo | People expect to reverse recent actions, often repeatedly. Make the target of an undo clear. |
| Feedback | Show status, success, failure, warnings, and correction opportunities at the right moment. Avoid unnecessary alerts. |
| Onboarding | Fast, fun, and optional. Teach through interactivity. Do not gate the product behind a tour. |
| Loading | Show something immediately. Do not make people stare at a blank screen. |
| Modality | Use sparingly. Every modal needs an obvious exit and should preserve context. |
| Context menus | Convenient but hidden by default. Provide a visible alternative for important actions. |
| Scroll views | Avoid nested scrolling. Keep the primary axis vertical. |
| Text fields | Use the right keyboard for the input. Keep labels and hints available. |

### WCAG 2.2

- **2.5.7 Dragging Movements (AA):** every drag action needs a single-pointer alternative.
- **2.5.8 Target Size (Minimum) (AA):** at least 24×24 CSS px; TEMPO will use Apple’s stricter 44×44 pt.
- **1.4.3 Contrast (Minimum):** 4.5:1 for normal text.
- **1.4.11 Non-text Contrast:** 3:1 for UI components and meaningful graphics.
- **2.4.7 Focus Visible:** keyboard focus must be clearly visible.
- **2.3.3 Animation from Interactions (AAA):** respect reduced motion.
- **1.4.10 Reflow:** no loss of content or function at 320 CSS px / 200% zoom.
- **1.4.12 Text Spacing:** content must survive increased line height and spacing.

### Nielsen Norman Group and Laws of UX

- **0.1 s:** direct-manipulation feedback should feel instantaneous.
- **1.0 s:** beyond this, the user notices the system working. Keep interactions under 1 s; target under 400 ms.
- **10 s:** beyond this, a progress indicator and an exit are required.
- Visibility of system status; user control and freedom; recognition over recall; error prevention; aesthetic and minimalist design.
- **Fitts’s Law:** large, close targets are faster. The primary “Plan” and “Add” actions stay within thumb reach.
- **Hick’s Law:** fewer choices at each step. Progressive disclosure in sheets.
- **Doherty Threshold:** aim for <400 ms. TEMPO targets <100 ms for taps and <200 ms INP.
- **Peak-End Rule:** the daily close and the carry-forward moment determine how the day feels.
- **Zeigarnik Effect:** unfinished blocks are memorable and can create anxiety. Show them calmly, without guilt or streaks.

### web.dev performance guidance

- Good **INP** is **≤200 ms** at the 75th percentile.
- Optimize input delay, processing duration, and presentation delay.
- Avoid layout thrashing: never write styles and immediately read layout in the same task.
- Keep the DOM small; avoid rendering large HTML trees during interaction.
- Yield after render-critical work; defer persistence and secondary UI updates.

### Safari / iOS PWA realities

- **No `beforeinstallprompt`.** Install guidance must be custom.
- **No HTML5 drag-and-drop on iOS.** Use Pointer Events plus pointer capture.
- **No reliable background timers.** Update the now line on `visibilitychange` and while visible.
- **No custom haptics or vibration.** Do not promise haptics; use visual/tactile-feeling feedback instead.
- **No Web Push without a server.** In-app reminders plus `.ics` export only.
- **iOS 26 defaults every website added to the Home Screen to web app mode**, unless the user turns off “Open as Web App.” A manifest still shapes name, icon, and launch URL.
- **iOS 26.1 has a status-bar/fullscreen regression.** Do not build the design around translucent status bars or content under the status bar. Design a resilient opaque top band.
- **iOS 26 has fixed/sticky positioning regressions** in some configurations. Prefer an app-shell grid with an internal scroll area over `position: fixed`.
- **Home Screen web apps are exempt from Safari’s 7-day script-writable storage cap** and get isolated storage. Still request persistent storage and provide backup.
- **Safari 26 can pause service workers.** The app must work from cache immediately on launch; do not rely on a background worker.
- **`navigator.storage.persist()` is available in modern Safari.** Request it after the first real plan.
- **Home Screen apps are a separate storage context from Safari.** Test both.

---

## 2. The design thesis

> **TEMPO is a calm, precision instrument for a human day.**

Five qualities:

1. **Quiet** — low chrome, no guilt, no confetti, no streak pressure.
2. **Precise** — time is linear, numerals are tabular, snapping is predictable.
3. **Tactile** — blocks lift, snap, and settle; pressed states feel physical.
4. **Forgiving** — previews before consequences, undo after them, no dead ends.
5. **Fast** — local-first, optimistic, under 100 ms for direct manipulation.

The memorable detail: **the now line is the only thing that moves on its own.** It is the product’s heartbeat. Everything else moves only when the user moves it. This is the brand motif, derived from the name TEMPO.

---

## 3. Visual system v3

### 3.1 Typography

**Recommendation:** one modern minimalist grotesque for the whole product.

- **Display + UI:** `Geist Sans` (SIL OFL 1.1), variable weight 100–900, Latin subset, self-hosted, preloaded.
- **Fallback:** `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif`.
- **Numerals:** tabular numerals for all times, durations, and counts.
- **Wordmark:** `TEMPO` in 11–12 px uppercase Geist, weight 650, letter-spacing 0.18em, with a 3 px violet tempo dot as the only ornament.

Why: Geist is a contemporary grotesque with precise forms, excellent numerals, and very low visual noise. It makes the date feel designed without falling back on editorial nostalgia. Using one family for display and UI gives TEMPO a consistent voice, while the system fallback keeps the interface familiar if the font fails. Hierarchy comes from size, weight, spacing, and alignment — not from mixing typefaces.

| Token | Size / line | Weight | Use |
|---|---:|---:|---|
| `display` | 34 / 38 | 560 | Day number, large empty-state line |
| `title-1` | 28 / 34 | 560 | “Sunday, 25 October” |
| `title-2` | 22 / 28 | 600 | Sheet titles |
| `headline` | 17 / 22 | 600 | Section headers, primary buttons |
| `body` | 17 / 24 | 400 | Default copy |
| `callout` | 16 / 22 | 500 | Block titles |
| `subhead` | 15 / 20 | 600 | Tray labels, metadata |
| `footnote` | 13 / 18 | 400 | Timestamps, helper text |
| `caption` | 12 / 16 | 550 | Hour labels, badges |

Rules:

- Inputs are **17 px minimum** to prevent iOS focus zoom.
- No text below 12 px. Informative text is 13 px or larger.
- Use `rem` so browser text settings and 200% zoom work.
- Text containers never have fixed heights.
- `font-variant-numeric: tabular-nums` on all time displays.
- `-webkit-text-size-adjust: 100%`; never use `maximum-scale=1` or disable pinch zoom.

### 3.2 Color tokens

The approved palette is retained, with accessible variants added. The raw accent `#7b5cff` is a brand/large-graphic color; it is **not** used for small text on dark surfaces or as a filled button with white text.

#### Dark — “Midnight & royal”

| Role | Hex | Notes |
|---|---|---|
| `bg` | `#05070c` | App background |
| `surface-1` | `#0c1220` | Timeline surface |
| `surface-2` | `#131b2e` | Blocks, sheets, tray |
| `line` | `#1d2740` | Hairline grid |
| `text-primary` | `#f4f5f9` | 18.5:1 on base |
| `text-secondary` | `#aeb6c8` | 9.9:1 on base |
| `text-tertiary` | `#7e889f` | 5.7:1 on base |
| `accent-brand` | `#7b5cff` | Now line, large graphics, focus ring |
| `accent-text` | `#a99bff` | 7.9:1 on surface-1; small accent text |
| `accent-fill` | `#6746ea` | White text 5.8:1; primary buttons |
| `routine` | `#8fa6d9` | 7.7:1 on surface-1 |
| `break` | `#7fc8b0` | 9.6:1 on surface-1 |
| `carry` | `#f2b36b` | 10.2:1 on surface-1 |
| `success` | `#6ed6a0` | 10.5:1 on surface-1 |
| `danger` | `#ff8a8a` | 8.2:1 on surface-1 |

#### Light — “Porcelain”

| Role | Hex | Notes |
|---|---|---|
| `bg` | `#f5f6fa` | App background |
| `surface-1` | `#ffffff` | Timeline surface |
| `surface-2` | `#fbfbfd` | Blocks, sheets, tray |
| `line` | `#dfe3ec` | Hairline grid |
| `text-primary` | `#0b0f1a` | 19.1:1 on white |
| `text-secondary` | `#4a5368` | 7.7:1 on white |
| `text-tertiary` | `#5f6a80` | 5.4:1 on white |
| `accent-brand` | `#5b3fe0` | 6.5:1 on white |
| `accent-text` | `#5b3fe0` | 6.5:1 on white |
| `accent-fill` | `#5b3fe0` | White text 6.5:1 |
| `routine` | `#2f5a9e` | 6.8:1 on white |
| `break` | `#2f7d68` | 4.9:1 on white |
| `carry` | `#9a5a00` | 5.5:1 on white |
| `success` | `#1f7a4d` | 5.3:1 on white |
| `danger` | `#b42318` | 6.6:1 on white |

Rules:

- Text uses primary/secondary/tertiary; semantic colors are for meaning, not decoration.
- Tinted backgrounds are 10–16% semantic color over the surface; text stays primary.
- Never use color alone: every type has an icon or label; every carried-over block says “Carried over”; every error has an icon and plain text.
- `prefers-contrast: more` strengthens borders, removes subtle tints, and increases focus-ring width.
- `prefers-reduced-transparency` replaces translucent surfaces with opaque ones.

### 3.3 Surfaces, radius, shadow

- Base radius: `8`, `12`, `16`, `22`, `999`.
- Blocks: 16. Sheets: 24 top corners. Buttons: 14. Pills: full.
- Dark: elevation by lightness and a 1 px inner highlight; no heavy shadows.
- Light: white surface with a soft two-layer shadow:
  - `0 1px 2px rgb(11 15 26 / 0.06)`
  - `0 8px 24px rgb(11 15 26 / 0.06)`
- Timeline grid: 1 px hairline at 12% opacity. Hour lines slightly stronger than half-hour lines.
- No glassmorphism, no large blurs, no `backdrop-filter` on scroll surfaces. Static radial glow behind the header is allowed; no animated gradient.

### 3.4 Layout

```text
┌─────────────────────────────────┐  safe-area top
│ TEMPO              Plan    ⋯   │  app bar, 56 px
│ Sunday, 25 October              │  display date
│ 3 blocks · 4h 30m planned       │  quiet summary
├─────────────────────────────────┤
│ 9 AM  ───────────────────────── │
│       ┌───────────────────────┐ │  timeline
│       │ Deep work      90 min │ │  scrolls internally
│       └───────────────────────┘ │
│ 10 AM ───────●───────────────── │  now line
│                                 │
├─────────────────────────────────┤
│ Inbox · 4              + Add    │  tray, collapsed 64 px
│ [task] [task] [task]            │  expanded 280 px
└─────────────────────────────────┘  safe-area bottom
```

- App shell is a CSS grid: `auto minmax(0, 1fr) auto`, `height: 100dvh`.
- Top and bottom bars are part of the grid, **not** `position: fixed`.
- The timeline is the only vertical scroll container. The tray and sheet manage their own scroll with `overscroll-behavior: contain`.
- Safe areas: `padding-top: env(safe-area-inset-top)` and `padding-bottom: env(safe-area-inset-bottom)`.
- Timeline scale: **88 px per hour**. 15 min = 22 px; 30 min = 44 px.
- Minimum interactive block height: **44 px**. Blocks under 30 min use a compact chip with an exact-time marker and move to a side lane if their hit areas would collide.
- Primary actions sit in the bottom third of the screen. The “Plan” action is in the header only when the tray is collapsed.
- Desktop/iPad: max content width 720 px; at ≥1024 px, the tray becomes a right-hand column.

### 3.5 Block anatomy

```text
┌──────────────────────────────────┐
│ ▌ 09:00–10:30        Focus       │  left rail = type, 3 px
│ ▌ Deep work                      │  title 16 px semibold
│ ▌ 90 min              ⋯     ⠿   │  metadata, 44 px actions
└──────────────────────────────────┘
```

- Left rail: 3 px, inset 12 px, radius 2 px.
- Type is never communicated by rail color alone: icon + label (“Focus”, “Routine”, “Break”, “Carried over”).
- Current block: 2 px accent border, a 2 px progress line at the bottom, and a small “Now” label. No pulsing loop.
- Selected block: 2 px accent ring, bottom resize grip. Selection persists until tap-away.
- Conflict: amber dashed outline plus “Shift 2 blocks” text. Never red.
- Carried over: amber dot + “Carried over” label; the block itself stays the same type color.
- Routine: repeat icon, dusty-blue rail. A pin icon indicates anchored.
- Break: sage rail, coffee icon, dashed edge. Breaks are pinned by default.
- Compact blocks (<30 min): 44 px hit area, 22 px visual body, exact-time marker at the true start.

### 3.6 Iconography

- 24 px grid, 1.75 px stroke, round caps, no filled icons except the active state.
- Inline SVG sprite; no icon font.
- Icons always pair with text for critical actions.
- No emoji in the UI. Emoji break the visual system and render inconsistently.
- Brand motif: the “tempo dot” — a 4 px violet dot on a 2 px vertical line. Used in the now line, the wordmark, and the empty state.

### 3.7 Empty, loading, error, and success states

**Empty day**
> Today is open.  
> Start with what’s on your mind.  
> [Brain dump] [Add a block]

No illustration. The empty hour grid is the illustration.

**Loading**
- Render the app shell and timeline grid immediately.
- If local data takes >150 ms, show a static skeleton of 2–3 blocks. No spinner.
- If >1 s, show “Opening your plan…” with a quiet indeterminate bar and a “Retry” action. Local data should never take this long.

**Storage error**
> TEMPO couldn’t open your plan.  
> Your data is still on this iPhone.  
> [Try again] [Export a backup]

Never show a blank screen or a raw error code.

**Success**
- A quiet check, a short label, and an undo when relevant.
- No confetti, no badges, no streak counters.

---

## 4. Motion and feedback

### 4.1 Motion tokens

| Token | Duration | Easing | Use |
|---|---:|---|---|
| `press` | 120 ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Button press, check |
| `hover` | 150 ms | same | Pointer feedback |
| `sheet-in` | 280 ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Sheet enter |
| `sheet-out` | 220 ms | `cubic-bezier(0.4, 0, 1, 1)` | Sheet exit |
| `block-lift` | 160 ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Drag lift, subtle overshoot |
| `drop` | 180 ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Drop settle |
| `reflow` | 320 ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Blocks shifting |
| `day-change` | 220 ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Date change |
| `toast` | 200 ms | `cubic-bezier(0.22, 1, 0.36, 1)` | Toast enter |

Rules:

- Animate only `transform` and `opacity`. Never animate `height`, `top`, or `box-shadow` on scroll.
- Use FLIP for block reflow; commit the data change once, then animate visual positions.
- No infinite animation loops. The only repeating motion is the now-line minute update, and it is a discrete update, not an animation.
- Stop the now-line timer when `document.visibilityState === 'hidden'`; refresh on return.
- `prefers-reduced-motion: reduce`: all durations become 0–80 ms, transforms are removed, and reflow is instant. State changes remain clear through color, labels, and live announcements.
- `prefers-reduced-transparency: reduce`: opaque surfaces; no blur.
- No custom haptics or vibration. iOS Safari does not expose them reliably. Do not fake them with audio.

### 4.2 Drag choreography

1. Press the 44×44 grip. After 80 ms, the block lifts: scale 1.03, shadow deepens, source dims to 40%.
2. A time bubble appears above the finger: “9:15 AM” + duration.
3. The timeline shows a ghost block at the snapped time. Snap is 5 minutes.
4. If the ghost overlaps a movable block, the ghost turns amber and shows “Shift 2 blocks.” If it overlaps an anchored routine or break, it snaps to the nearest free slot and shows “Anchored block.”
5. Drag near the top/bottom edge: auto-scroll starts only within 64 px of the edge, using `requestAnimationFrame`; stop immediately on pointerup.
6. Drop: block settles in 180 ms. The tray returns. A toast says “Moved to 9:15 AM · Undo.”
7. If the drop creates a reflow, the preview is already visible; applying is one tap.

**Non-drag alternatives (required):**
- Tap a block → detail sheet → “Move” with time steppers and a 15/30/45/60/90 duration chip row.
- Inbox item → “Place” button → time list or “Next open slot.”
- Keyboard: focus a block, press Enter, use arrow keys in the detail sheet to adjust time; `Alt+↑/↓` moves by 5 minutes when the block is focused.
- Screen reader: every block has an accessible “Move” action; no drag required.

### 4.3 Reflow choreography

**Recommended default:** auto-preview, one-tap apply. Auto-apply is an opt-in setting.

- When the current block passes its end time and is not completed, a quiet amber capsule appears: “Running 10 min over · Preview reflow.”
- The reflow engine has already computed the result. Tapping preview shows ghost positions for affected blocks and a bottom action bar: “Apply reflow” / “Keep as is.”
- Anchored routines and breaks do not move. If an anchored block blocks the shift, the affected movable blocks flow around it.
- Apply: affected blocks shift with a 20 ms stagger; total animation ≤320 ms. The current block stays put. A toast: “Shifted 4 blocks · Undo” for 6 s.
- Undo restores the exact previous times and scroll position. The reflow action is also in the undo history.
- If the user ignores the capsule, nothing moves. The plan stays predictable.
- Setting: “Auto-apply reflow when a block runs over” (default off). If on, apply after the block is 5 minutes over, with the same 6 s undo toast.

Why: this honors “auto-reflow” without surprising the user or silently rewriting the day. It also satisfies WCAG’s control/freedom and error-prevention principles.

### 4.4 Sheets

- One sheet at a time. No nested sheets.
- Detents: 60% and 90%. Drag handle only; content scrolls independently.
- Scrim tap dismisses only when there are no unsaved changes. Edits autosave as drafts; “Done” commits.
- Focus trap; Escape and the iOS back gesture close; focus returns to the trigger.
- Native `<input type="time">` for time selection; no custom wheel picker.
- Keyboard-aware: the sheet lifts above `visualViewport`; focused inputs scroll into view; 17 px input text.
- Destructive actions use an inline confirmation sheet with consequences and a red destructive button. Never `window.confirm` or `alert`.

### 4.5 Feedback, undo, and microcopy

- Every tap shows a pressed state within 100 ms. Every data write is optimistic; persistence happens within 250 ms.
- Undo toast: 6 s, one at a time, queued. Label is specific: “Moved to 9:15 AM · Undo,” “Deleted 2 blocks · Undo,” “Shifted 4 blocks · Undo.”
- Undo history: last 20 actions in the overflow menu, with timestamps and targets. Redo is available in the same place.
- `role="status"` for non-critical announcements; `role="alert"` only for errors that need attention.
- No success modal. No “Are you sure?” for reversible actions.
- Confirmation only for irreversible or high-cost actions: delete routine, replace data on import, reset all data.

**Voice:** calm, direct, specific. Never scolding, never cute under stress.

| Moment | Copy |
|---|---|
| Empty day | “Today is open. Start with what’s on your mind.” |
| Running over | “Running 10 min over. Preview reflow.” |
| Reflow applied | “Shifted 4 blocks. Undo.” |
| Carried over | “2 blocks carried over from yesterday.” |
| Day closed | “Day closed. 30 min carried to tomorrow.” |
| Storage trouble | “TEMPO couldn’t save. Your data is still on this iPhone. Export a backup.” |
| Offline | No banner. Offline is the default. |
| Update ready | “A new version is ready. Reload when you’re free.” |
| Install | “Keep TEMPO one tap away. Safari → Share → Add to Home Screen.” |
| Privacy | “Everything stays on this iPhone. No account, no tracking.” |

---

## 5. The 60-second day — moment map

### First launch
- No carousel, no account, no tutorial gate.
- The day view is already visible. The tray is expanded with one prompt: “What’s on your mind?”
- One input. Type, press Return, keep typing. Each item appears as a chip.
- After the first item, a single inline coach mark points at the grip: “Drag a task onto the timeline, or tap Place.”
- “Skip tips” is always available. Tips never block the timeline.

### Morning: Plan mode
- Tap **Plan** in the header. The tray expands; the timeline stays visible.
- The header shows a quiet progress line: “3 of 6 placed.”
- Drag tasks from the tray onto the timeline. Snap to 5 minutes. Ghost preview.
- Tap **Done** to return to live mode. The tray collapses.
- Target: first block placed in under 60 seconds.

### During the day: live mode
- The now line is the only moving element. Current block is highlighted; next block is visible below.
- Tap a block → detail sheet. Tap empty space → quick add at that time.
- Current block actions: **Done**, **Running over**, **Extend 15 min**.
- Running over: amber capsule + reflow preview. Nothing changes without a tap.
- In-app reminder: when a block starts and the app is visible, show a quiet banner: “Starting now: Deep work · Start / Snooze 5.” No push, no background scheduling.

### Evening: close the day
- A quiet “Close the day” action appears in the overflow menu after 6 pm.
- Sheet: “3 done · 2 moved · 45 min focus.” No scores, no grades.
- Unfinished blocks are listed with **Keep for tomorrow** (moves to tomorrow’s inbox) or **Let go** (archive).
- If the user does nothing, midnight moves unfinished blocks to tomorrow’s inbox with a “Carried over” badge. No auto-scheduling.

### Next morning
- Tray shows “Carried over · 2” with amber dots.
- The user can drag them into today or leave them in the inbox.
- No guilt copy, no red badges, no streak loss.

### Install
- Never on first launch.
- After the second real plan, show a dismissible card in the tray footer: “Keep TEMPO one tap away.”
- Tap opens a sheet with the exact iOS 26 steps and a “Don’t show again” action.
- If already standalone, never show it.
- On iOS 26, “Open as Web App” is on by default when adding to Home Screen; the instructions say to leave it on.

### Offline and updates
- Offline is invisible. The app has no runtime network dependency after first load.
- If the network drops, no banner. The app is local.
- If a new service worker is ready, show a toast only when the user is not editing: “A new version is ready. Reload when you’re free.”
- Never auto-reload mid-edit.

---

## 6. Interaction rules

### Day navigation
- Header: previous day / date / next day. Tap the date to open a native date picker.
- No horizontal swipe on the timeline; it conflicts with the iOS back gesture and vertical scrolling.
- “Now” pill in the timeline scrolls to the current time. If the current time is outside the visible range, the pill stays pinned at the edge with “Now ↑” / “Now ↓.”
- Preserve scroll position per day.

### Inbox tray
- Collapsed: 64 px bar with “Inbox · 4” and **Add**.
- Expanded: 280 px; vertical list of tasks with 44 px drag grips; routines pinned at the top; carried-over items at the top with amber dots.
- Tap a row → detail sheet. Press the grip → drag to timeline.
- No swipe actions. All actions are visible in the row’s overflow menu.
- Empty tray: “Inbox is clear. A blank day is allowed.”

### Blocks
- Tap: detail sheet.
- Drag grip: move.
- Bottom grip (selected): resize.
- Long-press: context menu (Edit, Duplicate, Pin, Delete). The same actions are in the visible “⋯” menu.
- Empty slot tap: quick add at that time, 30 min default.
- Overlap rules: movable blocks shift; anchored routines/breaks do not. A blocked drop snaps to the nearest free slot and explains why.

### Undo
- Toast with specific label and **Undo**, 6 s.
- Undo history: last 20 actions, grouped by day.
- Redo available.
- Destructive actions are confirmed, then still undoable where possible.

### Time and date
- Local dates only; `YYYY-MM-DD` internal keys.
- Minute-of-day integers internally.
- Display follows locale; Settings offers **System / 12-hour / 24-hour**.
- DST and midnight rollover are domain tests, not visual afterthoughts.

---

## 7. Accessibility contract

- **Touch targets:** 44×44 pt minimum; 8 px minimum spacing between adjacent targets.
- **Contrast:** 4.5:1 text; 3:1 UI components and meaningful graphics; tested in dark/light and increased contrast.
- **Focus:** 2 px accent outline with 2 px offset; 3 px in high-contrast mode; never removed.
- **Keyboard:** every action reachable; logical tab order; skip link to timeline; Escape closes sheets; no traps.
- **Screen reader:** date heading, “Timeline” list, “Inbox” list; each block reads title, type, start–end, duration, anchored/carried state, and available actions.
- **Drag alternative:** “Move” and “Place” actions in every relevant sheet; keyboard arrow adjustment.
- **Reduced motion:** no transforms or long transitions; reflow instant; all state still labeled.
- **Text scaling:** 200% zoom with no clipped content; sheets scroll; tray becomes a full-height sheet at large text sizes.
- **Color independence:** type icons/labels, “Carried over” text, error icon + message, focus ring.
- **Orientation:** no lock. Portrait-first; landscape remains functional; ≥1024 px gets a two-column layout.
- **Timing:** no time limits; no auto-dismissing critical messages; undo toast 6 s and also available in history.
- **Inputs:** 17 px minimum; correct `inputmode` and `enterkeyhint`; labels remain visible.
- **Errors:** plain language, data-safety reassurance, recovery action.

---

## 8. Performance contract

| Budget | Target |
|---|---:|
| JS, gzipped | ≤180 KB |
| CSS, gzipped | ≤30 KB |
| UI + display font | ≤40 KB, one variable font, Latin subset |
| First contentful paint (iPhone 12, 4G) | ≤1.0 s |
| Tap-to-feedback | ≤100 ms |
| INP, p75 | ≤200 ms |
| Drag frame rate | 60 fps |
| Long tasks during drag | none >50 ms |
| CLS | ≤0.02 |
| Initial DOM | ≤1,500 nodes |
| Memory | ≤100 MB |
| Local data | <10 MB/year |

Techniques:

- React 19 with `startTransition` for non-urgent updates.
- Dexie writes debounced 200 ms; bulk transactions; no synchronous storage on the main thread.
- Drag uses Pointer Events + pointer capture; visual position via CSS variable and `requestAnimationFrame`; **no React state update per pointermove**.
- Reflow computed in a pure domain function; one state commit; FLIP only for the visual shift.
- Now line updates every 30 s while visible, and on `visibilitychange`; no continuous timer.
- No `backdrop-filter`, large blurs, animated gradients, or box-shadow animation on scroll.
- Inline SVG sprite; no icon font.
- Self-hosted font with `font-display: swap`; metrics-matched fallback; preload the single UI + display font.
- Service worker precaches the app shell; cache-first; no runtime third-party requests.
- Lighthouse mobile: Performance ≥95, Accessibility 100, Best Practices 100.
- Manual trace: drag, reflow, sheet open, day switch, midnight rollover.

---

## 9. iOS / PWA contract

### Shell
- `viewport-fit=cover`.
- `height: 100dvh` with a `100vh` fallback.
- App shell grid: header / scrollable timeline / tray. No `position: fixed`.
- `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`.
- Status bar: do not depend on translucency. Draw an opaque top band that matches the theme. On iOS 26.1’s regression, the app still looks intentional.
- `theme-color` with `media="(prefers-color-scheme: dark)"` and light variants.
- Inline critical CSS in `index.html`: theme background + wordmark, so there is no white flash before hydration.
- `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-touch-icon` 180×180.
- Manifest: name, short_name, start_url, scope, display `standalone`, display_override `["standalone", "minimal-ui"]`, background_color, theme_color, 192/512/1024 icons, maskable icon.
- Detect standalone via `navigator.standalone` and `matchMedia('(display-mode: standalone)')`.

### Install
- No `beforeinstallprompt`. Custom install card after value.
- On iOS 26: Share → Add to Home Screen → leave “Open as Web App” on.
- If the user adds as a bookmark, the app still works in Safari; install card can reappear later, but never more than once per month.

### Keyboard and inputs
- `visualViewport` listener updates a `--keyboard-height` variable.
- Sheet bottom padding = `max(env(safe-area-inset-bottom), keyboard height)`.
- Focused input calls `scrollIntoView({ block: 'center' })` after the keyboard settles.
- Inputs 17 px; `enterkeyhint="done"`; `autocapitalize="sentences"` for titles; `inputmode` for numbers.
- No `maximum-scale`.

### Offline and storage
- Service worker: precache app shell; cache-first; versioned caches; cleanup on activate.
- Offline reload test is a release gate.
- `navigator.storage.persist()` after the first real plan.
- Settings shows: “Stored on this iPhone” + persistent storage status + last backup date.
- Monthly backup reminder, dismissible for 7 days. JSON export/import with schema version.
- Home Screen apps are exempt from Safari’s 7-day storage cap; Safari tabs are not. The app explains this once in Settings.
- Import: validate schema, show a preview/count, require confirmation, then replace or merge. Never silently overwrite.
- Reset: confirm, offer export first.

### Reminders and export
- No push notifications in v1.
- In-app reminder only while the app is open/visible.
- `.ics` export: floating local time, `VALARM` with configurable lead time (0/5/10/15/30 min), one event per block, notes optional.
- Use `navigator.share` when available; fallback to download.
- Test import into Apple Calendar.

### iOS limitations stated honestly
- No native haptics.
- No background reminders.
- No HTML5 drag-and-drop.
- No install prompt.
- No guaranteed background service worker.
- No sync across devices.
- No cloud backup.

---

## 10. Test matrix

### Devices / OS
- iPhone SE (3rd gen), 375×667 — smallest target.
- iPhone 15/16, 393×852 — primary.
- iPhone 17 Pro Max, 440×956 — large target.
- iOS 18.4 (minimum) and iOS 26.x (primary).
- Standalone Home Screen app and Safari tab.
- Dark and light.
- Reduce Motion on/off.
- Increased Contrast on/off.
- 200% text / zoom.
- Low Power Mode.
- Airplane mode.
- Storage pressure / persistence denied.
- Midnight rollover and DST transition.

### Automated
- Domain unit tests ≥95%; overall ≥80%.
- Playwright WebKit: first run, plan, drag, reflow, undo, day close, carry over, install card, offline reload, import/export.
- axe: zero serious/critical.
- Lighthouse mobile: Performance ≥95, Accessibility 100, Best Practices 100.
- Visual regression: dark/light, empty/planned, sheet, reflow preview, carried-over tray.
- Performance trace: no long task >50 ms during drag; INP ≤200 ms.

### Manual
- VoiceOver pass on timeline, tray, sheet, reflow announcement, undo.
- Keyboard-only pass.
- One-thumb pass on the primary actions.
- Install from Safari on a real iPhone.
- `.ics` import into Apple Calendar with alarm.
- iOS 26.1 status-bar fallback.
- Offline launch from Home Screen.

---

## 11. Recommended decisions to approve

1. **Typography:** Geist Sans for display and UI; system sans fallback. Self-hosted variable font, Latin subset, preloaded.
2. **Reflow:** auto-preview + one-tap apply by default; auto-apply is opt-in. This is safer than silently rewriting the day.
3. **Drag:** visible 44 px grips plus long-press context menus; no horizontal swipe actions. Every drag has a “Move”/“Place” alternative.
4. **Timeline scale:** 88 px/hour; 44 px minimum block target; compact treatment for sub-30-minute blocks.
5. **Install:** never on first launch; after the second real plan; dismissible; exact iOS 26 instructions.
6. **Close the day:** lightweight evening sheet; midnight carry-over is automatic and quiet.
7. **No haptics, no sound, no push, no analytics.** Use visual feedback and `.ics` instead.
8. **iOS baseline:** 18.4+; primary test on iOS 26.x; design defensively for the 26.1 status-bar regression.

---

## 12. Acceptance criteria

A build is ready for review only when:

- A new user can go from launch to first block placed in **under 60 seconds** without reading docs.
- Every drag action has a non-drag alternative.
- Every interactive target is at least **44×44 pt** with adequate spacing.
- Text contrast is ≥4.5:1; UI contrast is ≥3:1 in both themes.
- 200% text zoom loses no content or function.
- Reduce Motion removes non-essential movement; reflow still makes sense.
- VoiceOver can read every block and every reflow/undo result.
- Reflow can be undone in one tap within 6 seconds, and from history.
- The app reloads offline with data intact and no blank screen.
- The install card never appears on first launch and never blocks the plan.
- The app still looks intentional under iOS 26.1’s opaque status bar.
- Midnight rollover and DST do not lose or duplicate blocks.
- `.ics` imports into Apple Calendar with the correct alarm.
- Lighthouse mobile meets the gates; drag holds 60 fps; INP ≤200 ms.
- No serious/critical axe issues.
- Dark/light visual regression passes.
