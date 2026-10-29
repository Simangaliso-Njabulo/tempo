# Backup

Export writes every store to one JSON file; optionally it is encrypted on the device first. Import parses and validates **before** anything is touched.

```mermaid
sequenceDiagram
    participant U as User
    participant IE as ImportExport sheet
    participant S as services.exportBackup
    participant G as DexieBackupGateway
    participant C as backupCodec
    participant SH as ShareGateway
    participant M as meta store
    U->>IE: Export, optional passphrase
    IE->>S: exportBackup({passphrase})
    S->>G: exportAll() - six stores
    G-->>S: BackupFile schemaVersion 1
    alt passphrase
        S->>C: encrypt - PBKDF2 600k + AES-256-GCM
        C-->>S: envelope, file .enc.json
    else none
        S-->>S: plain .json
    end
    S->>SH: shareFile(file)
    SH-->>U: system share sheet
    S->>M: lastBackupAt = now
```

```mermaid
flowchart TD
    IMP["user picks a file"] --> READ["text"]
    READ --> SZ{"over 10 MB?"}
    SZ -- yes --> REJ["rejected, nothing read further"]
    SZ -- no --> PAR["parseBackupText"]
    PAR --> ENC{"format = tempo-encrypted-backup?"}
    ENC -- yes --> DEC["derive key, AES-GCM decrypt"]
    DEC --> BAD{"wrong passphrase?"}
    BAD -- yes --> ERR["EncryptedBackupError, no write"]
    BAD -- no --> VAL
    ENC -- no --> VAL["validateBackupFile - every field"]
    VAL --> BAD2{"invalid?"}
    BAD2 -- yes --> ERR2["BackupValidationError, previous data kept"]
    BAD2 -- no --> MODE{"replace or merge"}
    MODE -- replace --> REP["clear six stores, bulkPut, one transaction"]
    MODE -- merge --> MG["per record: newer updatedAt wins, references and overlaps checked"]
    REP --> SUM["ImportSummary added/updated/skipped"]
    MG --> SUM
```

Validation rejects before the gateway runs: an invalid import can never clear or partially write. Merge mode refuses a block that references a missing task or routine, or that overlaps an existing block on that date.

Limits: 10 MB, 10 000 items per collection, 200-character titles, only four allowlisted `meta` keys.

- Files: `src/infrastructure/export/backup-file.ts`, `backup-codec.ts`, `encrypted-backup.ts`, `dexie-backup-gateway.ts`, `src/application/use-cases/export-backup.ts`, `import-backup.ts`
- Gate: `src/infrastructure/export/**` is a protected path — human review, never auto-merged
