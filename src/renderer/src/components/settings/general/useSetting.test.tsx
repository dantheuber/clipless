import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import type { SettingsApplyResult, UserSettings } from '../../../../../shared/types';
import { SettingsProvider } from './SettingsProvider';
import { SAVED_LABEL_MS, UNDO_MS, previousPatch, useSetting, useSettingsStore } from './useSetting';
import { registerSettingsProviderCases } from './SettingsProvider.cases';

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
    expect(api().settingsChanged).toHaveBeenCalledTimes(2);
    expect(api().settingsChanged).toHaveBeenLastCalledWith({ ...stored, autoStart: false });

    act(() => vi.advanceTimersByTime(UNDO_MS * 2));
    expect(screen.getByTestId('status-autoStart')).toHaveTextContent('not saved');

    fireEvent.click(screen.getByText('retry'));
    await flush();
    expect(screen.getByTestId('value-autoStart')).toHaveTextContent('true');
    expect(screen.getByTestId('status-autoStart')).toHaveTextContent('saved');
  });

  registerSettingsProviderCases({
    api,
    mount,
    flush,
    deferSettingsChanged,
    getResolvers: () => resolvers,
    stored,
    Row,
  });
});
