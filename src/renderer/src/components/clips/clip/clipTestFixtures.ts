import type { ClipItem, ScanResult } from '../../../../../shared/types';
import { vi, type Mock } from 'vitest';

export const textClip: ClipItem = { id: 'a', type: 'text', content: 'host 1.1.1.1' };
export const htmlClip: ClipItem = { id: 'h', type: 'html', content: '<p>x</p>', text: 'x 2.2.2.2' };
export const imageClip: ClipItem = { id: 'i', type: 'image', content: 'data:image/png;base64,x' };
export const emptyClip: ClipItem = { id: 'e', type: 'text', content: '' };

export const clip = (content: string, extra = {}): ClipItem => ({
  id: 'c1',
  type: 'text',
  content,
  ...extra,
});

export function scanOf(text: string, group: string, value: string): ScanResult {
  const start = text.indexOf(value);
  return {
    matches: [{ group, value, start, end: start + value.length, termId: 't' }],
    groups: [group],
    errors: [],
    large: false,
  };
}

export function ipScan(text: string): ScanResult {
  const matches = [...text.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)].map((match) => ({
    group: 'ip',
    value: match[0],
    start: match.index,
    end: match.index + match[0].length,
    termId: 't',
  }));
  return { matches, groups: matches.length ? ['ip'] : [], errors: [], large: false };
}

export function scanIndexTestHooks<T extends object>(
  emptyScan: ScanResult,
  getScan: (clip: ClipItem) => ScanResult | null,
  slot: number,
  extra: T
) {
  return {
    EMPTY_SCAN: emptyScan,
    useScanIndex: () => ({ getScan, slotFor: () => slot, ...extra }),
  };
}

export const unpinnedClipHooks = (togglePins: Mock = vi.fn()) => ({
  useClipsPins: () => ({ isPinned: () => false, togglePins }),
});

export const fixedScanSlotHooks = (slot: number) => ({
  useScanIndex: () => ({ slotFor: () => slot }),
});

export const pinnedClipHooks = (isPinned: (key: string) => boolean, togglePins: Mock) => ({
  useClipsPins: () => ({ isPinned, togglePins }),
});
