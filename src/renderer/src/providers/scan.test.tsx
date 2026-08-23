import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import type { ClipItem, SearchTerm } from '../../../shared/types';
import * as scanModule from '../../../shared/scan';
import { ScanIndexProvider, useScanIndex, SCAN_CACHE_LIMIT, EMPTY_SCAN, knownGroups } from './scan';

vi.mock('../../../shared/scan', async (importOriginal) => {
  const actual = await importOriginal<typeof scanModule>();
  return { ...actual, scanText: vi.fn(actual.scanText) };
});

const scanText = vi.mocked(scanModule.scanText);
const api = () => window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;

const ipTerm: SearchTerm = {
  id: 'ip',
  name: 'IP',
  pattern: '(?<ip>\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b)',
  enabled: true,
  createdAt: 0,
  updatedAt: 0,
  order: 0,
};

const clip = (id: string, content: string, extra: Partial<ClipItem> = {}): ClipItem => ({
  id,
  type: 'text',
  content,
  ...extra,
});

function Row({ clip: c }: { clip: ClipItem }) {
  const { getScan } = useScanIndex();
  const scan = getScan(c);
  return (
    <div data-testid={`row-${c.id}`}>
      {scan === null
        ? 'loading'
        : scan.matches.length > 0
          ? `chips:${scan.matches.length}`
          : 'none'}
    </div>
  );
}

let configChanged: () => void = () => {};

const flush = () => act(async () => {});

beforeEach(() => {
  vi.clearAllMocks();
  api().searchTermsGetAll.mockResolvedValue([ipTerm]);
  api().quickToolsGetAll.mockResolvedValue([]);
  api().templatesGetAll.mockResolvedValue([]);
  api().groupColoursGet.mockResolvedValue({});
  api().onQuickClipsConfigChanged.mockImplementation((cb: () => void) => {
    configChanged = cb;
    return () => {};
  });
});

afterEach(() => {
  cleanup();
});

describe('ScanIndexProvider', () => {
  it('loads the search terms once and subscribes to config changes', async () => {
    render(
      <ScanIndexProvider>
        <Row clip={clip('a', 'host 10.0.0.1')} />
      </ScanIndexProvider>
    );
    await flush();
    expect(api().searchTermsGetAll).toHaveBeenCalledTimes(1);
    expect(api().onQuickClipsConfigChanged).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('row-a')).toHaveTextContent('chips:1');
  });

  it('scans nothing until the terms have loaded', async () => {
    let resolveTerms: (terms: SearchTerm[]) => void = () => {};
    api().searchTermsGetAll.mockReturnValue(new Promise((r) => (resolveTerms = r)));
    render(
      <ScanIndexProvider>
        <Row clip={clip('a', 'host 10.0.0.1')} />
      </ScanIndexProvider>
    );
    await flush();
    expect(scanText).not.toHaveBeenCalled();
    expect(screen.getByTestId('row-a')).toHaveTextContent('none');
    await act(async () => resolveTerms([ipTerm]));
    expect(scanText).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('row-a')).toHaveTextContent('chips:1');
  });

  it('scans each clip once, however many rows read it', async () => {
    const c = clip('a', 'host 10.0.0.1');
    const { rerender } = render(
      <ScanIndexProvider>
        <Row clip={c} />
        <Row clip={c} />
      </ScanIndexProvider>
    );
    await flush();
    const callsForA = () => scanText.mock.calls.filter((call) => call[0] === c.content).length;
    expect(callsForA()).toBe(1);

    rerender(
      <ScanIndexProvider>
        <Row clip={c} />
        <Row clip={c} />
      </ScanIndexProvider>
    );
    await flush();
    expect(callsForA()).toBe(1);
  });

  it('re-scans only when the clip text changes', async () => {
    const { rerender } = render(
      <ScanIndexProvider>
        <Row clip={clip('a', 'host 10.0.0.1')} />
      </ScanIndexProvider>
    );
    await flush();
    const calls = () => scanText.mock.calls.length;
    const before = calls();

    // A new object with the same text is a cache hit
    rerender(
      <ScanIndexProvider>
        <Row clip={clip('a', 'host 10.0.0.1')} />
      </ScanIndexProvider>
    );
    expect(calls()).toBe(before);

    // An edit re-scans that one clip
    rerender(
      <ScanIndexProvider>
        <Row clip={clip('a', 'host 10.0.0.1 and 10.0.0.2')} />
      </ScanIndexProvider>
    );
    expect(calls()).toBe(before + 1);
    expect(screen.getByTestId('row-a')).toHaveTextContent('chips:2');
  });

  it('reads extracted text for html clips and title plus url for bookmarks', async () => {
    render(
      <ScanIndexProvider>
        <Row clip={clip('h', '<p>10.0.0.1</p>', { type: 'html', text: 'plain' })} />
        <Row
          clip={clip('b', 'https://x', { type: 'bookmark', title: '10.0.0.9', url: 'https://x' })}
        />
      </ScanIndexProvider>
    );
    await flush();
    expect(screen.getByTestId('row-h')).toHaveTextContent('none');
    expect(screen.getByTestId('row-b')).toHaveTextContent('chips:1');
  });

  it('does not scan images or empty clips', async () => {
    render(
      <ScanIndexProvider>
        <Row clip={clip('i', 'img-id', { type: 'image', imageId: 'img-id' })} />
        <Row clip={clip('e', '')} />
      </ScanIndexProvider>
    );
    await flush();
    expect(scanText).not.toHaveBeenCalled();
    expect(screen.getByTestId('row-i')).toHaveTextContent('none');
    expect(screen.getByTestId('row-e')).toHaveTextContent('none');
  });

  it('clears the cache and reloads the terms on quick-clips-config-changed', async () => {
    const c = clip('a', 'host 10.0.0.1');
    render(
      <ScanIndexProvider>
        <Row clip={c} />
      </ScanIndexProvider>
    );
    await flush();
    expect(screen.getByTestId('row-a')).toHaveTextContent('chips:1');
    const before = scanText.mock.calls.length;

    api().searchTermsGetAll.mockResolvedValue([{ ...ipTerm, enabled: false }]);
    await act(async () => {
      configChanged();
    });

    expect(api().searchTermsGetAll).toHaveBeenCalledTimes(2);
    expect(scanText.mock.calls.length).toBe(before + 1);
    expect(screen.getByTestId('row-a')).toHaveTextContent('none');
  });

  it('exposes the tools, templates and a slot per capture group', async () => {
    const tool = { id: 't', name: 'T', url: 'https://x/{ip}', captureGroups: ['ip'] };
    const template = { id: 'p', name: 'P', content: '{ip}' };
    api().quickToolsGetAll.mockResolvedValue([tool]);
    api().templatesGetAll.mockResolvedValue([template]);
    api().searchTermsGetAll.mockResolvedValue([
      ipTerm,
      { ...ipTerm, id: 'x', pattern: '(?<xyz>x+)(?<ip>y)' },
    ]);
    api().groupColoursGet.mockResolvedValue({ xyz: 7 });
    let index: ReturnType<typeof useScanIndex> | null = null;
    function Probe() {
      index = useScanIndex();
      return null;
    }
    render(
      <ScanIndexProvider>
        <Probe />
      </ScanIndexProvider>
    );
    await flush();
    expect(index!.tools).toEqual([tool]);
    expect(index!.templates).toEqual([template]);
    expect(index!.terms).toHaveLength(2);
    expect(index!.slotFor('ip')).toBe(0); // the named default
    expect(index!.slotFor('xyz')).toBe(7); // the stored override
    // a group no term produces is slotted as if appended to the known list
    expect(index!.slotFor('unknown')).toBe(1);
    expect(knownGroups([{ pattern: '(?<a>1)(?<b>2)' }, { pattern: '(?<b>3)' }])).toEqual([
      'a',
      'b',
    ]);
  });

  it('slots every group from the defaults before any config has loaded', () => {
    api().searchTermsGetAll.mockReturnValue(new Promise(() => {}));
    let index: ReturnType<typeof useScanIndex> | null = null;
    function Probe() {
      index = useScanIndex();
      return null;
    }
    render(
      <ScanIndexProvider>
        <Probe />
      </ScanIndexProvider>
    );
    expect(index!.slotFor('email')).toBe(1);
    expect(index!.tools).toEqual([]);
  });

  it('treats a missing colour map as empty', async () => {
    api().groupColoursGet.mockResolvedValue(undefined);
    let index: ReturnType<typeof useScanIndex> | null = null;
    function Probe() {
      index = useScanIndex();
      return null;
    }
    render(
      <ScanIndexProvider>
        <Probe />
      </ScanIndexProvider>
    );
    await flush();
    expect(index!.slotFor('ticket')).toBe(2);
  });

  it('logs and keeps going when the terms fail to load', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api().searchTermsGetAll.mockRejectedValue(new Error('ipc down'));
    render(
      <ScanIndexProvider>
        <Row clip={clip('a', 'host 10.0.0.1')} />
      </ScanIndexProvider>
    );
    await flush();
    expect(errSpy).toHaveBeenCalledWith(
      'Failed to load the Quick Clips config for scanning:',
      expect.any(Error)
    );
    expect(screen.getByTestId('row-a')).toHaveTextContent('none');
    errSpy.mockRestore();
  });

  it('defers a large clip to an idle callback and reports loading until it lands', async () => {
    const idle: (() => void)[] = [];
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
      idle.push(cb);
      return idle.length;
    });
    try {
      const big = clip('big', '10.0.0.1 ' + 'x'.repeat(scanModule.LARGE_CLIP_THRESHOLD));
      const { rerender } = render(
        <ScanIndexProvider>
          <Row clip={big} />
        </ScanIndexProvider>
      );
      await flush();
      expect(screen.getByTestId('row-big')).toHaveTextContent('loading');
      expect(scanText).not.toHaveBeenCalled();

      // Another render while pending does not schedule a second scan
      rerender(
        <ScanIndexProvider>
          <Row clip={big} />
        </ScanIndexProvider>
      );
      expect(idle).toHaveLength(1);

      await act(async () => {
        idle[0]();
      });
      expect(scanText).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('row-big')).toHaveTextContent('chips:1');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('falls back to a timeout when requestIdleCallback is missing', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestIdleCallback', undefined);
    try {
      const big = clip('big', '10.0.0.1 ' + 'x'.repeat(scanModule.LARGE_CLIP_THRESHOLD));
      render(
        <ScanIndexProvider>
          <Row clip={big} />
        </ScanIndexProvider>
      );
      await flush();
      expect(screen.getByTestId('row-big')).toHaveTextContent('loading');
      await act(async () => {
        await vi.runAllTimersAsync();
      });
      expect(screen.getByTestId('row-big')).toHaveTextContent('chips:1');
    } finally {
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  });

  it('drops a deferred scan whose clip changed while it waited', async () => {
    const idle: (() => void)[] = [];
    vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
      idle.push(cb);
      return idle.length;
    });
    try {
      const big = clip('big', '10.0.0.1 ' + 'x'.repeat(scanModule.LARGE_CLIP_THRESHOLD));
      const { rerender } = render(
        <ScanIndexProvider>
          <Row clip={big} />
        </ScanIndexProvider>
      );
      await flush();
      rerender(
        <ScanIndexProvider>
          <Row clip={clip('big', 'now small 10.0.0.2')} />
        </ScanIndexProvider>
      );
      expect(screen.getByTestId('row-big')).toHaveTextContent('chips:1');
      const before = scanText.mock.calls.length;
      await act(async () => {
        idle[0]();
      });
      expect(scanText.mock.calls.length).toBe(before);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('evicts the oldest entries past the cache limit', async () => {
    let getScan: ReturnType<typeof useScanIndex>['getScan'] = () => null;
    function Grab() {
      getScan = useScanIndex().getScan;
      return null;
    }
    render(
      <ScanIndexProvider>
        <Grab />
      </ScanIndexProvider>
    );
    await flush();

    const first = clip('first', 'host 10.0.0.1');
    getScan(first);
    for (let i = 0; i < SCAN_CACHE_LIMIT; i++) getScan(clip(`c${i}`, `n ${i}`));
    const before = scanText.mock.calls.length;
    getScan(first);
    expect(scanText.mock.calls.length).toBe(before + 1);
  });

  it('returns the shared empty scan for clips without text', async () => {
    let getScan: ReturnType<typeof useScanIndex>['getScan'] = () => null;
    function Grab() {
      getScan = useScanIndex().getScan;
      return null;
    }
    render(
      <ScanIndexProvider>
        <Grab />
      </ScanIndexProvider>
    );
    await flush();
    expect(getScan(clip('e', ''))).toBe(EMPTY_SCAN);
  });
});

describe('useScanIndex', () => {
  it('throws outside the provider', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Row clip={clip('a', 'x')} />)).toThrow(
      'useScanIndex must be used within ScanIndexProvider'
    );
    errSpy.mockRestore();
  });
});
