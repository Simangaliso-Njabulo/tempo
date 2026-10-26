import { useLayoutEffect, useRef } from 'react';
import { formatTime } from '../utils/format-time';
import { HOUR_HEIGHT } from '../utils/timeline-layout';
import styles from './Timeline.module.css';

function HourRow({ hour }: { hour: number }) {
  const ref = useRef<HTMLDivElement>(null);
  // Positioning is written through the CSSOM, never a `style` attribute, so
  // the production CSP can stay `style-src 'self'`.
  useLayoutEffect(() => {
    if (ref.current) ref.current.style.top = `${hour * HOUR_HEIGHT}px`;
  }, [hour]);
  return (
    <div ref={ref} className={styles.hour}>
      <span className={styles.hourLabel}>{formatTime(hour * 60, '24h')}</span>
      <span className={styles.hourLine} />
    </div>
  );
}

export function HourGrid() {
  return (
    <div className={styles.hours} aria-hidden="true">
      {Array.from({ length: 24 }, (_, hour) => (
        <HourRow key={hour} hour={hour} />
      ))}
    </div>
  );
}
