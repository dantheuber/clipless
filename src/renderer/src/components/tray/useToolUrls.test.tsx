import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useToolUrls } from './useToolUrls';

const { state } = vi.hoisted(() => ({
  state: {
    pinsByGroup: {} as Record<string, string[]>,
    tools: [] as { id: string; name: string; url: string }[],
  },
}));

vi.mock('../../providers/clips', () => ({
  useClipsPins: () => ({ pinsByGroup: state.pinsByGroup }),
}));

vi.mock('../../providers/scan', () => ({
  useScanIndex: () => ({ tools: state.tools }),
}));

function probe() {
  let result: ReturnType<typeof useToolUrls> | null = null;
  function Probe() {
    result = useToolUrls();
    return null;
  }
  render(<Probe />);
  return result!;
}

beforeEach(() => {
  state.tools = [
    { id: 'vt', name: 'VirusTotal', url: 'https://vt.example/{ip}' },
    { id: 'both', name: 'Correlate', url: 'https://c.example/{ip}/{ticket}' },
    { id: 'hibp', name: 'HIBP', url: 'https://h.example/{email}' },
  ];
});

describe('useToolUrls', () => {
  it('offers only tools whose every token is pinned and counts the exact tabs', () => {
    state.pinsByGroup = { ip: ['1.1.1.1', '2.2.2.2'] };
    const { readyTools, allUrls, toolsFor } = probe();
    expect(readyTools.map((t) => t.id)).toEqual(['vt']);
    expect(allUrls).toEqual(['https://vt.example/1.1.1.1', 'https://vt.example/2.2.2.2']);
    expect(toolsFor('ip').map((t) => t.id)).toEqual(['vt']);
    expect(toolsFor('ticket')).toEqual([]);
  });

  it('lists a multi-token tool under every group it uses and counts its urls once', () => {
    state.pinsByGroup = { ip: ['1.1.1.1'], ticket: ['INC-1', 'INC-2'] };
    const { allUrls, toolsFor } = probe();
    expect(toolsFor('ip').map((t) => t.id)).toEqual(['vt', 'both']);
    expect(toolsFor('ticket').map((t) => t.id)).toEqual(['both']);
    expect(allUrls).toEqual([
      'https://vt.example/1.1.1.1',
      'https://c.example/1.1.1.1/INC-1',
      'https://c.example/1.1.1.1/INC-2',
    ]);
  });

  it('counts a url once when two tools produce it', () => {
    state.tools = [
      { id: 'a', name: 'A', url: 'https://same.example/{ip}' },
      { id: 'b', name: 'B', url: 'https://same.example/{ip}' },
    ];
    state.pinsByGroup = { ip: ['1.1.1.1'] };
    expect(probe().allUrls).toEqual(['https://same.example/1.1.1.1']);
  });

  it('has nothing with no pins', () => {
    state.pinsByGroup = {};
    expect(probe().allUrls).toEqual([]);
  });
});
