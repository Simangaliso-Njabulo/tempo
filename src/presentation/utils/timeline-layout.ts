import type { Block } from '../../domain/entities/block';

export const HOUR_HEIGHT = 88;
export const MIN_VISUAL_HEIGHT = 22;
export const HIT_TARGET = 44;
export const COMPACT_MAX_MIN = 30;
export const BASE_LEFT = 64;
export const LANE_OFFSET = 52;

export interface BlockGeometry {
  top: number;
  height: number;
  hitHeight: number;
  inset: number;
  hitTop: number;
  hitBottom: number;
}

export function blockGeometry(block: Pick<Block, 'startMin' | 'durationMin'>): BlockGeometry {
  const top = (block.startMin / 60) * HOUR_HEIGHT;
  const height = Math.max(MIN_VISUAL_HEIGHT, (block.durationMin / 60) * HOUR_HEIGHT - 2);
  const hitHeight = Math.max(HIT_TARGET, height);
  const inset = (hitHeight - height) / 2;
  return { top, height, hitHeight, inset, hitTop: top - inset, hitBottom: top - inset + hitHeight };
}

/**
 * Assign a side lane to compact blocks whose 44 pt hit areas overlap. Lane 0
 * is the normal timeline column; each later lane shifts right by one offset.
 * Placement prevents real overlaps, but back-to-back short blocks can still
 * collide visually because their hit areas are taller than their bodies.
 */
export function assignLanes(blocks: readonly Block[]): Map<string, number> {
  const lanes = new Map<string, number>();
  const laneEnds: number[] = [];
  const compact = blocks
    .filter((block) => block.durationMin < COMPACT_MAX_MIN)
    .slice()
    .sort((a, b) => a.startMin - b.startMin || a.id.localeCompare(b.id));

  for (const block of compact) {
    const geometry = blockGeometry(block);
    const free = laneEnds.findIndex((end) => end <= geometry.hitTop);
    if (free === -1) {
      lanes.set(block.id, laneEnds.length);
      laneEnds.push(geometry.hitBottom);
    } else {
      lanes.set(block.id, free);
      laneEnds[free] = geometry.hitBottom;
    }
  }

  return lanes;
}
