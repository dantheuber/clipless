import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styles from './Toast.module.css';

/**
 * In-window feedback for actions with no visible result: every clipboard write, dropped
 * pins, a cleared filter (spec 17.1). Stacks at most three, each shown for 3.4 s, dismissed
 * on click. Both windows mount the provider.
 */

export const TOAST_DURATION = 3400;
export const TOAST_LIMIT = 3;

export interface ToastOptions {
  duration?: number;
}

export type ToastFn = (title: string, detail?: string | string[], options?: ToastOptions) => void;

interface ToastEntry {
  id: number;
  title: string;
  detail: string[];
  duration: number;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ToastContext = createContext<ToastFn | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): ToastFn => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastFn>((title, detail, options) => {
    const entry: ToastEntry = {
      id: nextId.current++,
      title,
      detail: detail === undefined ? [] : Array.isArray(detail) ? detail : [detail],
      duration: options?.duration ?? TOAST_DURATION,
    };
    setToasts((current) => [...current, entry].slice(-TOAST_LIMIT));
  }, []);

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.stack} role="status" aria-live="polite">
        {toasts.map((entry) => (
          <ToastItem key={entry.id} entry={entry} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ entry, onDismiss }: { entry: ToastEntry; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(entry.id), entry.duration);
    return () => clearTimeout(timer);
  }, [entry, onDismiss]);

  return (
    <div className={styles.toast} onClick={() => onDismiss(entry.id)} data-testid="toast">
      <div className={styles.title}>{entry.title}</div>
      {entry.detail.length > 0 && (
        <ul className={styles.detail}>
          {entry.detail.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
