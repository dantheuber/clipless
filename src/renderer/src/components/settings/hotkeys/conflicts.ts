import type { HotkeySettings } from '../../../../../shared/types';
import { normalizeAccelerator, osReservedReason } from '../../../../../shared/osReservedShortcuts';
import { keyPlatform } from './display';

/**
 * The rows of the Hotkeys table in spec order (15.6) and the conflict rules: another
 * Clipless row holding the combination blocks acceptance and offers a swap; two rows on
 * one key after an import show on both; an OS-reserved combination is advisory.
 */

export type HotkeyActionId = Exclude<keyof HotkeySettings, 'enabled'>;

export interface HotkeyRowMeta {
  id: HotkeyActionId;
  name: string;
  description: string;
}

export const HOTKEY_ROWS: readonly HotkeyRowMeta[] = [
  { id: 'focusWindow', name: 'Show Clipless', description: 'Bring the clips window to the front.' },
  {
    id: 'quickLook',
    name: 'Quick look on newest clip',
    description:
      'Bring the window forward and open quick look on the newest clip. A changed live clipboard wins.',
  },
  {
    id: 'searchClips',
    name: 'Search clips',
    description: 'Bring the window forward with the search box focused.',
  },
  {
    id: 'quickClip1',
    name: 'Copy clip 1',
    description: 'Copy the clip in position 1 of the list back to the clipboard.',
  },
  { id: 'quickClip2', name: 'Copy clip 2', description: 'Position 2 of the list.' },
  { id: 'quickClip3', name: 'Copy clip 3', description: 'Position 3 of the list.' },
  { id: 'quickClip4', name: 'Copy clip 4', description: 'Position 4 of the list.' },
  { id: 'quickClip5', name: 'Copy clip 5', description: 'Position 5 of the list.' },
];

export function rowName(id: HotkeyActionId): string {
  return HOTKEY_ROWS.find((row) => row.id === id)?.name ?? id;
}

export function sameAccelerator(a: string, b: string, platform: string): boolean {
  const target = keyPlatform(platform);
  return normalizeAccelerator(a, target) === normalizeAccelerator(b, target);
}

/**
 * The other row that already holds the combination, or null.
 */
export function findConflict(
  hotkeys: HotkeySettings,
  id: HotkeyActionId,
  accelerator: string,
  platform: string
): HotkeyActionId | null {
  for (const row of HOTKEY_ROWS) {
    if (row.id === id) continue;
    if (sameAccelerator(hotkeys[row.id].key, accelerator, platform)) return row.id;
  }
  return null;
}

/**
 * Swap: this row takes the recorded combination and the other row takes this row's old
 * key, so both stay valid (spec 15.6).
 */
export function swapKeys(
  hotkeys: HotkeySettings,
  id: HotkeyActionId,
  other: HotkeyActionId,
  accelerator: string
): HotkeySettings {
  return {
    ...hotkeys,
    [id]: { ...hotkeys[id], key: accelerator },
    [other]: { ...hotkeys[other], key: hotkeys[id].key },
  };
}

/**
 * The first other row bound to the same key as this one (a duplicate left by an import,
 * say). Both rows of a pair report each other.
 */
export function duplicateOf(
  hotkeys: HotkeySettings,
  id: HotkeyActionId,
  platform: string
): HotkeyActionId | null {
  return findConflict(hotkeys, id, hotkeys[id].key, platform);
}

/**
 * Why the OS may keep the combination for itself, or null. Advisory only.
 */
export function reservedReason(accelerator: string, platform: string): string | null {
  return osReservedReason(accelerator, keyPlatform(platform));
}
