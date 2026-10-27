import type { Block } from '../entities/block';
import { ceilTo5, MINUTES_PER_DAY } from '../values/minute-of-day';
import { blocksOverlap, compareBlocks } from './overlap';
import type { BlockShift } from './reflow';

export type PlacementResult =
  | { ok: true; movingStartMin: number; changes: BlockShift[] }
  | { ok: false; reason: 'no-slot' | 'past-midnight' | 'block-not-found' | 'block-done'; changes: BlockShift[] };

export interface PlacementInput {
  blocks: Block[];
  movingBlockId: string;
  targetStartMin: number;
  minStartMin: number;
}

type StartResult = { ok: true; startMin: number } | { ok: false; reason: 'no-slot' | 'past-midnight' };

function findNearestStart(
  obstacles: Block[],
  durationMin: number,
  targetStartMin: number,
  minStartMin: number,
  preferLater: boolean,
): StartResult {
  const minStart = ceilTo5(minStartMin);
  const target = Math.max(ceilTo5(targetStartMin), minStart);
  const maxStart = MINUTES_PER_DAY - durationMin;

  const fits = (start: number): boolean => {
    if (start < minStart || start > maxStart) return false;
    const candidate = { startMin: start, durationMin };
    return !obstacles.some((obstacle) => blocksOverlap(obstacle, candidate));
  };

  if (fits(target)) return { ok: true, startMin: target };

  // Search the drag direction first, then the other direction. This keeps a
  // later drag from snapping backward when a later slot is available.
  const directions = preferLater ? [1, -1] : [-1, 1];
  for (const direction of directions) {
    for (let start = target + direction * 5; start >= minStart && start <= maxStart; start += direction * 5) {
      if (fits(start)) return { ok: true, startMin: start };
    }
  }

  return { ok: false, reason: durationMin > MINUTES_PER_DAY ? 'past-midnight' : 'no-slot' };
}

export function resolvePlacement(input: PlacementInput): PlacementResult {
  const moving = input.blocks.find((block) => block.id === input.movingBlockId);
  if (!moving) return { ok: false, reason: 'block-not-found', changes: [] };
  if (moving.status === 'done') return { ok: false, reason: 'block-done', changes: [] };

  const target = Math.max(ceilTo5(input.targetStartMin), ceilTo5(input.minStartMin));
  const duration = Math.max(5, Math.min(MINUTES_PER_DAY, moving.durationMin));
  const obstacles = input.blocks.filter(
    (block) => block.id !== moving.id && (block.anchor || block.status === 'done' || block.startMin < target),
  );

  const preferLater = target > moving.startMin;
  const slot = findNearestStart(obstacles, duration, target, input.minStartMin, preferLater);
  if (!slot.ok) return { ok: false, reason: slot.reason, changes: [] };

  const movingStart = slot.startMin;
  const after = input.blocks
    .filter((block) => block.id !== moving.id && block.startMin >= movingStart)
    .sort(compareBlocks);

  const fixed = input.blocks.filter(
    (block) => block.id !== moving.id && (block.anchor || block.status === 'done'),
  );
  const changes: BlockShift[] = [];
  let cursor = movingStart + duration;

  for (const block of after) {
    if (block.anchor || block.status === 'done') {
      cursor = Math.max(cursor, block.startMin + block.durationMin);
      continue;
    }

    const next = findNearestStart(fixed, block.durationMin, Math.max(block.startMin, cursor), cursor, true);
    if (!next.ok) return { ok: false, reason: next.reason, changes };

    if (next.startMin !== block.startMin) {
      changes.push({
        blockId: block.id,
        fromStartMin: block.startMin,
        fromDurationMin: block.durationMin,
        toStartMin: next.startMin,
        toDurationMin: block.durationMin,
      });
    }
    cursor = next.startMin + block.durationMin;
  }

  return { ok: true, movingStartMin: movingStart, changes };
}
