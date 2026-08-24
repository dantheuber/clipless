import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { ScanResult } from '../../../../../shared/types';
import { CollapsedLine } from './CollapsedLine';
import { ROW_TEXT_LIMIT, markHits, visibleMatches } from './matches';

vi.mock('../../../providers/clips', async () =>
  (await import('./clipTestFixtures')).unpinnedClipHooks()
);

vi.mock('../../../providers/scan', async () =>
  (await import('./clipTestFixtures')).fixedScanSlotHooks(0)
);

const m = (group: string, value: string, start: number) => ({
  group,
  value,
  start,
  end: start + value.length,
  termId: 't',
});

const scan = (matches: ReturnType<typeof m>[]): ScanResult => ({
  matches,
  groups: [...new Set(matches.map((x) => x.group))],
  errors: [],
  large: false,
});

afterEach(cleanup);

describe('markHits', () => {
  it('marks every case-insensitive hit and leaves the text otherwise intact', () => {
    const { container } = render(<>{markHits('Ab ab AB', 'ab', 'k')}</>);
    expect(container.querySelectorAll('mark')).toHaveLength(3);
    expect(container.textContent).toBe('Ab ab AB');
  });

  it('returns the text unchanged for an empty term', () => {
    expect(markHits('hello', '  ', 'k')).toEqual(['hello']);
  });
});

describe('visibleMatches', () => {
  it('drops overlapping later matches and matches past the limit', () => {
    const result = visibleMatches(
      scan([m('a', 'abcd', 0), m('b', 'cdef', 2), m('c', 'z', 50)]),
      40
    );
    expect(result.map((x) => x.group)).toEqual(['a']);
    expect(visibleMatches(null, 10)).toEqual([]);
  });
});

describe('CollapsedLine', () => {
  it('renders text pieces and chips in order', () => {
    const text = 'from 1.1.1.1 to a@b.co.';
    const { container } = render(
      <CollapsedLine text={text} scan={scan([m('ip', '1.1.1.1', 5), m('email', 'a@b.co', 16)])} />
    );
    expect(container.textContent).toBe(text);
    const chips = container.querySelectorAll('[data-key]');
    expect([...chips].map((c) => c.getAttribute('data-key'))).toEqual([
      'ip|1.1.1.1',
      'email|a@b.co',
    ]);
  });

  it('starts with a chip when the match is at the start', () => {
    const { container } = render(
      <CollapsedLine text="1.1.1.1 x" scan={scan([m('ip', '1.1.1.1', 0)])} />
    );
    expect(container.firstElementChild).toHaveAttribute('data-key', 'ip|1.1.1.1');
  });

  it('marks hits in plain text only, never inside a chip', () => {
    const text = 'ip 1.1.1.1 ip';
    const { container } = render(
      <CollapsedLine text={text} scan={scan([m('ip', '1.1.1.1', 3)])} term="1.1" />
    );
    expect(container.querySelectorAll('mark')).toHaveLength(0);
    cleanup();
    const again = render(
      <CollapsedLine text={text} scan={scan([m('ip', '1.1.1.1', 3)])} term="ip" />
    );
    expect(again.container.querySelectorAll('mark')).toHaveLength(2);
  });

  it('renders only the first part of a very long text and clips a match at the edge', () => {
    const text = 'x'.repeat(ROW_TEXT_LIMIT - 2) + '1.1.1.1' + 'y'.repeat(100);
    const { container } = render(
      <CollapsedLine text={text} scan={scan([m('ip', '1.1.1.1', ROW_TEXT_LIMIT - 2)])} />
    );
    expect(container.textContent).toHaveLength(ROW_TEXT_LIMIT);
    expect(screen.getByText('1.')).toBeInTheDocument();
  });
});
