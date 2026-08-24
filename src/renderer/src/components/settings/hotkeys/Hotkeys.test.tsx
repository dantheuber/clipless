import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import type { HotkeySettings } from '../../../../../shared/types';
import { ToastProvider } from '../../Toast';
import { SettingsProvider } from '../general/SettingsProvider';
import { Hotkeys } from './Hotkeys';
import { hotkeySettings } from './hotkeyFixtures';
import { registerHotkeyConflictCases } from './HotkeyConflict.cases';

const api = () => window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const flush = () => act(async () => {});

const defaults = hotkeySettings(false);

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
    expect(lastHotkeys().focusWindow.key).toBe('CommandOrControl+Shift+V');
    fireEvent.click(within(screen.getByTestId('status-hk:focusWindow')).getByText('retry'));
    await flush();
    expect(screen.getByTestId('keys-focusWindow')).toHaveTextContent('Ctrl+Shift+K');
  });

  registerHotkeyConflictCases(mount, api, flush, press, lastHotkeys);
});
