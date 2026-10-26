import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((message: string, action?: { label: string; onAction: () => void }) => {
    setToast({ id: Date.now(), message, actionLabel: action?.label, onAction: action?.onAction });
  }, []);

  // The context value is memoised so showing a toast does not hand every
  // consumer a new object. Consumers react to `show`, which is stable; the
  // toast itself renders from local state.
  const api = useMemo(() => ({ show }), [show]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <div className={styles.toast} role="status" aria-live="polite">
          <span>{toast.message}</span>
          {toast.actionLabel && toast.onAction ? (
            <button
              type="button"
              onClick={() => {
                toast.onAction?.();
                setToast(null);
              }}
            >
              {toast.actionLabel}
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
