import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { snapTo5 } from '../../domain/values/minute-of-day';

export interface TrayDragState {
  taskId: string;
  startMin: number;
}

const DRAG_THRESHOLD = 8;

export function useTrayDrag(input: {
  yToMinute: (clientY: number) => number;
  onCommit: (taskId: string, startMin: number) => void;
}) {
  const [drag, setDrag] = useState<TrayDragState | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const { yToMinute, onCommit } = input;

  useEffect(() => () => cleanup.current?.(), []);

  const start = useCallback(
    (event: ReactPointerEvent, taskId: string) => {
      cleanup.current?.();
      const startY = event.clientY;
      let moved = false;
      let latest = snapTo5(yToMinute(event.clientY));

      const move = (moveEvent: PointerEvent) => {
        if (!moved && Math.abs(moveEvent.clientY - startY) <= DRAG_THRESHOLD) return;
        moved = true;
        latest = snapTo5(yToMinute(moveEvent.clientY));
        setDrag({ taskId, startMin: latest });
      };
      const finish = () => {
        cleanup.current?.();
        setDrag(null);
        if (moved) onCommit(taskId, latest);
      };
      const cancel = () => {
        cleanup.current?.();
        setDrag(null);
      };

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', finish, { once: true });
      window.addEventListener('pointercancel', cancel, { once: true });
      cleanup.current = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', finish);
        window.removeEventListener('pointercancel', cancel);
        cleanup.current = null;
      };
    },
    [yToMinute, onCommit],
  );

  return { drag, start };
}
