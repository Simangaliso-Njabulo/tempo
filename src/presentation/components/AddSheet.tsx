import { useState, type FormEvent } from 'react';
import type { Task } from '../../domain/entities/task';
import { isLocalDate, type LocalDate } from '../../domain/values/local-date';
import { formatDuration, parseTimeInput, toTimeInput } from '../utils/format-time';
import { Sheet } from './Sheet';
import styles from './Sheet.module.css';

export type AddSheetTab = 'task' | 'focus' | 'break';

export interface AddTaskSheetInput {
  title: string;
  date: LocalDate;
  startMin: number;
  durationMin: number;
  /** Present when the sheet is placing an existing tray task, not creating one. */
  taskId?: string;
}

export interface AddFocusSheetInput {
  title: string;
  date: LocalDate;
  startMin: number;
  durationMin: number;
}

export interface AddBreakSheetInput {
  title: string;
  date: LocalDate;
  startMin: number;
  durationMin: number;
}

const DURATIONS = [15, 30, 45, 60, 90];
const DEFAULT_START = 540;

export function AddSheet({
  open,
  date,
  task,
  onClose,
  onAddTask,
  onAddFocus,
  onAddBreak,
}: {
  open: boolean;
  date: LocalDate;
  task?: Task | null;
  onClose: () => void;
  onAddTask: (input: AddTaskSheetInput) => Promise<unknown>;
  onAddFocus: (input: AddFocusSheetInput) => Promise<unknown>;
  onAddBreak: (input: AddBreakSheetInput) => Promise<unknown>;
}) {
  // Unmounting while closed clears the draft, so a cancelled sheet never leaks
  // a half-typed title into the next one.
  if (!open) return null;
  return (
    <AddSheetOpen
      date={date}
      task={task ?? null}
      onClose={onClose}
      onAddTask={onAddTask}
      onAddFocus={onAddFocus}
      onAddBreak={onAddBreak}
    />
  );
}

function AddSheetOpen({
  date: initialDate,
  task,
  onClose,
  onAddTask,
  onAddFocus,
  onAddBreak,
}: {
  date: LocalDate;
  task: Task | null;
  onClose: () => void;
  onAddTask: (input: AddTaskSheetInput) => Promise<unknown>;
  onAddFocus: (input: AddFocusSheetInput) => Promise<unknown>;
  onAddBreak: (input: AddBreakSheetInput) => Promise<unknown>;
}) {
  const [tab, setTab] = useState<AddSheetTab>('task');
  const [title, setTitle] = useState(task?.title ?? '');
  const [date, setDate] = useState(initialDate);
  const [start, setStart] = useState(toTimeInput(DEFAULT_START));
  const [durationMin, setDurationMin] = useState(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const chooseTab = (next: AddSheetTab) => {
    setTab(next);
    setError('');
    if (task) return;
    if (title === '' || title === 'Break') setTitle(next === 'break' ? 'Break' : '');
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
    const startMin = parseTimeInput(start);
    if (startMin === undefined) {
      setError('Choose a valid start time.');
      return;
    }
    if (!isLocalDate(date)) {
      setError('Choose a valid date.');
      return;
    }

    setSaving(true);
    try {
      if (tab === 'task') {
        await onAddTask({
          title: cleanTitle,
          date,
          startMin,
          durationMin,
          ...(task ? { taskId: task.id } : {}),
        });
      } else if (tab === 'focus') {
        await onAddFocus({ title: cleanTitle, date, startMin, durationMin });
      } else {
        await onAddBreak({ title: cleanTitle, date, startMin, durationMin });
      }
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That block could not be added.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open title={task ? 'Place task' : 'Add block'} onClose={onClose}>
      <form className={styles.section} onSubmit={(event) => void submit(event)}>
        {task ? null : (
          <div className={styles.tabs} role="tablist" aria-label="Block type">
            {(['task', 'focus', 'break'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                className={`${styles.tab} ${tab === value ? styles.tabSelected : ''}`}
                onClick={() => chooseTab(value)}
              >
                {value === 'task' ? 'Task' : value === 'focus' ? 'Focus' : 'Break'}
              </button>
            ))}
          </div>
        )}

        <label className={styles.field} htmlFor="add-title">
          Title
          <input
            id="add-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            readOnly={Boolean(task)}
            maxLength={200}
            autoComplete="off"
            enterKeyHint="done"
          />
        </label>

        <label className={styles.field} htmlFor="add-date">
          Date
          <input id="add-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>

        <label className={styles.field} htmlFor="add-start">
          Start time
          <input id="add-start" type="time" value={start} onChange={(event) => setStart(event.target.value)} />
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

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.actions}>
          <button type="submit" className={styles.primary} disabled={saving}>
            Add
          </button>
          <button type="button" className={styles.quiet} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Sheet>
  );
}
