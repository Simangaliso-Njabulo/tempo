import { useLayoutEffect, useRef } from 'react';
import { HOUR_HEIGHT } from '../utils/timeline-layout';
import styles from './Timeline.module.css';

export function NowLine({ nowMin }: { nowMin: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (ref.current) ref.current.style.top = `${(nowMin / 60) * HOUR_HEIGHT}px`;
  }, [nowMin]);
  return (
    <div ref={ref} className={styles.now} role="separator" aria-label="Current time">
      <span className={styles.nowDot} />
      <span className={styles.nowLine} />
    </div>
  );
}
