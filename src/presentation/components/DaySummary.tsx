import { formatDuration } from '../utils/format-time';
import styles from './DaySummary.module.css';

export function DaySummary({
  planned,
  done,
  minutes,
}: {
  planned: number;
  done: number;
  minutes: number;
}) {
  return (
    <p className={styles.summary}>
      {planned} planned <span aria-hidden="true">·</span> {done} done{' '}
      <span aria-hidden="true">·</span> {formatDuration(minutes)}
    </p>
  );
}
