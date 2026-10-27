import { memo, useLayoutEffect, useRef } from 'react';
import type { DragGhostState } from '../hooks/use-drag';
import { formatDuration, formatTime, type TimeFormat } from '../utils/format-time';
import { HOUR_HEIGHT, MIN_VISUAL_HEIGHT } from '../utils/timeline-layout';
import styles from './DragGhost.module.css';

/**
 * The transient landing preview for a drag.
 *
 * It is decorative: the dragged block keeps focus and its accessible name, and
 * the commit announces the result through a toast. Position and height are
 * written through the CSSOM, never a `style` attribute, so production keeps
 * `style-src 'self'`.
 */
export const DragGhost = memo(function DragGhost({
  ghost,
  timeFormat,
}: {
  ghost: DragGhostState;
  timeFormat: TimeFormat;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const top = (ghost.startMin / 60) * HOUR_HEIGHT;
  const height = Math.max(MIN_VISUAL_HEIGHT, (ghost.durationMin / 60) * HOUR_HEIGHT - 2);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.top = `${top}px`;
    element.style.height = `${height}px`;
  }, [top, height]);

  const endMin = ghost.startMin + ghost.durationMin;
  const label =
    ghost.kind === 'blocked'
      ? 'No room here'
      : ghost.kind === 'anchored'
        ? `Anchored block · ${formatTime(ghost.startMin, timeFormat)}`
        : ghost.kind === 'shifting'
          ? `Shift ${ghost.shiftedCount} ${ghost.shiftedCount === 1 ? 'block' : 'blocks'} · ${formatTime(ghost.startMin, timeFormat)}`
          : `${formatTime(ghost.startMin, timeFormat)} – ${formatTime(endMin, timeFormat)}`;

  return (
    <div
      ref={ref}
      className={`${styles.ghost} ${styles[ghost.kind]}`}
      aria-hidden="true"
      data-ghost-kind={ghost.kind}
    >
      <span className={styles.label}>{label}</span>
      {ghost.kind === 'free' ? (
        <span className={styles.meta}>{formatDuration(ghost.durationMin)}</span>
      ) : null}
    </div>
  );
});
