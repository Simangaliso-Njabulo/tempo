# Back up and restore

TEMPO stores data locally in the browser. There is no cloud backup.

## Export

**Settings → Data and backup → Export backup** creates a JSON file. Choose **Plain JSON** for a readable file or **Encrypted JSON** for a passphrase-protected file (PBKDF2-HMAC-SHA-256 and AES-256-GCM). Keep it somewhere you trust.

## Import

**Settings → Data and backup → Import backup** validates the file before writing. Choose **Replace** or **Merge**. Replace asks for confirmation and offers to export the current data first. An invalid file leaves the existing data untouched and shows a plain error.

## Calendar

**Export .ics** creates a calendar file with floating local times and the alarm you choose. It is a one-way export. TEMPO does not read your calendar.

## Reset

**Reset all data** deletes tasks, blocks, routines, settings, and metadata on this iPhone. It cannot be undone unless you have a backup.
