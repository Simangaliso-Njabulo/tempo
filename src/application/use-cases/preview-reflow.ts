import { previewReflow } from '../../domain/services/reflow';
import type { LocalDate } from '../../domain/values/local-date';
import type { BlockRepository } from '../ports/block-repository';

export function makePreviewReflow(deps: { blocks: BlockRepository }) {
  return async (input: { date: LocalDate; overrunBlockId: string; nowMin: number }) => {
    const blocks = await deps.blocks.listByDate(input.date);
    return previewReflow({ blocks, nowMin: input.nowMin, overrunBlockId: input.overrunBlockId });
  };
}
