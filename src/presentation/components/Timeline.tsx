import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import type { Block } from '../../domain/entities/block';
import { assignLanes, HOUR_HEIGHT } from '../utils/timeline-layout';
import type { TimeFormat } from '../utils/format-time';
import { Block as TimelineBlock } from './Block';
import { HourGrid } from './HourGrid';
import { NowLine } from './NowLine';
import styles from './Timeline.module.css';

const EMPTY_IDS: ReadonlySet<string> = new Set();

export function Timeline({
  viewportRef,
  blocks,
  carriedTaskIds = EMPTY_IDS,
  nowMin,
  timeFormat,
  dragBlockId,
  onOpen,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  viewportRef?: RefObject<HTMLDivElement | null>;
  blocks: Block[];
  carriedTaskIds?: ReadonlySet<string>;
  nowMin: number;
  timeFormat: TimeFormat;
  dragBlockId?: string;
  onOpen: (block: Block) => void;
  onPointerDown: (event: ReactPointerEvent, block: Block) => void;
  onPointerMove: (event: ReactPointerEvent) => void;
  onPointerUp: (event: ReactPointerEvent) => void;
}) {
  const localViewport = useRef<HTMLDivElement>(null);
  const initialNow = useRef(nowMin);
  const assignViewport = useCallback(
    (node: HTMLDivElement | null) => {
      localViewport.current = node;
      if (viewportRef) viewportRef.current = node;
    },
    [viewportRef],
  );
  const lanes = useMemo(() => assignLanes(blocks), [blocks]);

  useEffect(() => {
    const element = localViewport.current;
    if (!element) return;
    element.scrollTop = Math.max(0, (initialNow.current / 60) * HOUR_HEIGHT - 160);
  }, []);

  return (
    <div
      id="timeline"
      ref={assignViewport}
      className={styles.viewport}
      role="region"
      aria-label="Day timeline"
      tabIndex={-1}
    >
      <div className={styles.canvas}>
        <HourGrid />
        <NowLine nowMin={nowMin} />
        {blocks.map((block) => (
          <TimelineBlock
            key={block.id}
            block={block}
            lane={lanes.get(block.id) ?? 0}
            timeFormat={timeFormat}
            dragging={dragBlockId === block.id}
            carried={block.taskId ? carriedTaskIds.has(block.taskId) : false}
            onOpen={onOpen}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        ))}
      </div>
    </div>
  );
}
