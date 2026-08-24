import { useEffect, useState, type RefObject } from 'react';
import { insertAtCaret } from './caret';
import { useEditorHost } from './editorHost';

interface EditorLifecycleOptions<T extends HTMLElement> {
  dirty: boolean;
  canSave: boolean;
  save: () => void;
  focusRef: RefObject<T | null>;
}

export function useEditorLifecycle<T extends HTMLElement>({
  dirty,
  canSave,
  save,
  focusRef,
}: EditorLifecycleOptions<T>): void {
  const host = useEditorHost();

  useEffect(() => {
    host.setDirty(dirty);
  }, [dirty, host]);

  useEffect(() => {
    host.setSaver(canSave ? save : null);
    return () => host.setSaver(null);
  }, [canSave, host, save]);

  useEffect(() => {
    focusRef.current?.focus();
  }, [focusRef]);
}

export function useCaretInsertion<T extends HTMLInputElement | HTMLTextAreaElement>(
  inputRef: RefObject<T | null>,
  value: string,
  setValue: (value: string) => void
): (token: string) => void {
  const [caret, setCaret] = useState<number | null>(null);

  useEffect(() => {
    if (caret === null || !inputRef.current) return;
    inputRef.current.focus();
    inputRef.current.setSelectionRange(caret, caret);
    setCaret(null);
  }, [caret, inputRef, value]);

  return (token: string) => {
    const next = insertAtCaret(inputRef.current, value, token);
    setValue(next.value);
    setCaret(next.caret);
  };
}
