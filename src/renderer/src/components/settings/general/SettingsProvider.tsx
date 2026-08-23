import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SettingsApplyResult, UserSettings } from '../../../../../shared/types';
import {
  SAVED_LABEL_MS,
  SettingsContext,
  UNDO_MS,
  previousPatch,
  type CommitOptions,
  type RowStatus,
  type SettingsStore,
} from './useSetting';
import { errorText } from '../shell/errorText';

/**
 * One load of the settings for the whole window (spec 15.2) and the one write path.
 * A change is applied to the control at once, sent through settings-changed, and put
 * back if the main process says no. No control is ever disabled by another control's
 * save: commits run side by side and each owns only its status keys.
 */
export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<UserSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, RowStatus>>({});
  const settingsRef = useRef<UserSettings | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>[]>());

  const setSettings = useCallback((next: UserSettings) => {
    settingsRef.current = next;
    setSettingsState(next);
  }, []);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const loaded = await window.api.storageGetSettings();
      // Reflect the real login-item state so the toggle cannot drift from what happens
      // at boot; null means the OS does not manage it here (Linux, dev builds).
      const osAutoStart = await window.api.getAutoStartState();
      if (typeof osAutoStart === 'boolean') loaded.autoStart = osAutoStart;
      setSettings(loaded);
    } catch (error) {
      setLoadError(errorText(error));
    }
  }, [setSettings]);

  useEffect(() => {
    reload();
  }, [reload]);

  const clearTimers = useCallback((keys: string[]) => {
    for (const key of keys) {
      for (const timer of timers.current.get(key) ?? []) clearTimeout(timer);
      timers.current.delete(key);
    }
  }, []);

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const list of map.values()) for (const timer of list) clearTimeout(timer);
      map.clear();
    };
  }, []);

  const schedule = useCallback((keys: string[], delay: number, work: () => void) => {
    const timer = setTimeout(work, delay);
    for (const key of keys) {
      timers.current.set(key, [...(timers.current.get(key) ?? []), timer]);
    }
  }, []);

  const mark = useCallback((keys: string[], status: RowStatus | null) => {
    setStatuses((current) => {
      const next = { ...current };
      for (const key of keys) {
        if (status) next[key] = status;
        else delete next[key];
      }
      return next;
    });
  }, []);

  const setStatus = useCallback(
    (key: string, status: RowStatus | null) => {
      clearTimers([key]);
      mark([key], status);
    },
    [clearTimers, mark]
  );

  const commit = useCallback(
    async (
      patch: Partial<UserSettings>,
      keys: string[],
      options: CommitOptions = {}
    ): Promise<SettingsApplyResult> => {
      const previous = settingsRef.current;
      if (!previous) return { ok: false, failed: [], message: 'settings are not loaded' };

      clearTimers(keys);
      setSettings({ ...previous, ...patch });
      mark(keys, { kind: 'saving' });

      let result: SettingsApplyResult;
      try {
        result = await window.api.settingsChanged({ ...previous, ...patch });
      } catch (error) {
        result = { ok: false, failed: [], message: errorText(error) };
      }

      const accepted = (options.accept ?? ((r: SettingsApplyResult) => r.ok))(result);
      if (accepted) {
        const undo =
          options.undo === false
            ? undefined
            : () =>
                commit(previousPatch(previous, patch), keys, {
                  undo: false,
                  accept: options.accept,
                });
        mark(keys, { kind: 'saved', label: true, undo });
        schedule(keys, SAVED_LABEL_MS, () =>
          mark(keys, undo ? { kind: 'saved', label: false, undo } : null)
        );
        if (undo) schedule(keys, UNDO_MS, () => mark(keys, null));
      } else {
        // Put the controls back, and the main process with them, so a refused hotkey
        // or login item never stays half applied. Other in-flight changes keep theirs.
        const back = {
          ...(settingsRef.current as UserSettings),
          ...previousPatch(previous, patch),
        };
        setSettings(back);
        window.api.settingsChanged(back).catch(() => {});
        mark(keys, {
          kind: 'error',
          message: result.message,
          retry: () => commit(patch, keys, options),
        });
      }
      return result;
    },
    [clearTimers, mark, schedule, setSettings]
  );

  const store = useMemo<SettingsStore>(
    () => ({ settings, loadError, reload, statuses, commit, setStatus }),
    [settings, loadError, reload, statuses, commit, setStatus]
  );

  return <SettingsContext.Provider value={store}>{children}</SettingsContext.Provider>;
}
