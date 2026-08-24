import type React from 'react';
import type { ClipType } from '../../../../shared/types';

const FOCUSABLE = 'button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])';

const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement;

interface QuickLookKeyboardActions {
  clipType: ClipType;
  close: () => void;
  walk: (direction: -1 | 1) => void;
  pinAll: () => void;
  edit: () => void;
  copy: () => void;
  toggleWrap: () => void;
  copyFirstReady: () => void;
}

export function handleQuickLookKeyDown(
  event: React.KeyboardEvent<HTMLDivElement>,
  actions: QuickLookKeyboardActions
): void {
  if (event.key === 'Tab') {
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)];
    event.preventDefault();
    const at = focusable.indexOf(document.activeElement as HTMLElement);
    const next = event.shiftKey
      ? at <= 0
        ? focusable.length - 1
        : at - 1
      : at >= focusable.length - 1
        ? 0
        : at + 1;
    focusable[next].focus();
    return;
  }
  if (isTypingTarget(event.target)) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    actions.close();
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    actions.walk(1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    actions.walk(-1);
  } else if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  } else if (event.key === 'p') {
    actions.pinAll();
  } else if (event.key === 'e') {
    actions.edit();
  } else if (event.key === 'c') {
    actions.copy();
  } else if (event.key === 'w' && actions.clipType !== 'image') {
    actions.toggleWrap();
  } else if (event.key === 't') {
    actions.copyFirstReady();
  }
}
