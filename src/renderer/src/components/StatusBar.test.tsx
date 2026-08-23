import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { StatusBar } from './StatusBar';

const { state } = vi.hoisted(() => ({
  state: {
    clips: [
      { id: 'a', type: 'text', content: 'one' },
      { id: 'b', type: 'text', content: 'two' },
      { id: 'c', type: 'text', content: '' },
    ],
    locked: new Set<number>([1]),
    maxClips: 25,
    isSearchVisible: false,
    setIsSearchVisible: vi.fn(),
    hideSearch: vi.fn(),
    openNewest: vi.fn(),
  },
}));

vi.mock('../providers/clips', () => ({
  useClipsData: () => ({ clips: state.clips }),
  useClipsActions: () => ({ isClipLocked: (i: number) => state.locked.has(i) }),
  useClipsMeta: () => ({
    maxClips: state.maxClips,
    isSearchVisible: state.isSearchVisible,
    setIsSearchVisible: state.setIsSearchVisible,
    hideSearch: state.hideSearch,
  }),
  useQuickLook: () => ({ openNewest: state.openNewest }),
}));

const api = () => window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.clearAllMocks();
  state.isSearchVisible = false;
  api().storageGetSettings.mockResolvedValue({
    hotkeys: {
      enabled: true,
      quickLook: { enabled: true, key: 'Ctrl+Shift+T' },
      searchClips: { enabled: false, key: 'Ctrl+Shift+F' },
    },
  });
  api().getUpdateState.mockResolvedValue({ status: 'idle' });
  api().onUpdateState.mockReturnValue(() => {});
  api().onSettingsUpdated.mockReturnValue(() => {});
});

afterEach(cleanup);

describe('StatusBar', () => {
  it('shows the counts with their words', async () => {
    render(<StatusBar />);
    await act(async () => {});
    expect(screen.getByText('clips', { exact: false })).toBeInTheDocument();
    expect(screen.getByTitle('2 of 25 clips')).toHaveTextContent('2 / 25');
    expect(screen.getByTitle('1 locked')).toHaveTextContent('1');
  });

  it('hides the locked count when nothing is locked', () => {
    state.locked = new Set();
    render(<StatusBar />);
    expect(screen.queryByTitle('1 locked')).toBeNull();
    state.locked = new Set([1]);
  });

  it('names the hotkey in the tooltip only when it is enabled', async () => {
    render(<StatusBar />);
    await act(async () => {});
    expect(screen.getByTestId('quick-look-button').title).toBe(
      'Quick look on the newest clip (Ctrl+Shift+T)'
    );
    expect(screen.getByTestId('search-button').title).toBe('Filter clips');
  });

  it('toggles search with an on-state and opens quick look on the newest clip', () => {
    render(<StatusBar />);
    fireEvent.click(screen.getByTestId('search-button'));
    expect(state.setIsSearchVisible).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByTestId('quick-look-button'));
    expect(state.openNewest).toHaveBeenCalled();
    cleanup();
    state.isSearchVisible = true;
    render(<StatusBar />);
    expect(screen.getByTestId('search-button')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('search-button'));
    expect(state.hideSearch).toHaveBeenCalled();
  });

  it('opens settings through the callback or the preload', async () => {
    const onOpenSettings = vi.fn();
    render(<StatusBar onOpenSettings={onOpenSettings} />);
    fireEvent.click(screen.getByTitle('Open settings'));
    expect(onOpenSettings).toHaveBeenCalled();
    cleanup();
    render(<StatusBar />);
    await act(async () => {
      fireEvent.click(screen.getByTitle('Open settings'));
    });
    expect(window.api.openSettings).toHaveBeenCalled();
  });

  it('does nothing when the preload has no openSettings', () => {
    const saved = window.api.openSettings;
    Object.defineProperty(window.api, 'openSettings', { value: undefined, writable: true });
    render(<StatusBar />);
    fireEvent.click(screen.getByTitle('Open settings'));
    Object.defineProperty(window.api, 'openSettings', { value: saved, writable: true });
  });

  it('logs when opening settings fails', async () => {
    api().openSettings.mockRejectedValueOnce(new Error('no'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<StatusBar />);
    await act(async () => {
      fireEvent.click(screen.getByTitle('Open settings'));
    });
    expect(errSpy).toHaveBeenCalledWith('Failed to open settings:', expect.any(Error));
    errSpy.mockRestore();
  });

  it('shows the update pill once an update has downloaded and restarts on click', async () => {
    let push: (s: { status: string; version?: string }) => void = () => {};
    api().onUpdateState.mockImplementation((cb: typeof push) => {
      push = cb;
      return () => {};
    });
    render(<StatusBar />);
    await act(async () => {});
    expect(screen.queryByTestId('update-pill')).toBeNull();
    act(() => push({ status: 'downloaded', version: '1.9.0' }));
    expect(screen.getByTestId('update-pill')).toHaveTextContent('1.9.0 ready');
    await act(async () => {
      fireEvent.click(screen.getByTestId('update-pill'));
    });
    expect(window.api.quitAndInstall).toHaveBeenCalled();
    act(() => push({ status: 'downloaded' }));
    expect(screen.getByTestId('update-pill')).toHaveTextContent('Update ready');
  });

  it('logs when the restart or the state reads fail', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    api().getUpdateState.mockResolvedValue({ status: 'downloaded', version: '2' });
    api().quitAndInstall.mockRejectedValueOnce(new Error('x'));
    api().storageGetSettings.mockRejectedValueOnce(new Error('y'));
    render(<StatusBar />);
    await act(async () => {});
    await act(async () => {
      fireEvent.click(screen.getByTestId('update-pill'));
    });
    expect(errSpy).toHaveBeenCalledWith('Failed to restart for update:', expect.any(Error));
    expect(errSpy).toHaveBeenCalledWith(
      'Failed to read hotkeys for the status bar:',
      expect.any(Error)
    );
    cleanup();
    api().getUpdateState.mockRejectedValueOnce(new Error('z'));
    render(<StatusBar />);
    await act(async () => {});
    expect(errSpy).toHaveBeenCalledWith('Failed to read update state:', expect.any(Error));
    errSpy.mockRestore();
  });

  it('follows settings updates for the hotkey hints', async () => {
    let push: (s: unknown) => void = () => {};
    api().onSettingsUpdated.mockImplementation((cb: typeof push) => {
      push = cb;
      return () => {};
    });
    render(<StatusBar />);
    await act(async () => {});
    act(() => push({ hotkeys: { enabled: false } }));
    expect(screen.getByTestId('quick-look-button').title).toBe('Quick look on the newest clip');
  });
});
