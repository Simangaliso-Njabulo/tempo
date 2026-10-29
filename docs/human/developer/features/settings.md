# Settings

One row in the `settings` store, id `app`. Every change is a single write and takes effect in the same frame.

```mermaid
sequenceDiagram
    participant U as User
    participant SH as Settings sheet
    participant S as services.updateSettings
    participant DB as settings store
    participant T as useTheme
    participant P as document
    U->>SH: pick theme or toggle
    SH->>S: updateSettings({patch})
    S->>DB: put with updatedAt = clock.now()
    DB-->>S: committed
    S-->>SH: Settings
    DB-->>T: liveQuery emits new settings
    T->>P: dataset.theme = dark or light
    T->>P: meta theme-color updated
    T-->>U: theme switches now, or follows the system
```

```mermaid
flowchart TD
    PATCH["updateSettings(patch)"] --> PUT["settings.put, id app"]
    PUT --> LQ["liveQuery re-emits"]
    LQ --> APP["App.tsx re-renders with new plan.settings"]
    LQ --> THEME["useTheme effect"]
    THEME --> D{"theme setting"}
    D -- dark --> DK["data-theme = dark"]
    D -- light --> LT["data-theme = light"]
    D -- system --> MD["prefers-color-scheme listener"]
    LQ --> NF["settings.flow: timeFormat, reflowAutoApply, inAppReminders, icsAlarmMinutes"]
    NF --> UI["formatting, reflow mode, reminders, alarm"]
```

| Setting | Default | Effect |
|---|---|---|
| `theme` | `system` | `data-theme` on `<html>` ([D-015](../../../design/decisions.md)) |
| `timeFormat` | `system` | 12h / 24h in every formatted time |
| `reflowAutoApply` | `false` | skip the preview sheet |
| `inAppReminders` | `true` | toast when a block starts |
| `icsAlarmMinutes` | `10` | `.ics` alarm lead time |
| `installCardDismissed` | `false` | hides the install hint forever |

- Files: `src/application/use-cases/update-settings.ts`, `src/presentation/hooks/use-theme.ts`, `src/domain/entities/settings.ts`
- Errors: unknown settings ids or invalid values are rejected before the write
