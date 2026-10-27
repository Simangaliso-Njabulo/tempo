import {
  useLayoutEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { Block as BlockEntity } from '../../domain/entities/block';
import { formatDuration, formatTime, type TimeFormat } from '../utils/format-time';
import { BASE_LEFT, LANE_OFFSET, blockGeometry } from '../utils/timeline-layout';
import { Icon } from './Icon';
import styles from './Block.module.css';

export const KIND_LABEL = {
  task: 'Task',
  focus: 'Focus',
  routine: 'Routine',
  break: 'Break',
} as const;

/** Below this body height there is only room for one 11 px line. */
const COMPACT_BODY_MAX = 44;

export function Block({
  block,
  lane,
  timeFormat,
  dragging,
  carried = false,
  onOpen,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  block: BlockEntity;
  lane: number;
  timeFormat: TimeFormat;
  dragging: boolean;
  carried?: boolean;
  onOpen: (block: BlockEntity) => void;
  onPointerDown: (event: ReactPointerEvent, block: BlockEntity) => void;
  onPointerMove: (event: ReactPointerEvent) => void;
  onPointerUp: (event: ReactPointerEvent) => void;
}) {
  const hitRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const leaderRef = useRef<HTMLSpanElement>(null);
  const compact = blockGeometry(block).height < COMPACT_BODY_MAX;

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

  // The visually hidden parts still reach assistive technology through this
  // label, so a compact block never loses its type, state, or carried marker.
  // The words mirror the visible text, in order, so a speech-input user can
  // say what they see. Punctuation is kept out of the prefix for the same
  // reason.
  const label = [
    KIND_LABEL[block.kind],
    block.title,
    `${formatTime(block.startMin, timeFormat)} · ${formatDuration(block.durationMin)}`,
    block.status === 'done' ? 'done' : null,
    block.anchor ? 'anchored' : null,
    carried ? 'carried over' : null,
  ]
    .filter(Boolean)
    .join(' ');

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
      aria-label={label}
    >
      {lane > 0 ? <span ref={leaderRef} className={styles.leader} aria-hidden="true" /> : null}
      <div
        ref={bodyRef}
        className={`${styles.block} ${styles[block.kind]} ${block.status === 'done' ? styles.done : ''} ${dragging ? styles.dragging : ''} ${compact ? styles.compact : ''}`}
      >
        {compact ? (
          <span className={styles.compactLine}>
            <Icon name={block.kind} size={11} />
            <span className={styles.compactKind}>{KIND_LABEL[block.kind]}</span>{' '}
            <span className={styles.compactTitle}>{block.title}</span>
            {carried ? <Icon name="carried" size={11} title="Carried over" /> : null}
            {block.anchor ? <Icon name="anchor" size={11} title="Anchored" /> : null}
          </span>
        ) : (
          <>
            <span className={styles.type}>
              <Icon name={block.kind} size={14} />
              <span>{KIND_LABEL[block.kind]}</span>
              {block.anchor ? <Icon name="anchor" size={12} title="Anchored" /> : null}
            </span>{' '}
            <span className={styles.title}>{block.title}</span>{' '}
            <span className={styles.metaRow}>
              <span className={styles.meta}>
                {formatTime(block.startMin, timeFormat)} · {formatDuration(block.durationMin)}
              </span>
              {carried ? (
                <span className={styles.badge}>
                  <Icon name="carried" size={12} />
                  Carried over
                </span>
              ) : null}
            </span>
          </>
        )}
        <span className={styles.handle} aria-hidden="true" />
      </div>
    </article>
  );
}
