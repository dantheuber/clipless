import { createContext, useContext } from 'react';

/**
 * What an open editor tells the Tools root: whether it is dirty (so leaving asks once) and
 * how to save (so Ctrl+S works from anywhere in the tab).
 */
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

/**
 * Keep Tab inside the editor (spec 14.5): cycle its focusable controls.
 */
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
