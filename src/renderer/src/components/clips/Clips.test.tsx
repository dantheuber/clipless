import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { Clips } from './Clips';

/**
 * A stand-in for the virtualiser: it renders a window of ten rows starting at the index
 * scrollToIndex was last called with, which is what a real virtualised list does to a
 * row far from the viewport.
 */
const { virtual, state } = vi.hoisted(() => ({
  virtual: { start: 0, scrollToIndex: vi.fn() },
  state: {
    clips: [] as { id: string; type: string; content: string }[],
    filteredClips: [] as { clip: { id: string; content: string }; originalIndex: number }[],
    searchTerm: '',
    isFiltering: false,
    pinnedOnly: false,
    isSearchVisible: false,
    setIsSearchVisible: vi.fn(),
    focusRequest: null as { index: number; seq: number } | null,
  },
}));

vi.mock('@tanstack/react-virtual', async () => {
  const React = await import('react');
  return {
    useVirtualizer: (opts: {
      count: number;
      getScrollElement: () => Element | null;
      estimateSize: (i: number) => number;
    }) => {
      const { count } = opts;
      opts.getScrollElement();
      opts.estimateSize(0);
      // A scroll re-renders the list, as the real virtualiser does through its scroll listener
      const [start, setStart] = React.useState(virtual.start);
      return {
        getTotalSize: () => count * 40,
        getVirtualItems: () =>
          Array.from({ length: Math.min(10, Math.max(0, count - start)) }, (_, i) => ({
            key: start + i,
            index: start + i,
            start: (start + i) * 40,
          })),
        measureElement: () => {},
        scrollToIndex: (index: number) => {
          virtual.scrollToIndex(index);
          setStart(Math.max(0, index - 5));
        },
      };
    },
  };
});

vi.mock('../../providers/clips', () => ({
  useClipsData: () => ({
    filteredClips: state.filteredClips,
    searchTerm: state.searchTerm,
    isFiltering: state.isFiltering,
    pinnedOnly: state.pinnedOnly,
  }),
  useClipsMeta: () => ({
    clipCopyId: null,
    isSearchVisible: state.isSearchVisible,
    setIsSearchVisible: state.setIsSearchVisible,
  }),
  useQuickLook: () => ({ focusRequest: state.focusRequest }),
}));

vi.mock('./clip', () => ({
  Clip: ({ index, visibleIndex }: { index: number; visibleIndex: number }) => (
    <div tabIndex={0} data-row-index={visibleIndex} data-testid={`row-${index}`}>
      row {index + 1}
    </div>
  ),
}));

vi.mock('../SearchBar', () => ({ SEARCH_INPUT_ID: 'clip-search-input' }));

beforeEach(() => {
  vi.clearAllMocks();
  virtual.start = 0;
  state.clips = Array.from({ length: 100 }, (_, i) => ({
    id: `c${i}`,
    type: 'text',
    content: `clip ${i}`,
  }));
  state.filteredClips = state.clips.map((clip, originalIndex) => ({ clip, originalIndex }));
  state.searchTerm = '';
  state.isFiltering = false;
  state.pinnedOnly = false;
  state.isSearchVisible = false;
  state.focusRequest = null;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const nextFrame = () => act(() => new Promise<void>((r) => requestAnimationFrame(() => r())));

describe('Clips focus return', () => {
  it('scrolls a row far from the viewport into view, then focuses it on the next frame', async () => {
    const { rerender } = render(<Clips />);
    expect(screen.queryByTestId('row-87')).toBeNull();
    state.focusRequest = { index: 87, seq: 1 };
    rerender(<Clips />);
    expect(virtual.scrollToIndex).toHaveBeenCalledWith(87);
    await nextFrame();
    expect(screen.getByTestId('row-87')).toHaveFocus();
  });

  it('maps a real row index through the filter and ignores a hidden row', async () => {
    state.filteredClips = [
      { clip: state.clips[3], originalIndex: 3 },
      { clip: state.clips[87], originalIndex: 87 },
    ];
    const { rerender } = render(<Clips />);
    state.focusRequest = { index: 87, seq: 1 };
    rerender(<Clips />);
    expect(virtual.scrollToIndex).toHaveBeenCalledWith(1);
    await nextFrame();
    expect(screen.getByTestId('row-87')).toHaveFocus();
    state.focusRequest = { index: 50, seq: 2 };
    rerender(<Clips />);
    expect(virtual.scrollToIndex).toHaveBeenCalledTimes(1);
  });

  it('does not refocus for the same request twice', async () => {
    state.focusRequest = { index: 2, seq: 1 };
    const { rerender } = render(<Clips />);
    rerender(<Clips />);
    expect(virtual.scrollToIndex).toHaveBeenCalledTimes(1);
  });
});

describe('Clips keyboard', () => {
  it('Up and Down move focus between rows', async () => {
    render(<Clips />);
    const row0 = screen.getByTestId('row-0');
    row0.focus();
    fireEvent.keyDown(row0, { key: 'ArrowDown' });
    expect(virtual.scrollToIndex).toHaveBeenCalledWith(1);
    await nextFrame();
    expect(screen.getByTestId('row-1')).toHaveFocus();
    fireEvent.keyDown(screen.getByTestId('row-1'), { key: 'ArrowUp' });
    await nextFrame();
    expect(screen.getByTestId('row-0')).toHaveFocus();
    fireEvent.keyDown(screen.getByTestId('row-0'), { key: 'ArrowUp' });
    fireEvent.keyDown(screen.getByTestId('row-0'), { key: 'a' });
    expect(virtual.scrollToIndex).toHaveBeenCalledTimes(2);
  });

  it('Down past the last row returns to the search input when the bar is open', () => {
    state.clips = state.clips.slice(0, 3);
    state.filteredClips = state.clips.map((clip, originalIndex) => ({ clip, originalIndex }));
    state.isSearchVisible = true;
    const input = document.createElement('input');
    input.id = 'clip-search-input';
    document.body.appendChild(input);
    render(<Clips />);
    fireEvent.keyDown(screen.getByTestId('row-2'), { key: 'ArrowDown' });
    expect(input).toHaveFocus();
    input.remove();
    // the bar is open but its input is not in the document: nothing to focus
    fireEvent.keyDown(screen.getByTestId('row-2'), { key: 'ArrowDown' });
    cleanup();
    state.isSearchVisible = false;
    render(<Clips />);
    fireEvent.keyDown(screen.getByTestId('row-2'), { key: 'ArrowDown' });
    expect(virtual.scrollToIndex).not.toHaveBeenCalled();
  });

  it('/ opens search and keys from a text field or outside a row are ignored', () => {
    render(<Clips />);
    fireEvent.keyDown(screen.getByTestId('row-0'), { key: '/' });
    expect(state.setIsSearchVisible).toHaveBeenCalledWith(true);
    const list = screen.getByTestId('clips-list');
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(virtual.scrollToIndex).not.toHaveBeenCalled();
    const area = document.createElement('textarea');
    list.appendChild(area);
    fireEvent.keyDown(area, { key: '/' });
    expect(state.setIsSearchVisible).toHaveBeenCalledTimes(1);
  });
});

describe('Clips empty states', () => {
  it('names the search term or the pinned filter', () => {
    state.isFiltering = true;
    state.searchTerm = 'zzz';
    state.filteredClips = [];
    render(<Clips />);
    expect(screen.getByText('No clips match "zzz"')).toBeInTheDocument();
    cleanup();
    state.searchTerm = '';
    state.pinnedOnly = true;
    render(<Clips />);
    expect(screen.getByText('No clips contain a pinned value')).toBeInTheDocument();
  });
});
