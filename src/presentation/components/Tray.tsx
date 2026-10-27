import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import type { Block } from '../../domain/entities/block';
import type { Routine, RoutineException } from '../../domain/entities/routine';
import type { Task } from '../../domain/entities/task';
import { isRoutineDue, isRoutinePlaced } from '../../domain/services/routine-occurrence';
import type { LocalDate } from '../../domain/values/local-date';
import { formatDuration, formatTime, type TimeFormat } from '../utils/format-time';
import { Icon } from './Icon';
import styles from './Tray.module.css';

const DRAG_THRESHOLD = 8;

export function Tray({
  date,
  tasks,
  blocks,
  routines,
  exceptions,
  timeFormat,
  installPrompt,
  onAddTask,
  onOpenTask,
  onPlaceTask,
  onPlaceRoutine,
  onSkipRoutine,
  onOpenRoutine,
  onStartDrag,
  onOpenPlan,
}: {
  date: LocalDate;
  tasks: Task[];
  blocks: Block[];
  routines: Routine[];
  exceptions: RoutineException[];
  timeFormat: TimeFormat;
  installPrompt?: ReactNode;
  onAddTask: (title: string) => Promise<void>;
  onOpenTask: (task: Task) => void;
  onPlaceTask: (task: Task) => void;
  onPlaceRoutine: (routine: Routine) => void;
  onSkipRoutine: (routine: Routine) => void;
  onOpenRoutine: (routine: Routine) => void;
  onStartDrag: (event: ReactPointerEvent, task: Task) => void;
  onOpenPlan: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const press = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const inbox = tasks.filter((task) => task.status === 'inbox');
  const due = useMemo(
    () =>
      routines.filter(
        (routine) => isRoutineDue(routine, date, exceptions) && !isRoutinePlaced(blocks, routine.id, date),
      ),
    [routines, date, exceptions, blocks],
  );

  // A tap opens the task, but a drag must not. The drag hook adds its own
  // window listeners; this guard only remembers whether the press moved far
  // enough to be a drag, then clears after the click has been dispatched.
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const current = press.current;
      if (!current) return;
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > DRAG_THRESHOLD) {
        current.moved = true;
      }
    };
    const end = () => {
      window.setTimeout(() => {
        press.current = null;
      }, 0);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await onAddTask(title);
      setTitle('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That task could not be added.');
    } finally {
      setSubmitting(false);
    }
  };

  const startPress = (event: ReactPointerEvent, task: Task) => {
    press.current = { x: event.clientX, y: event.clientY, moved: false };
    onStartDrag(event, task);
  };

  const openTask = (task: Task) => {
    if (press.current?.moved) return;
    onOpenTask(task);
  };

  return (
    <section
      id="tray-panel"
      className={`${styles.tray} ${expanded ? styles.expanded : styles.collapsed}`}
      aria-label="Task tray"
    >
      <div className={styles.topRow}>
        <button
          type="button"
          className={styles.handle}
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls="tray-panel"
        >
          {expanded ? 'Collapse' : 'Plan'}
        </button>
        <span className={styles.count}>{inbox.length} to place</span>
        <button type="button" className={styles.planButton} onClick={onOpenPlan}>
          Add block
        </button>
      </div>

      <form className={styles.brainDump} onSubmit={(event) => void submit(event)}>
        <label className={styles.srOnly} htmlFor="brain-dump">
          Brain dump
        </label>
        <input
          id="brain-dump"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What needs doing?"
          autoComplete="off"
          enterKeyHint="done"
          maxLength={200}
        />
        <button type="submit" disabled={!title.trim() || submitting}>
          Add
        </button>
      </form>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {inbox.length === 0 ? (
        <p className={styles.empty}>Nothing waiting. Add a thought above.</p>
      ) : (
        <div className={styles.list} role="list" aria-label="Tasks to place">
          {inbox.map((task) => (
            <div key={task.id} className={styles.item} role="listitem">
              <button
                type="button"
                className={styles.chip}
                onPointerDown={(event) => startPress(event, task)}
                onClick={() => openTask(task)}
              >
                <span className={styles.chipTitle}>{task.title}</span>
                {task.carriedFrom ? (
                  <span className={styles.badge}>
                    <Icon name="carried" size={12} />
                    Carried over
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className={styles.place}
                onClick={() => onPlaceTask(task)}
                aria-label={`Place ${task.title}`}
              >
                Place
              </button>
            </div>
          ))}
        </div>
      )}

      {expanded ? (
        <div className={styles.routines} aria-label="Routines">
          <h2>Routines</h2>
          {due.length === 0 ? <p className={styles.empty}>No routines due today.</p> : null}
          {due.map((routine) => (
            <div key={routine.id} className={styles.item}>
              <button type="button" className={styles.chip} onClick={() => onOpenRoutine(routine)}>
                <span className={styles.chipTitle}>{routine.title}</span>
                <span className={styles.meta}>
                  {formatTime(routine.preferredStartMin, timeFormat)} · {formatDuration(routine.durationMin)}
                </span>
              </button>
              <button type="button" className={styles.place} onClick={() => onPlaceRoutine(routine)}>
                Place
              </button>
              <button
                type="button"
                className={styles.skip}
                onClick={() => onSkipRoutine(routine)}
                aria-label={`Skip ${routine.title}`}
              >
                Skip
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {installPrompt}
    </section>
  );
}
