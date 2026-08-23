import { createContext, useCallback, useContext } from 'react';
import type { SettingsApplyResult, UserSettings } from '../../../../../shared/types';

/**
 * The per-control status model of spec 15.3. Every control on General and Hotkeys owns
 * one slot keyed by its setting (or "hk:<row>"): "saving" while the write runs, "saved"
 * for two seconds with an undo link that stays five, "not saved" with a retry link until
 * retried. On failure the control returns to its previous value. The store below is the
 * only code that writes settings, so one failure path covers every row.
 */

export const SAVED_LABEL_MS = 2000;
export const UNDO_MS = 5000;

export type RowStatus =
  | { kind: 'saving' }
  | { kind: 'saved'; label: boolean; undo?: () => void }
  | { kind: 'error'; retry: () => void; message?: string };

export interface CommitOptions {
  /** Offer undo on the saved status; default true. Undo and retry commit without it. */
  undo?: boolean;
  /** Whether the main process answer counts as success; default result.ok */
  accept?: (result: SettingsApplyResult) => boolean;
}

export interface SettingsStore {
  /** null until loaded */
  settings: UserSettings | null;
  loadError: string | null;
  reload: () => Promise<void>;
  statuses: Record<string, RowStatus>;
  /**
   * Write a patch through settings-changed. The keys name the status slots the change
   * owns. Resolves to the main process answer after the slots are updated.
   */
  commit: (
    patch: Partial<UserSettings>,
    keys: string[],
    options?: CommitOptions
  ) => Promise<SettingsApplyResult>;
  setStatus: (key: string, status: RowStatus | null) => void;
}

export const SettingsContext = createContext<SettingsStore | null>(null);

export function useSettingsStore(): SettingsStore {
  const store = useContext(SettingsContext);
  if (!store) throw new Error('useSettingsStore must be used within SettingsProvider');
  return store;
}

/**
 * The patch that puts the changed keys back to what they were. Undo and rollback share it.
 */
export function previousPatch(
  previous: UserSettings,
  patch: Partial<UserSettings>
): Partial<UserSettings> {
  const back: Record<string, unknown> = {};
  for (const key of Object.keys(patch)) {
    back[key] = previous[key as keyof UserSettings];
  }
  return back as Partial<UserSettings>;
}

export interface Setting<K extends keyof UserSettings> {
  value: UserSettings[K];
  set: (value: UserSettings[K], options?: CommitOptions) => Promise<SettingsApplyResult>;
  status: RowStatus | undefined;
}

/**
 * One setting as a control sees it: its value, a setter that applies at once, and the
 * row's status slot.
 */
export function useSetting<K extends keyof UserSettings>(key: K): Setting<K> {
  const store = useSettingsStore();
  const set = useCallback(
    (value: UserSettings[K], options?: CommitOptions) =>
      store.commit({ [key]: value } as Partial<UserSettings>, [key], options),
    [store, key]
  );
  return {
    // undefined before the load answers; the shell shows nothing that reads it until then
    value: store.settings?.[key] as UserSettings[K],
    set,
    status: store.statuses[key],
  };
}
