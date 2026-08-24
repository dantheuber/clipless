import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import type { UpdateState, UserSettings } from '../../../../../shared/types';
import { ToastProvider } from '../../Toast';
import { ScanIndexProvider } from '../../../providers/scan';
import { SettingsProvider } from './SettingsProvider';
import { General } from './General';
import { platformLine } from './platform';
import { registerGeneralBackupCases } from './GeneralBackup.cases';
import { registerGeneralStorageCases } from './GeneralStorage.cases';

const api = () => window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const flush = () => act(async () => {});

const stored: UserSettings = {
  maxClips: 100,
  startMinimized: false,
  autoStart: false,
  theme: 'system',
  windowTransparency: 20,
  transparencyEnabled: false,
  opaqueWhenFocused: true,
  alwaysOnTop: false,
  rememberWindowPosition: true,
  showNotifications: false,
  codeDetectionEnabled: true,
  showLanguageLabel: true,
  automaticUpdates: true,
};

const mount = async () => {
  render(
    <ToastProvider>
      <SettingsProvider>
        <ScanIndexProvider>
          <General />
        </ScanIndexProvider>
      </SettingsProvider>
    </ToastProvider>
  );
  await flush();
};

let updateListener: (state: UpdateState) => void = () => {};

beforeEach(() => {
  vi.clearAllMocks();
  api().storageGetSettings.mockResolvedValue({ ...stored });
  api().getAutoStartState.mockResolvedValue(null);
  api().settingsChanged.mockResolvedValue({ ok: true, failed: [] });
  api().storageGetStats.mockResolvedValue({ clipCount: 87, lockedCount: 4, dataSize: 217088 });
  api().getUpdateState.mockResolvedValue({ status: 'idle' });
  api().onUpdateState.mockImplementation((cb: (state: UpdateState) => void) => {
    updateListener = cb;
    return () => {};
  });
  api().searchTermsGetAll.mockResolvedValue([
    { id: 't', name: 'IP', pattern: '(?<ip>x)', enabled: true },
  ]);
  api().quickToolsGetAll.mockResolvedValue([]);
  api().templatesGetAll.mockResolvedValue([]);
  (window.api as unknown as { platform: string }).platform = 'win32';
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('General', () => {
  it('shows the five panels and the footer links', async () => {
    await mount();
    for (const name of ['application', 'window', 'storage', 'updates', 'about']) {
      expect(screen.getByTestId(`panel-${name}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('footer')).toHaveTextContent('Changes apply as you make them.');
    expect(screen.getByTestId('export-data')).toBeInTheDocument();
    expect(screen.getByTestId('import-data')).toBeInTheDocument();
    expect(screen.getByTestId('clear-all')).toBeInTheDocument();
  });

  it('applies a toggle at once and shows saved beside it only', async () => {
    await mount();
    fireEvent.click(screen.getByTestId('toggle-startMinimized'));
    await flush();
    expect(api().settingsChanged).toHaveBeenCalledWith(
      expect.objectContaining({ startMinimized: true })
    );
    expect(screen.getByTestId('status-startMinimized')).toHaveTextContent('saved');
    expect(screen.getByTestId('status-alwaysOnTop')).toHaveTextContent('');
    expect(screen.queryByTestId('toast')).toBeNull();
  });

  it('hides Start with the system on Linux and shows it elsewhere', async () => {
    await mount();
    expect(screen.getByTestId('row-autoStart')).toBeInTheDocument();
    cleanup();
    (window.api as unknown as { platform: string }).platform = 'linux';
    await mount();
    expect(screen.queryByTestId('row-autoStart')).toBeNull();
  });

  it('dims the language label row while code detection is off', async () => {
    await mount();
    expect(screen.getByTestId('toggle-showLanguageLabel')).not.toBeDisabled();

    fireEvent.click(screen.getByTestId('toggle-codeDetectionEnabled'));
    await flush();
    expect(api().settingsChanged).toHaveBeenCalledWith(
      expect.objectContaining({ codeDetectionEnabled: false })
    );
    expect(screen.getByTestId('toggle-showLanguageLabel')).toBeDisabled();
  });

  it('writes the language label setting through its toggle', async () => {
    await mount();
    fireEvent.click(screen.getByTestId('toggle-showLanguageLabel'));
    await flush();
    expect(api().settingsChanged).toHaveBeenCalledWith(
      expect.objectContaining({ showLanguageLabel: false })
    );
  });

  it('changes the theme through the select', async () => {
    await mount();
    fireEvent.change(screen.getByTestId('theme-select'), { target: { value: 'light' } });
    await flush();
    expect(api().settingsChanged).toHaveBeenCalledWith(expect.objectContaining({ theme: 'light' }));
  });

  it('dims the transparency rows while transparency is off, and writes the level on release', async () => {
    await mount();
    const slider = screen.getByTestId('transparency-level');
    expect(slider).toBeDisabled();
    expect(screen.getByTestId('toggle-opaqueWhenFocused')).toBeDisabled();

    fireEvent.click(screen.getByTestId('toggle-transparencyEnabled'));
    await flush();
    expect(slider).not.toBeDisabled();

    fireEvent.change(slider, { target: { value: '45' } });
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(api().settingsChanged).not.toHaveBeenCalledWith(
      expect.objectContaining({ windowTransparency: 45 })
    );
    fireEvent.mouseUp(slider);
    await flush();
    expect(api().settingsChanged).toHaveBeenCalledWith(
      expect.objectContaining({ windowTransparency: 45 })
    );
    const calls = api().settingsChanged.mock.calls.length;
    fireEvent.keyUp(slider);
    fireEvent.blur(slider);
    fireEvent.touchEnd(slider);
    expect(api().settingsChanged.mock.calls.length).toBe(calls);
  });

  registerGeneralStorageCases(mount, api, flush, (state) => updateListener(state as UpdateState));
  registerGeneralBackupCases(mount, api, flush);
});

describe('useStats', () => {
  it('throws outside its provider', async () => {
    const { useStats } = await import('./stats');
    function Probe() {
      useStats();
      return null;
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/within StatsProvider/);
    spy.mockRestore();
  });
});

describe('platformLine', () => {
  it('names the platform and arch', () => {
    expect(platformLine('linux', 'x64')).toBe('Linux x64');
    expect(platformLine('darwin', 'arm64')).toBe('macOS arm64');
    expect(platformLine('freebsd', 'x64')).toBe('freebsd x64');
  });
});
