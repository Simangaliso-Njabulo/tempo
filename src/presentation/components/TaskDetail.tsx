import type { Block } from '../../domain/entities/block';
import type { Task } from '../../domain/entities/task';
import { formatDuration, formatTime, parseTimeInput, toTimeInput, type TimeFormat } from '../utils/format-time';
import { Sheet } from './Sheet';
import styles from './TaskDetail.module.css';

export function TaskDetail({
  open,
  block,
  task,
  timeFormat,
  onClose,
  onComplete,
  onReopen,
  onResize,
  onMove,
  onDelete,
  onArchive,
}: {
  open: boolean;
  block: Block | null;
  task: Task | null;
  timeFormat: TimeFormat;
  onClose: () => void;
  onComplete: () => void;
  onReopen: () => void;
  onResize: (durationMin: number) => void;
  onMove: (startMin: number) => void;
  onDelete: () => void;
  onArchive: () => void;
}) {
  if (!block) return null;
  return (
    <Sheet open={open} title="Block" onClose={onClose}>
      <div className={styles.heading}>
        <h3>{block.title}</h3>
        <p>
          {formatTime(block.startMin, timeFormat)} · {formatDuration(block.durationMin)}
        </p>
        {task?.carriedFrom ? <span className={styles.badge}>Carried over</span> : null}
      </div>
      <div className={styles.actions}>
        {block.status === 'planned' ? (
          <button type="button" className={styles.primary} onClick={onComplete}>
            Complete
          </button>
        ) : (
          <button type="button" className={styles.primary} onClick={onReopen}>
            Reopen
          </button>
        )}
        <button type="button" onClick={onDelete}>
          Delete block
        </button>
      </div>
      <section className={styles.section} aria-label="Duration">
        <h4>Duration</h4>
        <div className={styles.chips}>
          {[15, 30, 45, 60, 90].map((duration) => (
            <button
              key={duration}
              type="button"
              className={block.durationMin === duration ? styles.selected : ''}
              onClick={() => onResize(duration)}
            >
              {formatDuration(duration)}
            </button>
          ))}
        </div>
      </section>
      <section className={styles.section} aria-label="Move">
        <h4>Move</h4>
        <div className={styles.moveRow}>
          <label>
            Start time
            <input
              type="time"
              defaultValue={toTimeInput(block.startMin)}
              key={block.startMin}
              onChange={(event) => {
                const value = parseTimeInput(event.target.value);
                if (value !== undefined) onMove(value);
              }}
            />
          </label>
        </div>
      </section>
      {task ? (
        <section className={styles.section}>
          <button type="button" className={styles.quiet} onClick={onArchive}>
            Archive task
          </button>
        </section>
      ) : null}
    </Sheet>
  );
}
