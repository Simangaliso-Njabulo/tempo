import type { LocalDate } from '../values/local-date';
import type { MinuteOfDay } from '../values/minute-of-day';

export type BlockKind = 'task' | 'focus' | 'routine' | 'break';
export type BlockStatus = 'planned' | 'done';

export interface Block {
  id: string;
  date: LocalDate;
  startMin: MinuteOfDay;
  durationMin: number;
  kind: BlockKind;
  status: BlockStatus;
  title: string;
  taskId?: string;
  routineId?: string;
  anchor: boolean;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export function blockEnd(block: Pick<Block, 'startMin' | 'durationMin'>): number {
  return block.startMin + block.durationMin;
}

export function createBlock(input: {
  id: string;
  date: LocalDate;
  startMin: number;
  durationMin: number;
  kind: BlockKind;
  title: string;
  taskId?: string;
  routineId?: string;
  anchor?: boolean;
  now: number;
}): Block {
  return {
    id: input.id,
    date: input.date,
    startMin: input.startMin,
    durationMin: input.durationMin,
    kind: input.kind,
    status: 'planned',
    title: input.title.trim(),
    taskId: input.taskId,
    routineId: input.routineId,
    anchor: input.anchor ?? false,
    createdAt: input.now,
    updatedAt: input.now,
  };
}
