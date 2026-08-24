import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import Settings from './Settings';

const api = () => window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const flush = () => act(async () => {});

beforeEach(() => {
  vi.clearAllMocks();
  api().storageGetSettings.mockResolvedValue({
    maxClips: 100,
    startMinimized: false,
    autoStart: false,
  });
  api().storageGetStats.mockResolvedValue({ clipCount: 0, lockedCount: 0, dataSize: 0 });
  window.history.replaceState({}, '', '/');
});

afterEach(cleanup);

describe('Settings window', () => {
  it('shows one loading state, then General, and switches tabs from the rail', async () => {
    let resolve: (v: unknown) => void = () => {};
    api().storageGetSettings.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    render(<Settings />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
    await act(async () => resolve({ maxClips: 100, startMinimized: false, autoStart: false }));
    expect(screen.getByTestId('panel-application')).toBeInTheDocument();
    expect(screen.getByTestId('rail-version')).toHaveTextContent('v0.0.0-test');

    fireEvent.click(screen.getByTestId('rail-hotkeys'));
    await flush();
    expect(screen.getByTestId('hotkeys-table')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('rail-tools'));
    await flush();
    expect(screen.getByTestId('list-pane')).toBeInTheDocument();
  });

  it('opens on the tab named in the URL, mapping the old names', async () => {
    window.history.replaceState({}, '', '/?tab=templates');
    render(<Settings />);
    await flush();
    expect(screen.getByTestId('rail-tools')).toHaveAttribute('aria-current', 'page');
  });

  it('shows a load failure inline with a retry link', async () => {
    api().storageGetSettings.mockRejectedValueOnce(new Error('no disk'));
    render(<Settings />);
    await flush();
    expect(screen.getByTestId('load-error')).toHaveTextContent('no disk');
    fireEvent.click(screen.getByText('retry'));
    await flush();
    expect(screen.getByTestId('panel-application')).toBeInTheDocument();
  });
});
