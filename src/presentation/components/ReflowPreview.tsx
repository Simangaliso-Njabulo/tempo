import styles from './ReflowPreview.module.css';

export function ReflowPreview({
  count,
  onApply,
  onDismiss,
}: {
  count: number;
  onApply: () => void;
  onDismiss: () => void;
}) {
  if (count <= 0) return null;
  return (
    <section className={styles.bar} role="status" aria-live="polite" aria-atomic="true">
      <div>
        <strong>
          {count} block{count === 1 ? '' : 's'} {count === 1 ? 'needs' : 'need'} to move.
        </strong>
        <span> Routines and breaks stay put. Review before applying; you can undo it.</span>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.apply} onClick={onApply}>
          Apply
        </button>
        <button type="button" className={styles.dismiss} onClick={onDismiss}>
          Keep plan
        </button>
      </div>
    </section>
  );
}
