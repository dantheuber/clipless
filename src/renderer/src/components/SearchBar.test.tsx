import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SearchBar } from './SearchBar';

const { state } = vi.hoisted(() => ({
  state: {
    searchTerm: '',
    pinnedOnly: false,
    isSearchVisible: true,
    isFiltering: false,
    imagesNotSearched: 0,
    clips: [
      { id: 'a', type: 'text', content: 'alpha' },
      { id: 'b', type: 'text', content: 'beta' },
      { id: 'c', type: 'text', content: '' },
    ],
    filteredClips: [] as { clip: unknown; originalIndex: number }[],
    pins: new Map<string, unknown>(),
    setSearchTerm: vi.fn(),
    setPinnedOnly: vi.fn(),
    hideSearch: vi.fn(),
    requestRowFocus: vi.fn(),
  },
}));

vi.mock('../providers/clips', () => ({
  useClipsData: () => ({
    searchTerm: state.searchTerm,
    pinnedOnly: state.pinnedOnly,
    filteredClips: state.filteredClips,
    clips: state.clips,
    imagesNotSearched: state.imagesNotSearched,
    isFiltering: state.isFiltering,
  }),
  useClipsMeta: () => ({
    setSearchTerm: state.setSearchTerm,
    setPinnedOnly: state.setPinnedOnly,
    isSearchVisible: state.isSearchVisible,
    hideSearch: state.hideSearch,
  }),
  useClipsPins: () => ({ pins: state.pins }),
  useQuickLook: () => ({ requestRowFocus: state.requestRowFocus }),
}));

beforeEach(() => {
  state.searchTerm = '';
  state.pinnedOnly = false;
  state.isSearchVisible = true;
  state.isFiltering = false;
  state.imagesNotSearched = 0;
  state.filteredClips = [
    { clip: state.clips[0], originalIndex: 0 },
    { clip: state.clips[1], originalIndex: 1 },
  ];
  state.pins = new Map();
  vi.clearAllMocks();
});

afterEach(cleanup);

describe('SearchBar', () => {
  it('renders nothing while hidden', () => {
    state.isSearchVisible = false;
    const { container } = render(<SearchBar />);
    expect(container.innerHTML).toBe('');
  });

  it('focuses the input when shown and shows no count line without a filter', () => {
    render(<SearchBar />);
    expect(screen.getByRole('textbox')).toHaveFocus();
    expect(screen.queryByTestId('search-count')).toBeNull();
  });

  it('wording of the count line: visible of total, and what was not searched', () => {
    state.searchTerm = 'al';
    state.isFiltering = true;
    state.filteredClips = [{ clip: state.clips[0], originalIndex: 0 }];
    state.imagesNotSearched = 1;
    render(<SearchBar />);
    expect(screen.getByTestId('search-count')).toHaveTextContent('1 of 2 · 1 image not searched');
    cleanup();
    state.imagesNotSearched = 2;
    render(<SearchBar />);
    expect(screen.getByTestId('search-count')).toHaveTextContent('1 of 2 · 2 images not searched');
    cleanup();
    state.imagesNotSearched = 0;
    render(<SearchBar />);
    expect(screen.getByTestId('search-count')).toHaveTextContent('1 of 2');
  });

  it('the pinned toggle is disabled with no pins and toggles otherwise', () => {
    render(<SearchBar />);
    const toggle = screen.getByText('pinned');
    expect(toggle).toBeDisabled();
    expect(toggle.title).toBe('Pin a value to filter by it');
    cleanup();
    state.pins = new Map([['ip|1', {}]]);
    render(<SearchBar />);
    const live = screen.getByText('pinned');
    expect(live).not.toBeDisabled();
    fireEvent.click(live);
    expect(state.setPinnedOnly).toHaveBeenCalled();
    const updater = state.setPinnedOnly.mock.calls[0][0];
    expect(updater(false)).toBe(true);
  });

  it('stays enabled while on even after the last pin goes, so it can be turned off', () => {
    state.pinnedOnly = true;
    render(<SearchBar />);
    const toggle = screen.getByText('pinned');
    expect(toggle).not.toBeDisabled();
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('Esc clears the text first, then hides the bar', () => {
    state.searchTerm = 'abc';
    render(<SearchBar />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(state.setSearchTerm).toHaveBeenCalledWith('');
    expect(state.hideSearch).not.toHaveBeenCalled();
    cleanup();
    state.searchTerm = '';
    render(<SearchBar />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(state.hideSearch).toHaveBeenCalled();
  });

  it('Down and Enter hand focus to the first visible row', () => {
    state.filteredClips = [{ clip: state.clips[1], originalIndex: 1 }];
    render(<SearchBar />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(state.requestRowFocus).toHaveBeenCalledTimes(2);
    expect(state.requestRowFocus).toHaveBeenCalledWith(1);
  });

  it('does nothing on Down when nothing is visible', () => {
    state.filteredClips = [];
    render(<SearchBar />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'ArrowDown' });
    expect(state.requestRowFocus).not.toHaveBeenCalled();
  });

  it('typing sets the term and the clear button empties it', () => {
    state.searchTerm = 'x';
    render(<SearchBar />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'xy' } });
    expect(state.setSearchTerm).toHaveBeenCalledWith('xy');
    fireEvent.click(screen.getByTitle('Clear search'));
    expect(state.setSearchTerm).toHaveBeenCalledWith('');
    expect(screen.getByRole('textbox')).toHaveFocus();
  });
});
