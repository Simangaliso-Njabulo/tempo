# Offline

The whole app is precached by a service worker, so a reload from the Home Screen works with no network. It never auto-reloads — the user chooses when to update.

```mermaid
sequenceDiagram
    participant B as Browser
    participant SW as Workbox service worker
    participant C as Cache
    participant A as App
    participant U as User
    B->>SW: install - vite-plugin-pwa precache
    SW->>C: app shell, JS, CSS, font, manifest, licences
    A->>SW: register on boot (main.tsx)
    U->>B: go offline and reopen
    B->>C: serve precached shell
    C-->>A: app boots, Dexie still local
    Note over SW,A: a new build lands on the server
    SW-->>A: UpdateWaiting event
    A-->>U: UpdateToast "New version ready"
    U->>A: tap Update
    A->>SW: skipWaiting, app reloads when safe
```

```mermaid
flowchart TD
    BUILD["npm run build"] --> WB["vite-plugin-pwa generates sw.js"]
    WB --> PRE["precache manifest, globPatterns includes txt licences"]
    PRE --> SW["registerType prompt - no auto reload"]
    OFF["network unavailable"] --> HIT["cache hit, app loads"]
    MISS["cache miss"] --> NET["network fetch"]
    UPDATE["new build detected"] --> TOAST["UpdateToast hidden while a field has focus or a sheet is open"]
    TOAST --> TAP["user taps Update"]
    TAP --> RELOAD["controlled reload"]
    PLAT["iOS Safari, not standalone"] --> HINT["InstallCard tray footer after 2 placed blocks"]
    PLAT --> ST["standalone - hint never shown"]
```

`useInstall` shows the hint only on iOS, only after the second placed block, and never when installed or dismissed (D-021). The app asks for persistent storage on boot and declines silently if the browser refuses.

- Files: `vite.config.*`, `src/main.tsx`, `src/presentation/components/UpdateToast.tsx`, `src/presentation/hooks/use-install.ts`
- Gate: `npm run check:pwa` validates manifest, icons, and worker output; `security-policy` proves there is no inline script and no third-party origin
