import { useCallback, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Block } from '../../domain/entities/block';
import { resolvePlacement, type PlacementResult } from '../../domain/services/placement';

export interface DragState {
  blockId: string;
  originStartMin: number;
  originDurationMin: number;
  startY: number;
  currentStartMin: number;
}

export function useDrag(input: {
  blocks: Block[];
  hourHeight: number;
  minStartMin: number;
  onCommit: (blockId: string, result: PlacementResult) => void;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const { blocks, hourHeight, minStartMin, onCommit } = input;

  const start = useCallback((event: ReactPointerEvent, block: Block) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const next = {
      blockId: block.id,
      originStartMin: block.startMin,
      originDurationMin: block.durationMin,
      startY: event.clientY,
      currentStartMin: block.startMin,
    };
    dragRef.current = next;
    setDrag(next);
  }, []);

  const move = useCallback(
    (event: ReactPointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      const deltaMin = Math.round((((event.clientY - current.startY) / hourHeight) * 60) / 5) * 5;
      const result = resolvePlacement({
        blocks,
        movingBlockId: current.blockId,
        targetStartMin: current.originStartMin + deltaMin,
        minStartMin,
      });
      if (!result.ok) return;
      const next = { ...current, currentStartMin: result.movingStartMin };
      dragRef.current = next;
      setDrag(next);
    },
    [blocks, hourHeight, minStartMin],
  );

  const end = useCallback(() => {
    const current = dragRef.current;
    if (!current) return;
    dragRef.current = null;
    setDrag(null);
    if (current.currentStartMin === current.originStartMin) return;
    const result = resolvePlacement({
      blocks,
      movingBlockId: current.blockId,
      targetStartMin: current.currentStartMin,
      minStartMin,
    });
    onCommit(current.blockId, result);
  }, [blocks, minStartMin, onCommit]);

  const cancel = useCallback(() => {
    dragRef.current = null;
    setDrag(null);
  }, []);

  const ghost = useMemo(() => {
    if (!drag) return null;
    return resolvePlacement({
      blocks,
      movingBlockId: drag.blockId,
      targetStartMin: drag.currentStartMin,
      minStartMin,
    });
  }, [drag, blocks, minStartMin]);

  return { drag, ghost, start, move, end, cancel };
}
