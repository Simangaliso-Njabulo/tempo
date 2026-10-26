import { useEffect, useRef } from 'react';
import type { Block } from '../../domain/entities/block';

export function useReminder(input: {
  blocks: Block[];
  nowMin: number;
  enabled: boolean;
  onRemind: (block: Block) => void;
}) {
  const reminded = useRef(new Set<string>());
  const onRemindRef = useRef(input.onRemind);
  const { blocks, nowMin, enabled } = input;

  // The callback is kept in a ref so a parent re-render does not re-run the
  // scan and repeat a reminder that has already been shown.
  useEffect(() => {
    onRemindRef.current = input.onRemind;
  }, [input.onRemind]);

  useEffect(() => {
    if (!enabled || document.visibilityState !== 'visible') return;
    const due = blocks.find(
      (block) =>
        block.status === 'planned' &&
        (block.kind === 'task' || block.kind === 'focus') &&
        block.startMin === nowMin,
    );
    if (!due || reminded.current.has(due.id)) return;
    reminded.current.add(due.id);
    onRemindRef.current(due);
  }, [blocks, nowMin, enabled]);
}
