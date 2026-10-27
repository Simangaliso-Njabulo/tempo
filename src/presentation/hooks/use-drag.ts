import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { Block } from '../../domain/entities/block';
import { resolvePlacement, type PlacementResult } from '../../domain/services/placement';

export interface DragState {
  blockId: string;
  originStartMin: number;
  originDurationMin: number;
  startY: number;
  /** The snapped minute the finger is over, before obstacles are resolved. */
  targetStartMin: number;
}

export type DragGhostKind = 'free' | 'shifting' | 'anchored' | 'blocked';

export interface DragGhostState {
  kind: DragGhostKind;
  startMin: number;
  durationMin: number;
  shiftedCount: number;
}

const SNAP_MIN = 5;

function snappedDelta(clientY: number, startY: number, hourHeight: number): number {
  const rawMinutes = ((clientY - startY) / hourHeight) * 60;
  return Math.round(rawMinutes / SNAP_MIN) * SNAP_MIN;
}

/**
 * Direct-manipulation drag for timeline blocks.
 *
 * The pointer move handler only records the latest finger position and asks
 * for one animation frame; React renders at most once per frame and never once
 * per `pointermove`. The commit happens once, at pointer up, from the final
 * snapped position. The ghost is derived, not stored, so no other component
 * needs to know about the drag.
 */
export function useDrag(input: {
  blocks: Block[];
  hourHeight: number;
  minStartMin: number;
  onCommit: (blockId: string, result: PlacementResult) => void;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const pendingClientY = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const inputRef = useRef(input);
  const { blocks, minStartMin } = input;

  useEffect(() => {
    inputRef.current = input;
  });

  const cancelFrame = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    pendingClientY.current = null;
  }, []);

  useEffect(() => cancelFrame, [cancelFrame]);

  const updateFrom = useCallback((clientY: number) => {
    const current = dragRef.current;
    if (!current) return;
    const targetStartMin =
      current.originStartMin + snappedDelta(clientY, current.startY, inputRef.current.hourHeight);
    if (targetStartMin === current.targetStartMin) return;
    const next = { ...current, targetStartMin };
    dragRef.current = next;
    setDrag(next);
  }, []);

  const flush = useCallback(() => {
    frameRef.current = null;
    const clientY = pendingClientY.current;
    pendingClientY.current = null;
    if (clientY !== null) updateFrom(clientY);
  }, [updateFrom]);

  const start = useCallback(
    (event: ReactPointerEvent, block: Block) => {
      cancelFrame();
      event.preventDefault();
      event.stopPropagation();
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        // Capture is an optimisation; a synthetic or already-cancelled pointer
        // can reject it without breaking the drag.
      }
      const next: DragState = {
        blockId: block.id,
        originStartMin: block.startMin,
        originDurationMin: block.durationMin,
        startY: event.clientY,
        targetStartMin: block.startMin,
      };
      dragRef.current = next;
      setDrag(next);
    },
    [cancelFrame],
  );

  const move = useCallback(
    (event: ReactPointerEvent) => {
      if (!dragRef.current) return;
      pendingClientY.current = event.clientY;
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(flush);
    },
    [flush],
  );

  const end = useCallback(() => {
    const pending = pendingClientY.current;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    pendingClientY.current = null;
    const current = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!current) return;

    const final =
      pending === null
        ? current
        : {
            ...current,
            targetStartMin:
              current.originStartMin + snappedDelta(pending, current.startY, inputRef.current.hourHeight),
          };
    const { blocks: currentBlocks, minStartMin: currentMinStart, onCommit } = inputRef.current;
    const result = resolvePlacement({
      blocks: currentBlocks,
      movingBlockId: final.blockId,
      targetStartMin: final.targetStartMin,
      minStartMin: currentMinStart,
    });
    // A cancelled or unchanged drop is not an action, so it creates no undo
    // entry. A rejected move still reports back so the caller can explain it.
    if (result.ok && result.movingStartMin === final.originStartMin) return;
    onCommit(final.blockId, result);
  }, []);

  const cancel = useCallback(() => {
    cancelFrame();
    dragRef.current = null;
    setDrag(null);
  }, [cancelFrame]);

  const ghost = useMemo<DragGhostState | null>(() => {
    if (!drag) return null;
    const result = resolvePlacement({
      blocks,
      movingBlockId: drag.blockId,
      targetStartMin: drag.targetStartMin,
      minStartMin,
    });
    if (!result.ok) {
      return {
        kind: 'blocked',
        startMin: drag.targetStartMin,
        durationMin: drag.originDurationMin,
        shiftedCount: 0,
      };
    }
    const shiftedCount = result.changes.length;
    // Landing before the earliest allowed minute is a clamp, not an anchored
    // snap, so it keeps the plain time preview.
    const snapped =
      drag.targetStartMin >= minStartMin && result.movingStartMin !== drag.targetStartMin;
    return {
      kind: snapped ? 'anchored' : shiftedCount > 0 ? 'shifting' : 'free',
      startMin: result.movingStartMin,
      durationMin: drag.originDurationMin,
      shiftedCount,
    };
  }, [blocks, drag, minStartMin]);

  return { drag, ghost, start, move, end, cancel };
}
