# Calendar export

One day to a `.ics` file, handed to the system share sheet. TEMPO never touches a calendar — the receiving app does.

```mermaid
sequenceDiagram
    participant U as User
    participant A as App.tsx
    participant S as services.exportIcs
    participant G as BrowserCalendarExportGateway
    participant W as buildIcs
    participant SH as ShareGateway
    U->>A: Settings or ImportExport, "Calendar file"
    A->>S: exportIcs(date)
    S->>S: listByDate(date), read settings
    S->>G: exportDay(date, blocks, icsAlarmMinutes)
    G->>W: buildIcs
    W-->>G: text/calendar File tempo-YYYY-MM-DD.ics
    G-->>S: File
    S->>SH: shareFile(file)
    SH-->>U: system share sheet
```

```mermaid
flowchart TD
    B["blocks of the day"] --> SORT["sort by startMin"]
    SORT --> EV["one VEVENT per block"]
    EV --> TS["DTSTART and DTEND as local YYYYMMDDTHHMMSS"]
    TS --> MID{"ends exactly at midnight?"}
    MID -- yes --> NEXT["roll DTEND to the next day 00:00"]
    MID -- no --> OK["keep the time"]
    EV --> TXT["SUMMARY and DESCRIPTION escaped"]
    TXT --> CTRL["control characters stripped, folding at 75 bytes"]
    EV --> AL["VALARM TRIGGER -PT10M by default"]
    EV --> UID["UID sanitised to A-Z a-z 0-9 dot underscore dash"]
    NEXT --> OUT["tempo-date.ics"]
    OK --> OUT
    AL --> OUT
    UID --> OUT
```

Only the selected day is exported. `icsAlarmMinutes = 0` means the alarm fires at the start time.

- Files: `src/infrastructure/export/ics-writer.ts`, `browser-calendar-export-gateway.ts`, `src/application/use-cases/export-ics.ts`
- Output is data, never instructions: text is escaped, folded, and stripped of control bytes
