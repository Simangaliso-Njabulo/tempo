import { blockEnd, type Block } from '../entities/block';
import { ceilTo5, MINUTES_PER_DAY } from '../values/minute-of-day';
import { blocksOverlap, compareBlocks } from './overlap';

export interface BlockShift {
  blockId: string;
  fromStartMin: number;
  fromDurationMin: number;
  toStartMin: number;
  toDurationMin: number;
}

export type ReflowResult =
  | { kind: 'noop'; reason: 'already-clear' | 'no-blocks-after' }
  | { kind: 'preview'; changes: BlockShift[] }
  | { kind: 'blocked'; reason: 'no-slot' | 'past-midnight'; blockId: string; changes: BlockShift[] };

export interface ReflowInput {
  blocks: Block[];
  nowMin: number;
  overrunBlockId: string;
}

type SlotResult = { ok: true; startMin: number } | { ok: false; reason: 'no-slot' | 'past-midnight' };

function findEarliestStart(obstacles: Block[], durationMin: number, minStart: number): SlotResult {
  const first = ceilTo5(minStart);
  if (first + durationMin > MINUTES_PER_DAY) return { ok: false, reason: 'past-midnight' };

  for (let start = first; start + durationMin <= MINUTES_PER_DAY; start += 5) {
    const candidate = { startMin: start, durationMin };
    if (!obstacles.some((obstacle) => blocksOverlap(obstacle, candidate))) {
      return { ok: true, startMin: start };
    }
  }
  return { ok: false, reason: 'no-slot' };
}

export function previewReflow(input: ReflowInput): ReflowResult {
  const sorted = [...input.blocks].sort(compareBlocks);
  const overrun = sorted.find((block) => block.id === input.overrunBlockId);
  if (!overrun || overrun.status === 'done') return { kind: 'noop', reason: 'already-clear' };

  // A block is only overrun once its scheduled end has passed. While the
  // current time is still inside it, the day does not need to move yet.
  if (input.nowMin <= blockEnd(overrun)) return { kind: 'noop', reason: 'already-clear' };

  const newEnd = ceilTo5(input.nowMin);

  const after = sorted.filter((block) => block.id !== overrun.id && compareBlocks(block, overrun) > 0);
  if (after.length === 0) return { kind: 'noop', reason: 'no-blocks-after' };

  const fixed = input.blocks.filter((block) => block.id !== overrun.id && (block.anchor || block.status === 'done'));
  const changes: BlockShift[] = [];
  let cursor = newEnd;

  for (const block of after) {
    if (block.anchor || block.status === 'done') {
      cursor = Math.max(cursor, blockEnd(block));
      continue;
    }

    const slot = findEarliestStart(fixed, block.durationMin, Math.max(block.startMin, cursor));
    if (!slot.ok) return { kind: 'blocked', reason: slot.reason, blockId: block.id, changes };

    if (slot.startMin !== block.startMin) {
      changes.push({
        blockId: block.id,
        fromStartMin: block.startMin,
        fromDurationMin: block.durationMin,
        toStartMin: slot.startMin,
        toDurationMin: block.durationMin,
      });
    }
    cursor = slot.startMin + block.durationMin;
  }

  if (changes.length === 0) return { kind: 'noop', reason: 'already-clear' };
  return { kind: 'preview', changes };
}
