import { useEffect, useRef } from 'react';
import { blockEnd, type Block } from '../../domain/entities/block';

export function useOverrun(input: {
  blocks: Block[];
  nowMin: number;
  enabled: boolean;
  onOverrun: (blockId: string) => void;
}) {
  const seen = useRef(new Set<string>());
  const onOverrunRef = useRef(input.onOverrun);
  const { blocks, nowMin, enabled } = input;

  useEffect(() => {
    onOverrunRef.current = input.onOverrun;
  }, [input.onOverrun]);

  useEffect(() => {
    if (!enabled) return;
    const overrun = blocks.find(
      (block) =>
        block.status === 'planned' &&
        // The block must be strictly past its end. At the exact end, the
        // reflow preview is still a no-op, so triggering there would mark the
        // block seen and never offer the shift again.
        blockEnd(block) < nowMin &&
        !seen.current.has(block.id) &&
        blocks.some(
          (other) =>
            other.id !== block.id && other.status === 'planned' && other.startMin > block.startMin,
        ),
    );
    if (!overrun) return;
    seen.current.add(overrun.id);
    onOverrunRef.current(overrun.id);
  }, [blocks, nowMin, enabled]);
}
