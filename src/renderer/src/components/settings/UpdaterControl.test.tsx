import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import UpdaterControl, { updateStatusText } from './UpdaterControl';
import type { UpdateState } from '../../../../shared/types';

const theme = vi.hoisted(() => ({ isLight: false }));

vi.mock('../../providers/theme', () => ({
  useTheme: () => ({ isLight: theme.isLight }),
}));

type StateCallback = (state: UpdateState) => void;
const mockApi = () => window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;

const setupOnState = (): { emit: (state: UpdateState) => void } => {
  let cb: StateCallback = () => {};
  mockApi().onUpdateState.mockImplementation((callback: StateCallback) => {
    cb = callback;
    return () => {};
  });
  return { emit: (state) => act(() => cb(state)) };
};

const flush = () => act(async () => {});

beforeEach(() => {
  vi.clearAllMocks();
  theme.isLight = false;
  mockApi().getUpdateState.mockResolvedValue({ status: 'idle' });
  mockApi().checkForUpdates.mockResolvedValue(null);
  mockApi().downloadUpdate.mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
});

describe('updateStatusText', () => {
  it('maps every status to its text without reading a display string', () => {
    expect(updateStatusText({ status: 'idle' })).toBe('Ready');
    expect(updateStatusText({ status: 'checking' })).toBe('Checking for updates...');
    expect(updateStatusText({ status: 'available', version: '2.0.0' })).toBe(
      'Update 2.0.0 available, downloading...'
    );
    expect(updateStatusText({ status: 'available' })).toBe('Update available, downloading...');
    expect(updateStatusText({ status: 'downloading', progress: 40 })).toBe('Downloading 40%');
    expect(updateStatusText({ status: 'downloading' })).toBe('Downloading...');
    expect(updateStatusText({ status: 'downloaded', version: '2.0.0' })).toBe(
      'Update downloaded. Restart to install.'
    );
    expect(updateStatusText({ status: 'upToDate' })).toBe('No updates available');
    expect(updateStatusText({ status: 'error', message: 'net down' })).toBe('Error: net down');
    expect(updateStatusText({ status: 'error' })).toBe('Error: Unknown error');
  });
});

describe('UpdaterControl', () => {
  it('renders the state pushed by the main process', async () => {
    const { emit } = setupOnState();
    render(<UpdaterControl />);
    await flush();
    expect(screen.getByText('Ready')).toBeInTheDocument();

    emit({ status: 'checking' });
    expect(screen.getByText('Checking for updates...')).toBeInTheDocument();

    emit({ status: 'error', message: 'boom' });
    expect(screen.getByText('Error: boom')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Restart & Install' })).toBeNull();

    emit({ status: 'downloaded', version: '2.0.0' });
    expect(screen.getByRole('button', { name: 'Restart & Install' })).toBeInTheDocument();
  });

  it('colours the dot from the status', async () => {
    const { emit } = setupOnState();
    const { container } = render(<UpdaterControl />);
    await flush();
    const dot = () => container.querySelector('[class*="statusDot"]') as HTMLElement;
    expect(dot().className).toMatch(/statusDotReady/);
    emit({ status: 'checking' });
    expect(dot().className).toMatch(/statusDotChecking/);
    emit({ status: 'available', version: '2.0.0' });
    expect(dot().className).toMatch(/statusDotSuccess/);
    emit({ status: 'downloading', progress: 10 });
    expect(dot().className).toMatch(/statusDotSuccess/);
    emit({ status: 'downloaded', version: '2.0.0' });
    expect(dot().className).toMatch(/statusDotSuccess/);
    emit({ status: 'upToDate' });
    expect(dot().className).toMatch(/statusDotReady/);
    emit({ status: 'error', message: 'x' });
    expect(dot().className).toMatch(/statusDotError/);
  });

  it('applies the light class to the button while checking on the light theme', async () => {
    theme.isLight = true;
    setupOnState();
    let resolveCheck: (value: null) => void = () => {};
    mockApi().checkForUpdates.mockReturnValue(new Promise((r) => (resolveCheck = r)));
    render(<UpdaterControl />);
    await flush();
    const button = screen.getByRole('button', { name: 'Check for Updates' });
    expect(button.className).not.toMatch(/light/);
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: 'Checking...' }).className).toMatch(/light/);
    await act(async () => resolveCheck(null));
  });

  it('reads the current state on mount', async () => {
    setupOnState();
    mockApi().getUpdateState.mockResolvedValue({ status: 'upToDate' });
    render(<UpdaterControl />);
    await flush();
    expect(screen.getByText('No updates available')).toBeInTheDocument();
  });

  it('logs when the initial state read fails', async () => {
    setupOnState();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockApi().getUpdateState.mockRejectedValue(new Error('ipc'));
    render(<UpdaterControl />);
    await flush();
    expect(errSpy).toHaveBeenCalledWith('Failed to read update state:', expect.any(Error));
    errSpy.mockRestore();
  });

  it('checks, then downloads when an update is found', async () => {
    setupOnState();
    mockApi().checkForUpdates.mockResolvedValue({ version: '2.0.0' });
    render(<UpdaterControl />);
    await flush();

    fireEvent.click(screen.getByRole('button', { name: 'Check for Updates' }));
    expect(screen.getByText('Checking...')).toBeInTheDocument();
    await flush();

    expect(mockApi().checkForUpdates).toHaveBeenCalledTimes(1);
    expect(mockApi().downloadUpdate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Check for Updates' })).not.toBeDisabled();
  });

  it('does not download when nothing is found', async () => {
    setupOnState();
    render(<UpdaterControl />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Check for Updates' }));
    await flush();
    expect(mockApi().downloadUpdate).not.toHaveBeenCalled();
  });

  it('logs a failed check and leaves the state to the main process', async () => {
    setupOnState();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockApi().checkForUpdates.mockRejectedValue(new Error('net down'));
    render(<UpdaterControl />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Check for Updates' }));
    await flush();
    expect(errSpy).toHaveBeenCalledWith('Update check failed:', expect.any(Error));
    expect(screen.getByText('Ready')).toBeInTheDocument();
    errSpy.mockRestore();
  });

  it('restarts to install from the downloaded state', async () => {
    const { emit } = setupOnState();
    render(<UpdaterControl />);
    await flush();
    emit({ status: 'downloaded', version: '2.0.0' });
    fireEvent.click(screen.getByRole('button', { name: 'Restart & Install' }));
    expect(mockApi().quitAndInstall).toHaveBeenCalledTimes(1);
  });
});
