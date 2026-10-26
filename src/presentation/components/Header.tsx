import { DateNav } from './DateNav';
import styles from './Header.module.css';

export function Header({
  date,
  today,
  canCloseDay,
  onDate,
  onSettings,
  onCloseDay,
}: {
  date: string;
  today: string;
  canCloseDay: boolean;
  onDate: (date: string) => void;
  onSettings: () => void;
  onCloseDay: () => void;
}) {
  return (
    <>
      <div className={styles.bar}>
        <strong className={styles.brand}>TEMPO</strong>
        <div className={styles.actions}>
          {canCloseDay ? (
            <button type="button" className={styles.action} onClick={onCloseDay}>
              Close day
            </button>
          ) : null}
          <button type="button" className={styles.action} onClick={onSettings} aria-label="Settings">
            Settings
          </button>
        </div>
      </div>
      <DateNav date={date} today={today} onChange={onDate} />
    </>
  );
}
