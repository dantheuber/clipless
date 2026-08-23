import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HotkeySettings } from '../../../../../shared/types';
import { useSettingsStore, type RowStatus } from '../general/useSetting';
import {
  HOTKEY_ROWS,
  duplicateOf,
  reservedReason,
  sameAccelerator,
  swapKeys,
  type HotkeyActionId,
} from './conflicts';

export interface HotkeyRow {
  id: HotkeyActionId;
  name: string;
  description: string;
  key: string;
  enabled: boolean;
  isDefault: boolean;
  /** Another row bound to the same key (a duplicate after an import) */
  duplicate: HotkeyActionId | null;
  /** Why the OS may keep the key; advisory */
  reserved: string | null;
  status: RowStatus | undefined;
}

export interface HotkeysModel {
  /** null until the defaults have arrived from the main process */
  hotkeys: HotkeySettings | null;
  defaults: HotkeySettings | null;
  rows: HotkeyRow[];
  masterStatus: RowStatus | undefined;
  setMaster: (enabled: boolean) => Promise<void>;
  setRowEnabled: (id: HotkeyActionId, enabled: boolean) => Promise<void>;
  setKey: (id: HotkeyActionId, accelerator: string) => Promise<void>;
  swap: (id: HotkeyActionId, other: HotkeyActionId, accelerator: string) => Promise<void>;
  reset: (id: HotkeyActionId) => Promise<void>;
  /** Resolves to how many rows changed */
  resetAll: () => Promise<number>;
}

export const statusKey = (id: HotkeyActionId | 'enabled'): string => `hk:${id}`;

/**
 * The Hotkeys tab's model over the settings store. Every write goes through
 * settings-changed and "saved" means the shortcut is registered: a row whose accelerator
 * the OS refused shows "not saved" with retry and goes back to its previous key. A swap
 * writes both rows at once and rolls both back when either registration fails.
 */
export function useHotkeys(platform: string): HotkeysModel {
  const { settings, statuses, commit, setStatus } = useSettingsStore();
  const [defaults, setDefaults] = useState<HotkeySettings | null>(null);

  useEffect(() => {
    window.api
      .hotkeysGetDefaults()
      .then(setDefaults)
      .catch((error) => console.error('Failed to read the hotkey defaults:', error));
  }, []);

  const hotkeys = useMemo<HotkeySettings | null>(() => {
    if (!defaults) return null;
    return { ...defaults, ...(settings?.hotkeys ?? {}) };
  }, [defaults, settings]);

  /**
   * Write a hotkey map. The changed rows own the statuses and roll back when any of their
   * accelerators failed; other rows whose accelerator failed are told on their own slot.
   */
  const write = useCallback(
    async (next: HotkeySettings, changed: (HotkeyActionId | 'enabled')[], undo = true) => {
      const keysOf = (ids: (HotkeyActionId | 'enabled')[]) =>
        ids.filter((id): id is HotkeyActionId => id !== 'enabled').map((id) => next[id].key);
      const mine = keysOf(changed);
      const result = await commit({ hotkeys: next }, changed.map(statusKey), {
        undo,
        accept: (r) => !r.failed.some((f) => mine.some((k) => sameAccelerator(f, k, platform))),
      });
      if (!next.enabled) return;
      for (const row of HOTKEY_ROWS) {
        if (changed.includes(row.id)) continue;
        const key = next[row.id].key;
        if (next[row.id].enabled && result.failed.some((f) => sameAccelerator(f, key, platform))) {
          setStatus(statusKey(row.id), {
            kind: 'error',
            message: 'the system refused this shortcut',
            retry: () => write(next, [row.id], false),
          });
        }
      }
    },
    [commit, platform, setStatus]
  );

  /**
   * Every action is a plan over the current map and the defaults; nothing can change
   * before both have loaded, which is also when the rows first render.
   */
  const change = useCallback(
    async (
      make: (
        current: HotkeySettings,
        base: HotkeySettings
      ) => { next: HotkeySettings; changed: (HotkeyActionId | 'enabled')[]; undo?: boolean } | null
    ): Promise<number> => {
      if (!hotkeys || !defaults) return 0;
      const plan = make(hotkeys, defaults);
      if (!plan) return 0;
      await write(plan.next, plan.changed, plan.undo ?? true);
      return plan.changed.length;
    },
    [hotkeys, defaults, write]
  );

  const setMaster = useCallback(
    async (enabled: boolean) => {
      await change((h) => ({ next: { ...h, enabled }, changed: ['enabled'] }));
    },
    [change]
  );

  const setRowEnabled = useCallback(
    async (id: HotkeyActionId, enabled: boolean) => {
      await change((h) => ({ next: { ...h, [id]: { ...h[id], enabled } }, changed: [id] }));
    },
    [change]
  );

  const setKey = useCallback(
    async (id: HotkeyActionId, accelerator: string) => {
      await change((h) => ({
        next: { ...h, [id]: { ...h[id], key: accelerator } },
        changed: [id],
      }));
    },
    [change]
  );

  const swap = useCallback(
    async (id: HotkeyActionId, other: HotkeyActionId, accelerator: string) => {
      await change((h) => ({ next: swapKeys(h, id, other, accelerator), changed: [id, other] }));
    },
    [change]
  );

  const reset = useCallback(
    async (id: HotkeyActionId) => {
      await change((h, d) => ({
        next: { ...h, [id]: { ...h[id], key: d[id].key } },
        changed: [id],
        undo: false,
      }));
    },
    [change]
  );

  const resetAll = useCallback(
    () =>
      change((h, d) => {
        const changed = HOTKEY_ROWS.filter((row) => h[row.id].key !== d[row.id].key).map(
          (row) => row.id
        );
        if (changed.length === 0) return null;
        const next = { ...h };
        for (const id of changed) next[id] = { ...h[id], key: d[id].key };
        return { next, changed, undo: false };
      }),
    [change]
  );

  const rows = useMemo<HotkeyRow[]>(() => {
    if (!hotkeys || !defaults) return [];
    return HOTKEY_ROWS.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      key: hotkeys[row.id].key,
      enabled: hotkeys[row.id].enabled,
      isDefault: hotkeys[row.id].key === defaults[row.id].key,
      duplicate: duplicateOf(hotkeys, row.id, platform),
      reserved: reservedReason(hotkeys[row.id].key, platform),
      status: statuses[statusKey(row.id)],
    }));
  }, [hotkeys, defaults, platform, statuses]);

  return {
    hotkeys,
    defaults,
    rows,
    masterStatus: statuses[statusKey('enabled')],
    setMaster,
    setRowEnabled,
    setKey,
    swap,
    reset,
    resetAll,
  };
}
