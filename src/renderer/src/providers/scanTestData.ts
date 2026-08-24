import { createElement } from 'react';
import { act, render } from '@testing-library/react';
import { vi } from 'vitest';
import type { ClipItem, SearchTerm } from '../../../shared/types';
import { ScanIndexProvider, type ScanIndex, useScanIndex } from './scan';

export const api = () => window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;

export const ipTerm: SearchTerm = {
  id: 'ip',
  name: 'IP',
  pattern: '(?<ip>\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b)',
  enabled: true,
  createdAt: 0,
  updatedAt: 0,
  order: 0,
};

export const clip = (id: string, content: string, extra: Partial<ClipItem> = {}): ClipItem => ({
  id,
  type: 'text',
  content,
  ...extra,
});

export const flush = () => act(async () => {});

function CaptureScanIndex({ target }: { target: { current: ScanIndex | null } }) {
  target.current = useScanIndex();
  return null;
}

export function renderScanIndexCapture(): { current: ScanIndex | null } {
  const target: { current: ScanIndex | null } = { current: null };
  render(createElement(ScanIndexProvider, null, createElement(CaptureScanIndex, { target })));
  return target;
}

export function configureScanApi(onConfigChanged: (callback: () => void) => void): void {
  vi.clearAllMocks();
  api().searchTermsGetAll.mockResolvedValue([ipTerm]);
  api().quickToolsGetAll.mockResolvedValue([]);
  api().templatesGetAll.mockResolvedValue([]);
  api().groupColoursGet.mockResolvedValue({});
  api().onQuickClipsConfigChanged.mockImplementation((callback: () => void) => {
    onConfigChanged(callback);
    return () => {};
  });
}
