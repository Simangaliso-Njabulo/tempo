import { useLayoutEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { Block as BlockEntity } from '../../domain/entities/block';
import { formatDuration, formatTime, type TimeFormat } from '../utils/format-time';
import { BASE_LEFT, LANE_OFFSET, blockGeometry } from '../utils/timeline-layout';
import styles from './Block.module.css';

export function Block({
  block,
  lane,
  timeFormat,
  dragging,
  onOpen,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  block: BlockEntity;
  lane: number;
  timeFormat: TimeFormat;
  dragging: boolean;
  onOpen: (block: BlockEntity) => void;
  onPointerDown: (event: ReactPointerEvent, block: BlockEntity) => void;
  onPointerMove: (event: ReactPointerEvent) => void;
  onPointerUp: (event: ReactPointerEvent) => void;
}) {
  const hitRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const leaderRef = useRef<HTMLSpanElement>(null);

  // A compact block keeps its true-time 22 px body but a 44 pt hit area. The
  // hit area grows around the body so the visual start stays exact. Blocks
  // that would collide move right into a side lane with a leader line back to
  // the true start. Everything is written through the CSSOM, never a `style`
  // attribute, so production keeps `style-src 'self'`.
  useLayoutEffect(() => {
    const geometry = blockGeometry(block);
    const hit = hitRef.current;
    const body = bodyRef.current;
    if (hit) {
      hit.style.left = `${BASE_LEFT + lane * LANE_OFFSET}px`;
      hit.style.top = `${geometry.hitTop}px`;
      hit.style.height = `${geometry.hitHeight}px`;
    }
    if (body) {
      body.style.top = `${geometry.inset}px`;
      body.style.height = `${geometry.height}px`;
    }
    const leader = leaderRef.current;
    if (leader) {
      leader.style.left = `${-lane * LANE_OFFSET}px`;
      leader.style.top = `${geometry.inset}px`;
      leader.style.width = `${lane * LANE_OFFSET}px`;
    }
  }, [block, lane]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onOpen(block);
  };

  return (
    <article
      ref={hitRef}
      className={styles.hit}
      onPointerDown={(event) => onPointerDown(event, block)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={() => onOpen(block)}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${block.title}, ${formatTime(block.startMin, timeFormat)}, ${formatDuration(block.durationMin)}`}
    >
      {lane > 0 ? <span ref={leaderRef} className={styles.leader} aria-hidden="true" /> : null}
      <div
        ref={bodyRef}
        className={`${styles.block} ${styles[block.kind]} ${block.status === 'done' ? styles.done : ''} ${dragging ? styles.dragging : ''}`}
      >
        <span className={styles.title}>{block.title}</span>
        <span className={styles.meta}>
          {formatTime(block.startMin, timeFormat)} · {formatDuration(block.durationMin)}
        </span>
        <span className={styles.handle} aria-hidden="true" />
      </div>
    </article>
  );
}
