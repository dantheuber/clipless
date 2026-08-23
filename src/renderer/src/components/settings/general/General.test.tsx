import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import type { UpdateState, UserSettings } from '../../../../../shared/types';
import { ToastProvider } from '../../Toast';
import { ScanIndexProvider } from '../../../providers/scan';
import { SettingsProvider } from './SettingsProvider';
import { General } from './General';
import { platformLine } from './About';

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
    // a release with no change writes nothing more
    const calls = api().settingsChanged.mock.calls.length;
    fireEvent.keyUp(slider);
    fireEvent.blur(slider);
    fireEvent.touchEnd(slider);
    expect(api().settingsChanged.mock.calls.length).toBe(calls);
  });

  it('shows the clip count against the limit, the bar, the locked count and the size', async () => {
    await mount();
    const panel = screen.getByTestId('storage-panel');
    expect(screen.getByTestId('clip-count')).toHaveTextContent('87');
    expect(panel).toHaveTextContent('of 100 clips');
    expect(panel).toHaveTextContent('4 locked');
    expect(panel).toHaveTextContent('212 KB on disk');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '87');

    api().storageGetStats.mockResolvedValue({ clipCount: 95, lockedCount: 4, dataSize: 1 });
    vi.useFakeTimers();
    fireEvent.click(screen.getByText('refresh'));
    await flush();
    expect(screen.getByTestId('clip-count')).toHaveTextContent('95');
    expect(screen.getByText('refreshed')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.queryByText('refreshed')).toBeNull();
    vi.useRealTimers();
  });

  it('renders the updater state and drives the one button', async () => {
    api().checkForUpdates.mockResolvedValue({ version: '2.0.0' });
    await mount();
    expect(screen.getByTestId('update-head')).toHaveTextContent('Clipless 0.0.0-test');
    fireEvent.click(screen.getByText('Check now'));
    await flush();
    expect(api().checkForUpdates).toHaveBeenCalled();
    expect(api().downloadUpdate).toHaveBeenCalled();

    act(() => updateListener({ status: 'downloaded', version: '2.0.0' }));
    expect(screen.getByTestId('update-head')).toHaveTextContent('2.0.0 downloaded');
    fireEvent.click(screen.getByText('Restart and install'));
    await flush();
    expect(api().quitAndInstall).toHaveBeenCalled();
    expect(screen.getByTestId('toast')).toHaveTextContent('Restarting');

    act(() => updateListener({ status: 'checking' }));
    expect(screen.getByText('Check now')).toBeDisabled();
  });

  it('does not download when the check finds nothing, and installs without a version', async () => {
    api().checkForUpdates.mockResolvedValue(null);
    await mount();
    fireEvent.click(screen.getByText('Check now'));
    await flush();
    expect(api().downloadUpdate).not.toHaveBeenCalled();
    act(() => updateListener({ status: 'downloaded' }));
    fireEvent.click(screen.getByText('Restart and install'));
    await flush();
    expect(screen.getByTestId('toast')).toHaveTextContent('to install the update');
  });

  it('keeps going when the check or the install throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    api().checkForUpdates.mockRejectedValue(new Error('offline'));
    api().quitAndInstall.mockRejectedValue(new Error('nope'));
    await mount();
    fireEvent.click(screen.getByText('Check now'));
    await flush();
    expect(error).toHaveBeenCalledWith('Update check failed:', expect.any(Error));
    act(() => updateListener({ status: 'downloaded', version: '2.0.0' }));
    fireEvent.click(screen.getByText('Restart and install'));
    await flush();
    expect(error).toHaveBeenCalledWith('Install failed:', expect.any(Error));
  });

  it('offers the releases page instead of a button on macOS', async () => {
    (window.api as unknown as { platform: string }).platform = 'darwin';
    await mount();
    expect(screen.queryByText('Check now')).toBeNull();
    fireEvent.click(screen.getByText('get the latest from releases'));
    await flush();
    expect(api().openExternalUrls).toHaveBeenCalledWith([
      'https://github.com/dantheuber/clipless/releases',
    ]);
  });

  it('shows the versions and opens the folders and release notes', async () => {
    api().openAppPath.mockResolvedValueOnce('').mockResolvedValueOnce('no such folder');
    await mount();
    expect(screen.getByTestId('about-panel')).toHaveTextContent('Clipless 0.0.0-test');
    expect(screen.getByTestId('about-panel')).toHaveTextContent('Windows x64');
    fireEvent.click(screen.getByText('release notes'));
    expect(api().openExternalUrls).toHaveBeenCalledWith([
      'https://github.com/dantheuber/clipless/releases/tag/v0.0.0-test',
    ]);
    fireEvent.click(screen.getByText('data folder'));
    await flush();
    expect(api().openAppPath).toHaveBeenCalledWith('data');
    expect(screen.queryByTestId('toast')).toBeNull();
    fireEvent.click(screen.getByText('log'));
    await flush();
    expect(screen.getByTestId('toast')).toHaveTextContent('no such folder');
  });

  it('exports a backup named by the date and toasts the name and size', async () => {
    api().storageExportData.mockResolvedValue('{"clips":[]}');
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:x', revokeObjectURL: () => {} });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await mount();
    fireEvent.click(screen.getByTestId('export-data'));
    await flush();
    expect(screen.getByTestId('toast')).toHaveTextContent(
      /Saved.*clipless-backup-\d{4}-\d{2}-\d{2}\.json/
    );
    vi.unstubAllGlobals();
  });

  it('reports an export failure as a toast, whatever was thrown', async () => {
    api().storageExportData.mockRejectedValueOnce(new Error('disk')).mockRejectedValueOnce('plain');
    await mount();
    fireEvent.click(screen.getByTestId('export-data'));
    await flush();
    expect(screen.getByTestId('toast')).toHaveTextContent('Export failed');
    fireEvent.click(screen.getByTestId('export-data'));
    await flush();
    expect(screen.getAllByTestId('toast').pop()).toHaveTextContent('plain');
  });

  it('survives a failed update state read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    api().getUpdateState.mockRejectedValue(new Error('ipc'));
    await mount();
    expect(error).toHaveBeenCalledWith('Failed to read update state:', expect.any(Error));
  });

  it('previews an import, says it replaces and restarts, then imports and restarts', async () => {
    await mount();
    const input = screen.getByTestId('import-file') as HTMLInputElement;
    const click = vi.spyOn(input, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByTestId('import-data'));
    expect(click).toHaveBeenCalled();
    const file = new File(
      [
        JSON.stringify({
          clips: [{ isLocked: true }, {}],
          settings: { hotkeys: { a: {}, b: {} } },
          searchTerms: [{}],
        }),
      ],
      'clipless-backup.json',
      { type: 'application/json' }
    );
    fireEvent.change(input, { target: { files: [file] } });
    await flush();
    await flush();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('clipless-backup.json');
    expect(dialog).toHaveTextContent(
      'Holds 2 clips (1 locked), settings, 2 shortcuts, 1 search terms'
    );
    expect(dialog).toHaveTextContent('replaces what is here now and restarts Clipless');
    fireEvent.click(screen.getByText('Replace and restart'));
    await flush();
    expect(api().storageImportData).toHaveBeenCalledWith(expect.any(String));
    expect(api().restartApp).toHaveBeenCalled();
    expect(screen.getByTestId('toast')).toHaveTextContent('Imported');
  });

  it('keeps an unreadable file and a failed import inline', async () => {
    await mount();
    const input = screen.getByTestId('import-file') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['nope'], 'x.json')] } });
    await flush();
    await flush();
    expect(screen.getByRole('dialog')).toHaveTextContent('Not a JSON file.');
    expect(screen.getByText('Replace and restart')).toBeDisabled();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByRole('dialog')).toBeNull();

    api().storageImportData.mockResolvedValueOnce(false);
    fireEvent.change(input, { target: { files: [new File(['{"clips":[]}'], 'y.json')] } });
    await flush();
    await flush();
    fireEvent.click(screen.getByText('Replace and restart'));
    await flush();
    expect(screen.getByRole('dialog')).toHaveTextContent('did not complete');
    expect(api().restartApp).not.toHaveBeenCalled();

    api().storageImportData.mockRejectedValueOnce(new Error('bad format'));
    fireEvent.click(screen.getByText('Replace and restart'));
    await flush();
    expect(screen.getByRole('dialog')).toHaveTextContent('bad format');
    // picking nothing changes nothing
    fireEvent.change(input, { target: { files: [] } });
  });

  it('clear all names the counts and size, offers export first, and re-applies the defaults', async () => {
    api().storageExportData.mockResolvedValue('{}');
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:x', revokeObjectURL: () => {} });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await mount();
    fireEvent.click(screen.getByTestId('clear-all'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('87 clips');
    expect(dialog).toHaveTextContent('4 of them locked');
    expect(dialog).toHaveTextContent('all 8 shortcuts');
    expect(dialog).toHaveTextContent('search term (1)');
    expect(dialog).toHaveTextContent('212 KB on disk');
    expect(dialog).toHaveTextContent('There is no undo');

    fireEvent.click(within(dialog).getByText('export first'));
    await flush();
    expect(api().storageExportData).toHaveBeenCalled();

    api().storageGetStats.mockResolvedValue({ clipCount: 0, lockedCount: 0, dataSize: 0 });
    fireEvent.click(screen.getByText('Delete everything'));
    await flush();
    expect(api().storageClearAll).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getAllByTestId('toast').pop()).toHaveTextContent('Cleared');
    expect(screen.getByTestId('clip-count')).toHaveTextContent('0');
    expect(api().settingsChanged).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('keeps a failed clear inline, and cancel closes it', async () => {
    api().storageClearAll.mockResolvedValueOnce(false);
    await mount();
    fireEvent.click(screen.getByTestId('clear-all'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByTestId('clear-all'));
    fireEvent.click(screen.getByText('Delete everything'));
    await flush();
    expect(screen.getByRole('dialog')).toHaveTextContent('could not delete');
    api().storageClearAll.mockRejectedValueOnce(new Error('locked file'));
    fireEvent.click(screen.getByText('Delete everything'));
    await flush();
    expect(screen.getByRole('dialog')).toHaveTextContent('locked file');
  });

  it('survives a stats read failure', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    api().storageGetStats.mockRejectedValue(new Error('stat'));
    await mount();
    expect(screen.getByTestId('clip-count')).toHaveTextContent('–');
    expect(error).toHaveBeenCalledWith('Failed to read storage stats:', expect.any(Error));
    fireEvent.click(screen.getByTestId('clear-all'));
    expect(screen.getByRole('dialog')).toHaveTextContent('Deletes 0 clips');
    fireEvent.click(screen.getByText('Delete everything'));
    await flush();
    expect(screen.getAllByTestId('toast').pop()).toHaveTextContent('0 clips');
  });
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
