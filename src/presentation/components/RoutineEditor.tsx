import { useState, type FormEvent } from 'react';
import type { Routine, RoutineKind } from '../../domain/entities/routine';
import { formatDuration, parseTimeInput, toTimeInput } from '../utils/format-time';
import { Sheet } from './Sheet';
import styles from './Sheet.module.css';

export interface RoutineEditorInput {
  title: string;
  kind: RoutineKind;
  daysOfWeek: number[];
  preferredStartMin: number;
  durationMin: number;
  anchor: boolean;
  active: boolean;
}

const DURATIONS = [15, 30, 45, 60, 90];
const DAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
] as const;
const ALL_DAYS = DAYS.map((day) => day.value);

export function RoutineEditor({
  open,
  routine,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  routine: Routine | null;
  onClose: () => void;
  onSave: (input: RoutineEditorInput) => Promise<unknown>;
  onDelete: (routineId: string) => Promise<unknown>;
}) {
  if (!open) return null;
  return <RoutineEditorOpen routine={routine} onClose={onClose} onSave={onSave} onDelete={onDelete} />;
}

function RoutineEditorOpen({
  routine,
  onClose,
  onSave,
  onDelete,
}: {
  routine: Routine | null;
  onClose: () => void;
  onSave: (input: RoutineEditorInput) => Promise<unknown>;
  onDelete: (routineId: string) => Promise<unknown>;
}) {
  const [title, setTitle] = useState(routine?.title ?? '');
  const [kind, setKind] = useState<RoutineKind>(routine?.kind ?? 'routine');
  const [days, setDays] = useState<number[]>(routine ? [...routine.daysOfWeek] : [...ALL_DAYS]);
  const [start, setStart] = useState(toTimeInput(routine?.preferredStartMin ?? 540));
  const [durationMin, setDurationMin] = useState(routine?.durationMin ?? 30);
  const [anchor, setAnchor] = useState(routine?.anchor ?? true);
  const [active, setActive] = useState(routine?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const toggleDay = (day: number) => {
    setDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort((a, b) => a - b),
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setError('');
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Give it a name.');
      return;
    }
    if (days.length === 0) {
      setError('Choose at least one day.');
      return;
    }
    const preferredStartMin = parseTimeInput(start);
    if (preferredStartMin === undefined) {
      setError('Choose a valid start time.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: cleanTitle,
        kind,
        daysOfWeek: [...days].sort((a, b) => a - b),
        preferredStartMin,
        durationMin,
        anchor,
        active,
      });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That routine could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!routine || saving) return;
    setSaving(true);
    setError('');
    try {
      await onDelete(routine.id);
      setConfirming(false);
      onClose();
    } catch (caught) {
      setConfirming(false);
      setError(caught instanceof Error ? caught.message : 'That routine could not be deleted.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Sheet open title={routine ? 'Edit routine' : 'New routine'} onClose={onClose}>
        <form className={styles.section} onSubmit={(event) => void submit(event)}>
          <label className={styles.field} htmlFor="routine-title">
            Title
            <input
              id="routine-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              autoComplete="off"
            />
          </label>

          <fieldset className={styles.section}>
            <legend className={styles.sectionTitle}>Kind</legend>
            <div className={styles.segmented}>
              {(['routine', 'break'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.segment} ${kind === value ? styles.segmentSelected : ''}`}
                  aria-pressed={kind === value}
                  onClick={() => setKind(value)}
                >
                  {value === 'routine' ? 'Routine' : 'Break'}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.section}>
            <legend className={styles.sectionTitle}>Days</legend>
            <div className={styles.actions}>
              {DAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  className={`${styles.chip} ${days.includes(day.value) ? styles.selected : ''}`}
                  aria-label={day.label}
                  aria-pressed={days.includes(day.value)}
                  onClick={() => toggleDay(day.value)}
                >
                  {day.short}
                </button>
              ))}
            </div>
          </fieldset>

          <label className={styles.field} htmlFor="routine-start">
            Preferred start
            <input id="routine-start" type="time" value={start} onChange={(event) => setStart(event.target.value)} />
          </label>

          <fieldset className={styles.section}>
            <legend className={styles.sectionTitle}>Duration</legend>
            <div className={styles.chips}>
              {DURATIONS.map((duration) => (
                <button
                  key={duration}
                  type="button"
                  className={`${styles.chip} ${durationMin === duration ? styles.selected : ''}`}
                  aria-pressed={durationMin === duration}
                  onClick={() => setDurationMin(duration)}
                >
                  {formatDuration(duration)}
                </button>
              ))}
            </div>
          </fieldset>

          <label className={styles.toggle}>
            <input type="checkbox" checked={anchor} onChange={(event) => setAnchor(event.target.checked)} />
            Anchor — protected from automatic reflow
          </label>

          <label className={styles.toggle}>
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
            Active
          </label>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <div className={styles.actions}>
            <button type="submit" className={styles.primary} disabled={saving}>
              Save
            </button>
            <button type="button" className={styles.quiet} onClick={onClose}>
              Cancel
            </button>
            {routine ? (
              <button type="button" className={styles.danger} onClick={() => setConfirming(true)}>
                Delete
              </button>
            ) : null}
          </div>
        </form>
      </Sheet>

      <Sheet
        open={confirming}
        title="Delete routine?"
        onClose={() => setConfirming(false)}
        footer={
          <>
            <button type="button" className={styles.danger} onClick={() => void remove()} disabled={saving}>
              Delete routine
            </button>
            <button type="button" className={styles.quiet} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        }
      >
        <p className={styles.hint}>
          Delete this routine? Future placed routine blocks will be removed. Past blocks stay.
        </p>
      </Sheet>
    </>
  );
}
