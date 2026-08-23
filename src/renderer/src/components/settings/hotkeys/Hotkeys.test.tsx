import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import type { HotkeySettings, SettingsApplyResult } from '../../../../../shared/types';
import { ToastProvider } from '../../Toast';
import { SettingsProvider } from '../general/SettingsProvider';
import { Hotkeys } from './Hotkeys';
import { useHotkeys } from './useHotkeys';

const api = () => window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const flush = () => act(async () => {});

const defaults: HotkeySettings = {
  enabled: false,
  focusWindow: { enabled: true, key: 'CommandOrControl+Shift+V' },
  quickClip1: { enabled: true, key: 'CommandOrControl+Shift+1' },
  quickClip2: { enabled: true, key: 'CommandOrControl+Shift+2' },
  quickClip3: { enabled: true, key: 'CommandOrControl+Shift+3' },
  quickClip4: { enabled: true, key: 'CommandOrControl+Shift+4' },
  quickClip5: { enabled: true, key: 'CommandOrControl+Shift+5' },
  quickLook: { enabled: true, key: 'CommandOrControl+Shift+T' },
  searchClips: { enabled: true, key: 'CommandOrControl+Shift+F' },
};

const mount = async (hotkeys: Partial<HotkeySettings> = {}) => {
  api().storageGetSettings.mockResolvedValue({
    maxClips: 100,
    startMinimized: false,
    autoStart: false,
    hotkeys: { ...defaults, enabled: true, ...hotkeys },
  });
  render(
    <ToastProvider>
      <SettingsProvider>
        <Hotkeys />
      </SettingsProvider>
    </ToastProvider>
  );
  await flush();
};

const lastHotkeys = (): HotkeySettings => {
  const calls = api().settingsChanged.mock.calls;
  return calls[calls.length - 1][0].hotkeys;
};

const press = (over: Partial<KeyboardEventInit>) =>
  fireEvent.keyDown(window, { key: 'a', code: 'KeyA', ...over });

beforeEach(() => {
  vi.clearAllMocks();
  api().hotkeysGetDefaults.mockResolvedValue(defaults);
  api().settingsChanged.mockResolvedValue({ ok: true, failed: [] });
  (window.api as unknown as { platform: string }).platform = 'linux';
});

afterEach(cleanup);

describe('Hotkeys', () => {
  it('lists the eight rows in order with platform key names and the master toggle first', async () => {
    await mount();
    const rows = screen.getAllByTestId(/^hotkey-/);
    expect(rows.map((r) => r.getAttribute('data-testid'))).toEqual([
      'hotkey-focusWindow',
      'hotkey-quickLook',
      'hotkey-searchClips',
      'hotkey-quickClip1',
      'hotkey-quickClip2',
      'hotkey-quickClip3',
      'hotkey-quickClip4',
      'hotkey-quickClip5',
    ]);
    expect(screen.getByTestId('keys-focusWindow')).toHaveTextContent('Ctrl+Shift+V');
    expect(screen.getByTestId('keys-focusWindow')).not.toHaveTextContent('CommandOrControl');
    expect(screen.getByTestId('hotkey-quickLook')).toHaveTextContent('Quick look on newest clip');
    expect(screen.getByTestId('footer')).toHaveTextContent(
      'Shortcuts register with the system as soon as they are recorded.'
    );
  });

  it('off dims the table, never hides it, and blocks recording', async () => {
    await mount({ enabled: false });
    expect(screen.getByTestId('hotkeys-table')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('hotkeys-master')).toHaveTextContent(
      'Off. Nothing below is registered'
    );
    fireEvent.click(screen.getByTestId('keys-focusWindow'));
    expect(screen.queryByTestId('recorder')).toBeNull();

    fireEvent.click(screen.getByTestId('toggle-hotkeys'));
    await flush();
    expect(lastHotkeys().enabled).toBe(true);
    expect(screen.getByTestId('status-hk:enabled')).toHaveTextContent('saved');
    expect(screen.getByTestId('hotkeys-table')).toHaveAttribute('aria-disabled', 'false');
  });

  it('records into the keycaps: nothing is written until the combination is accepted', async () => {
    await mount();
    fireEvent.click(screen.getByTestId('keys-focusWindow'));
    expect(screen.getByTestId('recorder')).toBeInTheDocument();
    press({ key: 'Control', code: 'ControlLeft', ctrlKey: true });
    expect(api().settingsChanged).not.toHaveBeenCalled();
    press({ key: 'k', code: 'KeyK', ctrlKey: true, shiftKey: true });
    await flush();
    expect(lastHotkeys().focusWindow.key).toBe('CommandOrControl+Shift+K');
    expect(screen.getByTestId('status-hk:focusWindow')).toHaveTextContent('saved');
    expect(screen.getByTestId('keys-focusWindow')).toHaveTextContent('Ctrl+Shift+K');
    expect(screen.getByTestId('reset-focusWindow')).toBeInTheDocument();
  });

  it('a refused registration shows not saved with retry and puts the old key back', async () => {
    api().settingsChanged.mockResolvedValueOnce({
      ok: false,
      failed: ['CommandOrControl+Shift+K'],
    });
    await mount();
    fireEvent.click(screen.getByTestId('keys-focusWindow'));
    press({ key: 'k', code: 'KeyK', ctrlKey: true, shiftKey: true });
    await flush();
    expect(screen.getByTestId('status-hk:focusWindow')).toHaveTextContent('not saved');
    expect(screen.getByTestId('keys-focusWindow')).toHaveTextContent('Ctrl+Shift+V');
    // the rollback write re-registers the old key
    expect(lastHotkeys().focusWindow.key).toBe('CommandOrControl+Shift+V');
    fireEvent.click(within(screen.getByTestId('status-hk:focusWindow')).getByText('retry'));
    await flush();
    expect(screen.getByTestId('keys-focusWindow')).toHaveTextContent('Ctrl+Shift+K');
  });

  it('swap writes both rows, and rolls both back when the second registration fails', async () => {
    await mount();
    fireEvent.click(screen.getByTestId('keys-focusWindow'));
    press({ key: '1', code: 'Digit1', ctrlKey: true, shiftKey: true });
    expect(screen.getByTestId('recorder-message')).toHaveTextContent('used by Copy clip 1');
    fireEvent.click(screen.getByText('swap'));
    await flush();
    const written = lastHotkeys();
    expect(written.focusWindow.key).toBe('CommandOrControl+Shift+1');
    expect(written.quickClip1.key).toBe('CommandOrControl+Shift+V');
    expect(screen.getByTestId('status-hk:focusWindow')).toHaveTextContent('saved');
    expect(screen.getByTestId('status-hk:quickClip1')).toHaveTextContent('saved');

    // now the other way, with the OS refusing the second row's new key
    api().settingsChanged.mockResolvedValueOnce({
      ok: false,
      failed: ['CommandOrControl+Shift+1'],
    });
    fireEvent.click(screen.getByTestId('keys-focusWindow'));
    press({ key: 'v', code: 'KeyV', ctrlKey: true, shiftKey: true });
    fireEvent.click(screen.getByText('swap'));
    await flush();
    const rolledBack = lastHotkeys();
    expect(rolledBack.focusWindow.key).toBe('CommandOrControl+Shift+1');
    expect(rolledBack.quickClip1.key).toBe('CommandOrControl+Shift+V');
    expect(screen.getByTestId('status-hk:focusWindow')).toHaveTextContent('not saved');
    expect(screen.getByTestId('status-hk:quickClip1')).toHaveTextContent('not saved');
  });

  it('turning the master on reports a refused default on its own row, not on the master', async () => {
    api().settingsChanged.mockResolvedValueOnce({
      ok: false,
      failed: ['CommandOrControl+Shift+2'],
    });
    await mount({ enabled: false });
    fireEvent.click(screen.getByTestId('toggle-hotkeys'));
    await flush();
    expect(screen.getByTestId('status-hk:enabled')).toHaveTextContent('saved');
    expect(screen.getByTestId('status-hk:quickClip2')).toHaveTextContent('not saved');
    expect(screen.getByTestId('status-hk:quickClip1')).toHaveTextContent('');
    fireEvent.click(within(screen.getByTestId('status-hk:quickClip2')).getByText('retry'));
    await flush();
    expect(screen.getByTestId('status-hk:quickClip2')).toHaveTextContent('saved');
  });

  it('a row toggle, a row reset and reset all each write and report', async () => {
    await mount({ quickClip5: { enabled: true, key: 'CommandOrControl+Shift+9' } });
    fireEvent.click(screen.getByTestId('toggle-quickClip1'));
    await flush();
    expect(lastHotkeys().quickClip1.enabled).toBe(false);
    expect(screen.getByTestId('status-hk:quickClip1')).toHaveTextContent('saved');

    expect(screen.queryByTestId('reset-quickClip1')).toBeNull();
    fireEvent.click(screen.getByTestId('reset-quickClip5'));
    await flush();
    expect(lastHotkeys().quickClip5.key).toBe('CommandOrControl+Shift+5');
    expect(screen.getByTestId('status-hk:quickClip5')).toHaveTextContent('saved');
    expect(screen.queryByTestId('reset-quickClip5')).toBeNull();

    fireEvent.click(screen.getByTestId('keys-quickClip4'));
    press({ key: 'p', code: 'KeyP', altKey: true });
    await flush();
    fireEvent.click(screen.getByTestId('reset-all'));
    await flush();
    expect(lastHotkeys().quickClip4.key).toBe('CommandOrControl+Shift+4');
    expect(screen.getByTestId('toast')).toHaveTextContent('Reset');
    expect(screen.getByTestId('toast')).toHaveTextContent('1 shortcut to defaults');

    fireEvent.click(screen.getByTestId('reset-all'));
    await flush();
    expect(screen.getAllByTestId('toast').pop()).toHaveTextContent('0 shortcuts to defaults');
  });

  it('shows a duplicate left by an import on both rows, and the OS advisory per platform', async () => {
    (window.api as unknown as { platform: string }).platform = 'darwin';
    await mount({ quickClip2: { enabled: true, key: 'CommandOrControl+Shift+1' } });
    expect(screen.getByTestId('hotkey-quickClip1')).toHaveTextContent('also bound to Copy clip 2');
    expect(screen.getByTestId('hotkey-quickClip2')).toHaveTextContent('also bound to Copy clip 1');
    expect(screen.getByTestId('hotkey-quickClip3')).toHaveTextContent('screenshot');
    expect(screen.getByTestId('hotkey-quickClip3')).toHaveTextContent(
      'Clipless may never receive it'
    );
    expect(screen.getByTestId('keys-quickClip1')).toHaveTextContent('Cmd+Shift+1');
  });

  it('Esc cancels a recording and the recorder goes when another control is used', async () => {
    await mount();
    fireEvent.click(screen.getByTestId('keys-quickLook'));
    press({ key: 'Escape', code: 'Escape' });
    expect(screen.queryByTestId('recorder')).toBeNull();
    fireEvent.click(screen.getByTestId('keys-quickLook'));
    fireEvent.click(screen.getByTestId('toggle-hotkeys'));
    await flush();
    expect(screen.queryByTestId('recorder')).toBeNull();
  });

  it('changes nothing before the defaults have arrived', async () => {
    api().hotkeysGetDefaults.mockReturnValue(new Promise(() => {}));
    let model: ReturnType<typeof useHotkeys> | null = null;
    function Probe() {
      model = useHotkeys('linux');
      return null;
    }
    api().storageGetSettings.mockResolvedValue({
      maxClips: 100,
      startMinimized: false,
      autoStart: false,
    });
    render(
      <ToastProvider>
        <SettingsProvider>
          <Probe />
        </SettingsProvider>
      </ToastProvider>
    );
    await flush();
    await act(async () => {
      await (model as unknown as ReturnType<typeof useHotkeys>).setMaster(true);
    });
    expect(api().settingsChanged).not.toHaveBeenCalled();
    expect((model as unknown as ReturnType<typeof useHotkeys>).rows).toEqual([]);
  });

  it('waits for the defaults and survives a failure reading them', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    api().hotkeysGetDefaults.mockRejectedValueOnce(new Error('no ipc'));
    await mount();
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(error).toHaveBeenCalledWith('Failed to read the hotkey defaults:', expect.any(Error));
    error.mockRestore();
  });

  it('ignores failures on disabled rows and when the master is off', async () => {
    api().settingsChanged.mockResolvedValue({
      ok: false,
      failed: ['CommandOrControl+Shift+2'],
    } satisfies SettingsApplyResult);
    await mount({ quickClip2: { enabled: false, key: 'CommandOrControl+Shift+2' } });
    fireEvent.click(screen.getByTestId('toggle-quickClip3'));
    await flush();
    expect(screen.getByTestId('status-hk:quickClip2')).toHaveTextContent('');
    fireEvent.click(screen.getByTestId('toggle-hotkeys'));
    await flush();
    expect(screen.getByTestId('status-hk:quickClip2')).toHaveTextContent('');
  });
});
