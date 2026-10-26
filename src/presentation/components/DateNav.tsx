import { addLocalDays, isLocalDate } from '../../domain/values/local-date';
import styles from './DateNav.module.css';

export function DateNav({
  date,
  today,
  onChange,
}: {
  date: string;
  today: string;
  onChange: (date: string) => void;
}) {
  return (
    <nav className={styles.nav} aria-label="Date">
      <button
        type="button"
        className={styles.step}
        onClick={() => onChange(addLocalDays(date, -1))}
        aria-label="Previous day"
      >
        ‹
      </button>
      <label className={styles.field}>
        <span className={styles.srOnly}>Date</span>
        <input
          className={styles.input}
          type="date"
          value={date}
          max={today}
          onChange={(event) => {
            if (isLocalDate(event.target.value)) onChange(event.target.value);
          }}
        />
      </label>
      <button type="button" className={styles.today} onClick={() => onChange(today)}>
        Today
      </button>
      <button
        type="button"
        className={styles.step}
        onClick={() => onChange(addLocalDays(date, 1))}
        aria-label="Next day"
        disabled={date >= today}
      >
        ›
      </button>
    </nav>
  );
}
