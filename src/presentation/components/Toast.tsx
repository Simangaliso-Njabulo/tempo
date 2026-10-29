import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import styles from './Toast.module.css';

interface ToastState {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastApi {
  show: (message: string, action?: { label: string; onAction: () => void }) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * One toast at a time, queued (spec 7.13). An undo toast lives for six
 * seconds, so a burst of writes never steals an undo affordance from the one
 * before it. The queue is capped at the undo-history depth so a runaway loop
 * cannot grow it without bound.
 */
const TOAST_MS = 6_000;
const QUEUE_LIMIT = 20;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastState[]>([]);
  const nextId = useRef(1);
  const current = queue[0] ?? null;

  const show = useCallback((message: string, action?: { label: string; onAction: () => void }) => {
    const id = nextId.current++;
    setQueue((items) =>
      [
        ...items,
        { id, message, actionLabel: action?.label, onAction: action?.onAction },
      ].slice(-QUEUE_LIMIT),
    );
  }, []);

  const dismiss = useCallback((id: number) => {
    setQueue((items) => items.filter((item) => item.id !== id));
  }, []);

  // The context value is memoised so showing a toast does not hand every
  // consumer a new object. Consumers react to `show`, which is stable.
  const api = useMemo(() => ({ show }), [show]);

  const currentId = current?.id ?? null;
  useEffect(() => {
    if (currentId === null) return;
    const timer = window.setTimeout(() => dismiss(currentId), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [currentId, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {current ? (
        <div key={current.id} className={styles.toast} role="status" aria-live="polite">
          <span>{current.message}</span>
          {current.actionLabel && current.onAction ? (
            <button
              type="button"
              onClick={() => {
                current.onAction?.();
                dismiss(current.id);
              }}
            >
              {current.actionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error('ToastProvider is missing');
  return value;
}
