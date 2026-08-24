import { createContext, useCallback, useContext } from 'react';
import type { SettingsApplyResult, UserSettings } from '../../../../../shared/types';

export const SAVED_LABEL_MS = 2000;
export const UNDO_MS = 5000;

export type RowStatus =
  | { kind: 'saving' }
  | { kind: 'saved'; label: boolean; undo?: () => void }
  | { kind: 'error'; retry: () => void; message?: string };

export interface CommitOptions {
  undo?: boolean;

  accept?: (result: SettingsApplyResult) => boolean;
}

export interface SettingsStore {
  settings: UserSettings | null;
  loadError: string | null;
  reload: () => Promise<void>;
  statuses: Record<string, RowStatus>;

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

export function useSetting<K extends keyof UserSettings>(key: K): Setting<K> {
  const store = useSettingsStore();
  const set = useCallback(
    (value: UserSettings[K], options?: CommitOptions) =>
      store.commit({ [key]: value } as Partial<UserSettings>, [key], options),
    [store, key]
  );
  return {
    value: store.settings?.[key] as UserSettings[K],
    set,
    status: store.statuses[key],
  };
}
