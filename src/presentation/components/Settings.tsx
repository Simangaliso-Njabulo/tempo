import { useState } from 'react';
import type { Routine } from '../../domain/entities/routine';
import type { Settings as SettingsModel } from '../../domain/entities/settings';
import { formatBackupDate, formatStorageUsage, type StorageSummary } from '../utils/format-storage';
import { Sheet } from './Sheet';
import styles from './Sheet.module.css';

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
] as const;
const TIME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: '12h', label: '12h' },
  { value: '24h', label: '24h' },
] as const;
const ALARMS = [0, 5, 10, 15, 30, 60] as const;
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function applyThemePreview(theme: SettingsModel['theme']): void {
  let dark = theme === 'dark';
  if (theme === 'system') {
    try {
      dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch {
      dark = false;
    }
  }
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

function daysLabel(routine: Routine): string {
  return routine.daysOfWeek
    .map((day) => DAY_SHORT[day] ?? '')
    .filter(Boolean)
    .join(' ');
}

export function Settings({
  open,
  settings,
  routines,
  storage,
  lastBackupAt,
  standalone,
  version,
  onClose,
  onUpdate,
  onOpenData,
  onAddRoutine,
  onEditRoutine,
  onToggleRoutine,
  onExportIcs,
}: {
  open: boolean;
  settings: SettingsModel;
  routines: Routine[];
  storage?: StorageSummary;
  lastBackupAt?: number;
  standalone: boolean;
  version: string;
  onClose: () => void;
  onUpdate: (patch: Partial<Omit<SettingsModel, 'id' | 'updatedAt'>>) => unknown;
  onOpenData: () => void;
  onAddRoutine: () => void;
  onEditRoutine: (routine: Routine) => void;
  onToggleRoutine: (routine: Routine) => unknown;
  onExportIcs: () => unknown;
}) {
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const update = (patch: Partial<Omit<SettingsModel, 'id' | 'updatedAt'>>) => {
    setError('');
    setStatus('');
    void (async () => {
      try {
        await onUpdate(patch);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'That setting could not be saved.');
      }
    })();
  };

  const toggleRoutine = (routine: Routine) => {
    setError('');
    setStatus('');
    void (async () => {
      try {
        await onToggleRoutine(routine);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'That routine could not be changed.');
      }
    })();
  };

  const exportIcs = () => {
    setError('');
    setStatus('');
    void (async () => {
      try {
        await onExportIcs();
        setStatus('Calendar file ready.');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'That calendar file could not be made.');
      }
    })();
  };

  return (
    <Sheet
      open={open}
      title="Settings"
      onClose={onClose}
      footer={
        <button type="button" className={styles.primary} onClick={onClose}>
          Done
        </button>
      }
    >
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className={styles.hint} role="status">
          {status}
        </p>
      ) : null}

      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Theme</legend>
        <div className={styles.segmented}>
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles.segment} ${settings.theme === option.value ? styles.segmentSelected : ''}`}
              aria-pressed={settings.theme === option.value}
              onClick={() => {
                applyThemePreview(option.value);
                update({ theme: option.value });
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend className={styles.sectionTitle}>Time format</legend>
        <div className={styles.segmented}>
          {TIME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles.segment} ${settings.timeFormat === option.value ? styles.segmentSelected : ''}`}
              aria-pressed={settings.timeFormat === option.value}
              onClick={() => update({ timeFormat: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Planning</h3>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={settings.reflowAutoApply}
            onChange={(event) => update({ reflowAutoApply: event.target.checked })}
          />
          Auto-apply reflow
        </label>
        <p className={styles.hint}>Off by default. You see the preview before anything moves.</p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Reminders</h3>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={settings.inAppReminders}
            onChange={(event) => update({ inAppReminders: event.target.checked })}
          />
          In-app reminders
        </label>
        <p className={styles.hint}>Only while TEMPO is open. There are no push notifications.</p>
        <label className={styles.field} htmlFor="settings-alarm">
          Calendar reminder
          <select
            id="settings-alarm"
            value={settings.icsAlarmMinutes}
            onChange={(event) => update({ icsAlarmMinutes: Number(event.target.value) })}
          >
            {ALARMS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes === 0 ? 'No reminder' : `${minutes} minutes before`}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className={styles.section}>
        <div className={styles.listItemRow}>
          <h3 className={styles.sectionTitle}>Routines</h3>
          <button type="button" className={styles.quiet} onClick={onAddRoutine}>
            Add routine
          </button>
        </div>
        {routines.length === 0 ? <p className={styles.hint}>No routines yet.</p> : null}
        <div className={styles.list}>
          {routines.map((routine) => (
            <div key={routine.id} className={styles.listItem}>
              <div className={styles.listItemRow}>
                <strong>{routine.title}</strong>
                <button type="button" className={styles.quiet} onClick={() => onEditRoutine(routine)}>
                  Edit {routine.title}
                </button>
              </div>
              <span className={styles.hint}>{daysLabel(routine)}</span>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={routine.active}
                  aria-label={`Active ${routine.title}`}
                  onChange={() => toggleRoutine(routine)}
                />
                Active
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Data</h3>
        <p className={styles.hint}>Stored on this iPhone. TEMPO has no account and no server.</p>
        <p className={styles.hint}>
          {storage?.persisted ? 'Persistent storage is on.' : 'Persistent storage is best effort.'}
        </p>
        <p className={styles.hint}>{formatStorageUsage(storage)}</p>
        <p className={styles.hint}>Last backup: {formatBackupDate(lastBackupAt)}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.button} onClick={onOpenData}>
            Data and backup
          </button>
          <button type="button" className={styles.quiet} onClick={exportIcs}>
            Export .ics
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Install</h3>
        {standalone ? (
          <p className={styles.hint}>TEMPO is installed on your Home Screen.</p>
        ) : (
          <>
            <p className={styles.hint}>TEMPO works best from your Home Screen. It opens full screen.</p>
            <ol className={styles.steps}>
              <li>Open TEMPO in Safari.</li>
              <li>Tap Share.</li>
              <li>Tap Add to Home Screen.</li>
              <li>Tap Add.</li>
            </ol>
          </>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>About</h3>
        <p className={styles.hint}>
          TEMPO keeps your plan on this device. No account, no tracking, no analytics.
        </p>
        <p className={styles.hint}>Version {version}</p>
        {/*
          * The app ships React, Dexie, and the Geist Sans subset, and each of
          * those licences must travel with the build. Both files are checked by
          * `npm run security:licenses`, so this list cannot drift.
          */}
        <div className={styles.actions}>
          <a
            className={styles.link}
            href={`${import.meta.env.BASE_URL}licenses/THIRD-PARTY-NOTICES.txt`}
            target="_blank"
            rel="noreferrer"
          >
            Third-party notices
          </a>
          <a
            className={styles.link}
            href={`${import.meta.env.BASE_URL}licenses/geist-OFL.txt`}
            target="_blank"
            rel="noreferrer"
          >
            Geist Sans licence
          </a>
        </div>
      </section>
    </Sheet>
  );
}
