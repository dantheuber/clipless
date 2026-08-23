import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import type { SettingsApplyResult, UserSettings } from '../../../../../shared/types';
import { SettingsProvider } from './SettingsProvider';
import { SAVED_LABEL_MS, UNDO_MS, previousPatch, useSetting, useSettingsStore } from './useSetting';

const api = () => window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;

const stored: UserSettings = {
  maxClips: 50,
  startMinimized: false,
  autoStart: false,
  theme: 'dark',
  alwaysOnTop: false,
};

function Row({ name }: { name: 'startMinimized' | 'alwaysOnTop' | 'autoStart' }) {
  const { value, set, status } = useSetting(name);
  return (
    <div data-testid={`row-${name}`}>
      <button onClick={() => set(!value)}>{name}</button>
      <span data-testid={`value-${name}`}>{String(value)}</span>
      <span data-testid={`status-${name}`}>
        {status?.kind === 'saving' && 'saving'}
        {status?.kind === 'saved' && (
          <>
            {status.label && 'saved'}
            {status.undo && <button onClick={status.undo}>undo</button>}
          </>
        )}
        {status?.kind === 'error' && (
          <>
            not saved
            <button onClick={status.retry}>retry</button>
            <i>{status.message}</i>
          </>
        )}
      </span>
    </div>
  );
}

function Shell() {
  const { settings, loadError, reload } = useSettingsStore();
  if (loadError) {
    return (
      <div>
        failed: {loadError}
        <button onClick={reload}>reload</button>
      </div>
    );
  }
  if (!settings) return <div>loading</div>;
  return (
    <>
      <Row name="startMinimized" />
      <Row name="alwaysOnTop" />
      <Row name="autoStart" />
    </>
  );
}

const flush = () => act(async () => {});

let resolvers: ((r: SettingsApplyResult) => void)[] = [];
const deferSettingsChanged = () => {
  api().settingsChanged.mockImplementation(
    () => new Promise<SettingsApplyResult>((resolve) => resolvers.push(resolve))
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  resolvers = [];
  api().storageGetSettings.mockResolvedValue({ ...stored });
  api().getAutoStartState.mockResolvedValue(null);
  api().settingsChanged.mockResolvedValue({ ok: true, failed: [] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const mount = async () => {
  render(
    <SettingsProvider>
      <Shell />
    </SettingsProvider>
  );
  await flush();
};

describe('previousPatch', () => {
  it('maps every changed key back to its previous value', () => {
    expect(previousPatch(stored, { maxClips: 20, theme: 'light' })).toEqual({
      maxClips: 50,
      theme: 'dark',
    });
  });
});

describe('SettingsProvider', () => {
  it('loads once and reflects the OS login item state', async () => {
    api().getAutoStartState.mockResolvedValue(true);
    await mount();
    expect(api().storageGetSettings).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('value-autoStart')).toHaveTextContent('true');
  });

  it('shows the load failure inline with a retry', async () => {
    api().storageGetSettings.mockRejectedValueOnce('disk gone');
    await mount();
    expect(screen.getByText(/failed: disk gone/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('reload'));
    await flush();
    expect(screen.getByTestId('value-startMinimized')).toHaveTextContent('false');
  });

  it('saving, then saved with undo; the label goes at two seconds and undo at five', async () => {
    deferSettingsChanged();
    await mount();
    fireEvent.click(screen.getByText('startMinimized'));
    expect(screen.getByTestId('value-startMinimized')).toHaveTextContent('true');
    expect(screen.getByTestId('status-startMinimized')).toHaveTextContent('saving');
    expect(api().settingsChanged).toHaveBeenLastCalledWith({ ...stored, startMinimized: true });

    await act(async () => resolvers[0]({ ok: true, failed: [] }));
    expect(screen.getByTestId('status-startMinimized')).toHaveTextContent('saved');
    expect(screen.getByText('undo')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(SAVED_LABEL_MS));
    expect(screen.getByTestId('status-startMinimized')).not.toHaveTextContent('saved');
    expect(screen.getByText('undo')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(UNDO_MS - SAVED_LABEL_MS));
    expect(screen.queryByText('undo')).toBeNull();
    expect(screen.getByTestId('status-startMinimized')).toHaveTextContent('');
  });

  it('undo re-applies the previous value through the same path and shows saved without undo', async () => {
    await mount();
    fireEvent.click(screen.getByText('startMinimized'));
    await flush();
    fireEvent.click(screen.getByText('undo'));
    await flush();
    expect(api().settingsChanged).toHaveBeenLastCalledWith({ ...stored, startMinimized: false });
    expect(screen.getByTestId('value-startMinimized')).toHaveTextContent('false');
    expect(screen.getByTestId('status-startMinimized')).toHaveTextContent('saved');
    expect(screen.queryByText('undo')).toBeNull();
    act(() => vi.advanceTimersByTime(SAVED_LABEL_MS));
    expect(screen.getByTestId('status-startMinimized')).toHaveTextContent('');
  });

  it('not saved with retry: the control goes back, the main process is told, retry tries again', async () => {
    api().settingsChanged.mockResolvedValueOnce({
      ok: false,
      failed: [],
      message: 'the system refused the login item',
    });
    await mount();
    fireEvent.click(screen.getByText('autoStart'));
    await flush();
    expect(screen.getByTestId('value-autoStart')).toHaveTextContent('false');
    expect(screen.getByTestId('status-autoStart')).toHaveTextContent('not saved');
    expect(screen.getByTestId('status-autoStart')).toHaveTextContent(
      'the system refused the login item'
    );
    // the rollback write carries the previous value
    expect(api().settingsChanged).toHaveBeenCalledTimes(2);
    expect(api().settingsChanged).toHaveBeenLastCalledWith({ ...stored, autoStart: false });

    act(() => vi.advanceTimersByTime(UNDO_MS * 2));
    expect(screen.getByTestId('status-autoStart')).toHaveTextContent('not saved');

    fireEvent.click(screen.getByText('retry'));
    await flush();
    expect(screen.getByTestId('value-autoStart')).toHaveTextContent('true');
    expect(screen.getByTestId('status-autoStart')).toHaveTextContent('saved');
  });

  it('a rejected write reads as not saved with the error text, even when the rollback write fails too', async () => {
    api().settingsChanged.mockRejectedValue(new Error('ipc down'));
    await mount();
    fireEvent.click(screen.getByText('alwaysOnTop'));
    await flush();
    expect(screen.getByTestId('status-alwaysOnTop')).toHaveTextContent('not saved');
    expect(screen.getByTestId('status-alwaysOnTop')).toHaveTextContent('ipc down');
    expect(screen.getByTestId('value-alwaysOnTop')).toHaveTextContent('false');
  });

  it('never disables one control for another: two saves run side by side with their own slots', async () => {
    deferSettingsChanged();
    await mount();
    fireEvent.click(screen.getByText('startMinimized'));
    fireEvent.click(screen.getByText('alwaysOnTop'));
    expect(screen.getByTestId('status-startMinimized')).toHaveTextContent('saving');
    expect(screen.getByTestId('status-alwaysOnTop')).toHaveTextContent('saving');
    // the second write carries the first change too
    expect(api().settingsChanged).toHaveBeenLastCalledWith({
      ...stored,
      startMinimized: true,
      alwaysOnTop: true,
    });

    await act(async () => resolvers[1]({ ok: true, failed: [] }));
    expect(screen.getByTestId('status-alwaysOnTop')).toHaveTextContent('saved');
    expect(screen.getByTestId('status-startMinimized')).toHaveTextContent('saving');

    await act(async () => resolvers[0]({ ok: false, failed: [] }));
    expect(screen.getByTestId('status-startMinimized')).toHaveTextContent('not saved');
    expect(screen.getByTestId('value-startMinimized')).toHaveTextContent('false');
    // the rollback keeps the other control's new value
    expect(screen.getByTestId('value-alwaysOnTop')).toHaveTextContent('true');
    expect(api().settingsChanged).toHaveBeenLastCalledWith({
      ...stored,
      startMinimized: false,
      alwaysOnTop: true,
    });
  });

  it('accept decides success from the answer, so a hotkey row can ignore failures on other rows', async () => {
    function Custom() {
      const { commit, statuses } = useSettingsStore();
      return (
        <>
          <button
            onClick={() =>
              commit({ maxClips: 60 }, ['maxClips'], {
                accept: (r) => !r.failed.includes('Ctrl+Shift+1'),
              })
            }
          >
            go
          </button>
          <span data-testid="st">{statuses.maxClips?.kind}</span>
        </>
      );
    }
    api().settingsChanged.mockResolvedValue({ ok: false, failed: ['Ctrl+Shift+2'] });
    render(
      <SettingsProvider>
        <Custom />
      </SettingsProvider>
    );
    await flush();
    fireEvent.click(screen.getByText('go'));
    await flush();
    expect(screen.getByTestId('st')).toHaveTextContent('saved');
  });

  it('setStatus sets and clears a slot by hand', async () => {
    function Custom() {
      const { setStatus, statuses } = useSettingsStore();
      return (
        <>
          <button onClick={() => setStatus('x', { kind: 'saving' })}>set</button>
          <button onClick={() => setStatus('x', null)}>clear</button>
          <span data-testid="st">{statuses.x?.kind ?? 'none'}</span>
        </>
      );
    }
    render(
      <SettingsProvider>
        <Custom />
      </SettingsProvider>
    );
    await flush();
    fireEvent.click(screen.getByText('set'));
    expect(screen.getByTestId('st')).toHaveTextContent('saving');
    fireEvent.click(screen.getByText('clear'));
    expect(screen.getByTestId('st')).toHaveTextContent('none');
  });

  it('refuses to commit before the settings have loaded', async () => {
    let answer: SettingsApplyResult | null = null;
    function Early() {
      const { commit } = useSettingsStore();
      return (
        <button
          onClick={() => {
            commit({ maxClips: 1 }, ['maxClips']).then((r) => {
              answer = r;
            });
          }}
        >
          early
        </button>
      );
    }
    api().storageGetSettings.mockReturnValue(new Promise(() => {}));
    render(
      <SettingsProvider>
        <Early />
      </SettingsProvider>
    );
    fireEvent.click(screen.getByText('early'));
    await flush();
    expect(answer).toEqual({ ok: false, failed: [], message: 'settings are not loaded' });
    expect(api().settingsChanged).not.toHaveBeenCalled();
  });

  it('useSetting throws outside the provider', () => {
    expect(() => render(<Row name="autoStart" />)).toThrow(/within SettingsProvider/);
  });
});
