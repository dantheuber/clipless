import { createContext, useContext } from 'react';

export interface EditorHost {
  setDirty: (dirty: boolean) => void;
  setSaver: (save: (() => void) | null) => void;
}

export const EditorHostContext = createContext<EditorHost>({
  setDirty: () => {},
  setSaver: () => {},
});

export function useEditorHost(): EditorHost {
  return useContext(EditorHostContext);
}

export function trapTab(event: React.KeyboardEvent<HTMLElement>): void {
  if (event.key !== 'Tab') return;
  const root = event.currentTarget;
  const focusable = Array.from(
    root.querySelectorAll<HTMLElement>(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
