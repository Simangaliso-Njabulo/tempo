import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { ImportSummary } from '../../application/ports/backup-gateway';
import { formatBackupDate, formatStorageUsage, type StorageSummary } from '../utils/format-storage';
import { Sheet } from './Sheet';
import styles from './Sheet.module.css';

const MIN_PASSPHRASE = 12;

type ImportMode = 'merge' | 'replace';

interface SelectedFile {
  name: string;
  text: string;
  encrypted: boolean;
}

export function ImportExport({
  open,
  storage,
  lastBackupAt,
  onClose,
  onExportBackup,
  onImportBackup,
  onExportIcs,
  onReset,
}: {
  open: boolean;
  storage?: StorageSummary;
  lastBackupAt?: number;
  onClose: () => void;
  onExportBackup: (options?: { passphrase?: string }) => Promise<{
    fileName: string;
    method: 'shared' | 'downloaded';
    encrypted: boolean;
  }>;
  onImportBackup: (input: {
    text: string;
    mode: ImportMode;
    passphrase?: string;
  }) => Promise<ImportSummary>;
  onExportIcs: () => Promise<unknown>;
  onReset: () => Promise<void>;
}) {
  // Unmounting while closed clears every passphrase and file draft, so a
  // secret typed into this sheet never outlives the sheet.
  if (!open) return null;
  return (
    <ImportExportOpen
      storage={storage}
      lastBackupAt={lastBackupAt}
      onClose={onClose}
      onExportBackup={onExportBackup}
      onImportBackup={onImportBackup}
      onExportIcs={onExportIcs}
      onReset={onReset}
    />
  );
}

function ImportExportOpen({
  storage,
  lastBackupAt,
  onClose,
  onExportBackup,
  onImportBackup,
  onExportIcs,
  onReset,
}: {
  storage?: StorageSummary;
  lastBackupAt?: number;
  onClose: () => void;
  onExportBackup: (options?: { passphrase?: string }) => Promise<{
    fileName: string;
    method: 'shared' | 'downloaded';
    encrypted: boolean;
  }>;
  onImportBackup: (input: {
    text: string;
    mode: ImportMode;
    passphrase?: string;
  }) => Promise<ImportSummary>;
  onExportIcs: () => Promise<unknown>;
  onReset: () => Promise<void>;
}) {
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [exportError, setExportError] = useState('');
  const [encrypting, setEncrypting] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [exportConfirm, setExportConfirm] = useState('');

  const [selected, setSelected] = useState<SelectedFile | null>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [confirmingReplace, setConfirmingReplace] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [icsStatus, setIcsStatus] = useState('');
  const [icsError, setIcsError] = useState('');

  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetStatus, setResetStatus] = useState('');

  const runExport = async (passphrase?: string) => {
    if (exporting) return;
    setExporting(true);
    setExportError('');
    setExportStatus('');
    try {
      const result = await onExportBackup(passphrase ? { passphrase } : undefined);
      const delivery = result.method === 'shared' ? 'Shared' : 'Downloaded';
      setExportStatus(
        `${result.encrypted ? 'Encrypted backup ready' : 'Backup ready'} · ${delivery} ${result.fileName}`,
      );
      if (passphrase) {
        setEncrypting(false);
        setExportPassphrase('');
        setExportConfirm('');
      }
    } catch (caught) {
      setExportError(caught instanceof Error ? caught.message : 'That backup could not be made.');
    } finally {
      setExporting(false);
    }
  };

  const submitEncryptedExport = (event: FormEvent) => {
    event.preventDefault();
    setExportError('');
    if (exportPassphrase.length < MIN_PASSPHRASE) {
      setExportError(`Use at least ${MIN_PASSPHRASE} characters.`);
      return;
    }
    if (exportPassphrase !== exportConfirm) {
      setExportError('The passphrases do not match.');
      return;
    }
    void runExport(exportPassphrase);
  };

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setImportError('');
    setSummary(null);
    if (!file) {
      setSelected(null);
      return;
    }
    try {
      const text = await file.text();
      // The component never parses the file. The codec owns validation, and
      // this check only decides whether to ask for a passphrase.
      setSelected({ name: file.name, text, encrypted: text.includes('tempo-encrypted-backup') });
      setImportPassphrase('');
    } catch {
      setSelected(null);
      setImportError('That file could not be read.');
    }
  };

  const runImport = async (choice: ImportMode) => {
    if (!selected || importing) return;
    setImporting(true);
    setImportError('');
    setSummary(null);
    try {
      const result = await onImportBackup({
        text: selected.text,
        mode: choice,
        ...(selected.encrypted ? { passphrase: importPassphrase } : {}),
      });
      setSummary(result);
      setSelected(null);
      setImportPassphrase('');
      setConfirmingReplace(false);
      setFileInputKey((value) => value + 1);
    } catch (caught) {
      setConfirmingReplace(false);
      // One plain message covers a wrong passphrase and a broken file alike.
      setImportError(caught instanceof Error ? caught.message : 'That backup could not be imported.');
    } finally {
      setImporting(false);
    }
  };

  const submitImport = () => {
    setImportError('');
    if (!selected) {
      setImportError('Choose a backup file first.');
      return;
    }
    if (selected.encrypted && importPassphrase.length === 0) {
      setImportError('Enter the backup passphrase.');
      return;
    }
    if (mode === 'replace') {
      setConfirmingReplace(true);
      return;
    }
    void runImport('merge');
  };

  const exportCurrentFirst = async () => {
    await runExport();
  };

  const exportIcs = async () => {
    setIcsStatus('');
    setIcsError('');
    try {
      await onExportIcs();
      setIcsStatus('Calendar file ready.');
    } catch (caught) {
      setIcsError(caught instanceof Error ? caught.message : 'That calendar file could not be made.');
    }
  };

  const resetAll = async () => {
    if (resetting) return;
    setResetting(true);
    setResetError('');
    setResetStatus('');
    try {
      await onReset();
      setConfirmingReset(false);
      setResetStatus('Everything on this device was cleared.');
    } catch (caught) {
      setConfirmingReset(false);
      setResetError(caught instanceof Error ? caught.message : 'The data could not be cleared.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <Sheet
        open
        title="Data and backup"
        onClose={onClose}
        footer={
          <button type="button" className={styles.primary} onClick={onClose}>
            Done
          </button>
        }
      >
        <section className={styles.section} aria-label="Export backup">
          <h3 className={styles.sectionTitle}>Export backup</h3>
          <p className={styles.hint}>A backup is a file you keep. TEMPO never uploads it.</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.button}
              disabled={exporting}
              onClick={() => void runExport()}
            >
              Plain JSON
            </button>
            <button
              type="button"
              className={styles.button}
              disabled={exporting}
              onClick={() => {
                setExportError('');
                setEncrypting((value) => !value);
              }}
            >
              Encrypted JSON
            </button>
          </div>

          {encrypting ? (
            <form className={styles.section} onSubmit={submitEncryptedExport}>
              <label className={styles.field} htmlFor="export-passphrase">
                Passphrase
                <input
                  id="export-passphrase"
                  type="password"
                  autoComplete="new-password"
                  value={exportPassphrase}
                  onChange={(event) => setExportPassphrase(event.target.value)}
                />
              </label>
              <label className={styles.field} htmlFor="export-passphrase-confirm">
                Confirm passphrase
                <input
                  id="export-passphrase-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={exportConfirm}
                  onChange={(event) => setExportConfirm(event.target.value)}
                />
              </label>
              <p className={styles.hint}>
                At least {MIN_PASSPHRASE} characters. Without this passphrase the backup cannot be opened.
              </p>
              <div className={styles.actions}>
                <button type="submit" className={styles.primary} disabled={exporting}>
                  Make encrypted backup
                </button>
                <button
                  type="button"
                  className={styles.quiet}
                  onClick={() => {
                    setEncrypting(false);
                    setExportPassphrase('');
                    setExportConfirm('');
                    setExportError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          {exportError ? (
            <p className={styles.error} role="alert">
              {exportError}
            </p>
          ) : null}
          {exportStatus ? (
            <p className={styles.hint} role="status">
              {exportStatus}
            </p>
          ) : null}
        </section>

        <section className={styles.section} aria-label="Backup import">
          <h3 className={styles.sectionTitle}>Import backup</h3>
          <label className={styles.field} htmlFor="import-file">
            Import backup
            <input
              key={fileInputKey}
              id="import-file"
              type="file"
              accept=".json,application/json"
              onChange={(event) => void chooseFile(event)}
            />
          </label>

          {selected ? (
            <>
              <p className={styles.hint}>{selected.name}</p>
              <fieldset className={styles.section}>
                <legend className={styles.sectionTitle}>How to import</legend>
                <div className={styles.segmented}>
                  {(['merge', 'replace'] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`${styles.segment} ${mode === value ? styles.segmentSelected : ''}`}
                      aria-pressed={mode === value}
                      onClick={() => setMode(value)}
                    >
                      {value === 'merge' ? 'Merge' : 'Replace'}
                    </button>
                  ))}
                </div>
              </fieldset>
              {selected.encrypted ? (
                <label className={styles.field} htmlFor="import-passphrase">
                  Passphrase
                  <input
                    id="import-passphrase"
                    type="password"
                    autoComplete="current-password"
                    value={importPassphrase}
                    onChange={(event) => setImportPassphrase(event.target.value)}
                  />
                </label>
              ) : null}
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primary}
                  disabled={importing}
                  onClick={submitImport}
                >
                  Import
                </button>
              </div>
            </>
          ) : null}

          {importError ? (
            <p className={styles.error} role="alert">
              {importError}
            </p>
          ) : null}
          {summary ? (
            <p className={styles.hint} role="status">
              Imported {summary.added} new records, updated {summary.updated}. {summary.skipped} records skipped.
            </p>
          ) : null}
        </section>

        <section className={styles.section} aria-label="Calendar">
          <h3 className={styles.sectionTitle}>Calendar</h3>
          <div className={styles.actions}>
            <button type="button" className={styles.button} onClick={() => void exportIcs()}>
              Export .ics
            </button>
          </div>
          {icsError ? (
            <p className={styles.error} role="alert">
              {icsError}
            </p>
          ) : null}
          {icsStatus ? (
            <p className={styles.hint} role="status">
              {icsStatus}
            </p>
          ) : null}
        </section>

        <section className={styles.section} aria-label="Storage">
          <h3 className={styles.sectionTitle}>Storage</h3>
          <p className={styles.hint}>Stored on this iPhone. No account and no server.</p>
          <p className={styles.hint}>
            {storage?.persisted ? 'Persistent storage is on.' : 'Persistent storage is best effort.'}
          </p>
          <p className={styles.hint}>{formatStorageUsage(storage)}</p>
          <p className={styles.hint}>Last backup: {formatBackupDate(lastBackupAt)}</p>
        </section>

        <section className={styles.section} aria-label="Reset">
          <h3 className={styles.sectionTitle}>Reset</h3>
          <p className={styles.hint}>This clears every task, block, routine, and setting on this device.</p>
          <div className={styles.actions}>
            <button type="button" className={styles.danger} onClick={() => setConfirmingReset(true)}>
              Reset all data
            </button>
          </div>
          {resetError ? (
            <p className={styles.error} role="alert">
              {resetError}
            </p>
          ) : null}
          {resetStatus ? (
            <p className={styles.hint} role="status">
              {resetStatus}
            </p>
          ) : null}
        </section>
      </Sheet>

      <Sheet
        open={confirmingReplace}
        title="Replace all data?"
        onClose={() => setConfirmingReplace(false)}
        footer={
          <>
            <button
              type="button"
              className={styles.danger}
              disabled={importing}
              onClick={() => void runImport('replace')}
            >
              Replace data
            </button>
            <button type="button" className={styles.quiet} onClick={() => setConfirmingReplace(false)}>
              Cancel
            </button>
          </>
        }
      >
        <p className={styles.hint}>
          Replace everything on this device with the chosen backup? Your current plan will be deleted.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.button} disabled={exporting} onClick={() => void exportCurrentFirst()}>
            Export current data first
          </button>
        </div>
      </Sheet>

      <Sheet
        open={confirmingReset}
        title="Reset all data?"
        onClose={() => setConfirmingReset(false)}
        footer={
          <>
            <button
              type="button"
              className={styles.danger}
              disabled={resetting}
              onClick={() => void resetAll()}
            >
              Reset everything
            </button>
            <button type="button" className={styles.quiet} onClick={() => setConfirmingReset(false)}>
              Cancel
            </button>
          </>
        }
      >
        <p className={styles.hint}>
          This removes your tasks, timeline, routines, and settings from this device. It cannot be undone. Export a
          backup first if you might want this plan again.
        </p>
      </Sheet>
    </>
  );
}
