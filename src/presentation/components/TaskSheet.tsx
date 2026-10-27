import type { Task } from '../../domain/entities/task';
import { Sheet } from './Sheet';
import styles from './Sheet.module.css';

export function TaskSheet({
  open,
  task,
  onClose,
  onPlace,
  onArchive,
}: {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onPlace: (task: Task) => void;
  onArchive: (task: Task) => void;
}) {
  if (!task) return null;
  return (
    <Sheet
      open={open}
      title="Task"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.primary} onClick={() => onPlace(task)}>
            Place
          </button>
          <button type="button" className={styles.quiet} onClick={() => onArchive(task)}>
            Archive task
          </button>
        </>
      }
    >
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{task.title}</h3>
        {task.carriedFrom ? <span className={styles.badge}>Carried over</span> : null}
        <p className={styles.hint}>Not on the timeline yet. Place it where it fits.</p>
      </section>
    </Sheet>
  );
}
