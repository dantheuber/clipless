import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import * as scanModule from '../../../shared/scan';
import type { SearchTerm } from '../../../shared/types';
import { ScanIndexProvider, useScanIndex, knownGroups } from './scan';
import { Row } from './scanTestHarness';
import { api, clip, configureScanApi, flush, ipTerm, renderScanIndexCapture } from './scanTestData';
vi.mock('../../../shared/scan', async (loadActual) => {
  const actual = await loadActual<typeof scanModule>();
  return { ...actual, scanText: vi.fn(actual.scanText) };
});

const scanText = vi.mocked(scanModule.scanText);
let configChanged: () => void = () => {};

beforeEach(() => {
  configureScanApi((callback) => {
    configChanged = callback;
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

    rerender(
      <ScanIndexProvider>
        <Row clip={clip('a', 'host 10.0.0.1')} />
      </ScanIndexProvider>
    );
    expect(calls()).toBe(before);

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
    const index = renderScanIndexCapture();
    await flush();
    expect(index.current!.tools).toEqual([tool]);
    expect(index.current!.templates).toEqual([template]);
    expect(index.current!.terms).toHaveLength(2);
    expect(index.current!.slotFor('ip')).toBe(0);
    expect(index.current!.slotFor('xyz')).toBe(7);
    expect(index.current!.slotFor('unknown')).toBe(1);
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
});
