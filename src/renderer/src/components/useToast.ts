import { createContext, useContext } from 'react';

export const TOAST_DURATION = 3400;

interface ToastOptions {
  duration?: number;
}

export type ToastFn = (title: string, detail?: string | string[], options?: ToastOptions) => void;

export const ToastContext = createContext<ToastFn | null>(null);

export const useToast = (): ToastFn => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
