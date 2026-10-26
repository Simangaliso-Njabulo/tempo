import { useCallback, useState } from 'react';

export interface UndoAction {
  label: string;
  undo: () => Promise<void>;
}

const MAX_UNDO = 10;

export function useUndo() {
  const [stack, setStack] = useState<UndoAction[]>([]);
  const push = useCallback((action: UndoAction) => {
    setStack((current) => [...current.slice(-(MAX_UNDO - 1)), action]);
  }, []);
  const undo = useCallback(async () => {
    const action = stack.at(-1);
    if (!action) return;
    setStack((current) => current.slice(0, -1));
    await action.undo();
  }, [stack]);
  return { canUndo: stack.length > 0, label: stack.at(-1)?.label, push, undo };
}
