import { act, fireEvent, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

type TestApi = () => Record<string, ReturnType<typeof vi.fn>>;

export function registerGeneralStorageCases(
  mount: () => Promise<void>,
  api: TestApi,
  flush: () => Promise<void>,
  emitUpdate: (state: unknown) => void
) {
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

    act(() => emitUpdate({ status: 'downloaded', version: '2.0.0' }));
    expect(screen.getByTestId('update-head')).toHaveTextContent('2.0.0 downloaded');
    fireEvent.click(screen.getByText('Restart and install'));
    await flush();
    expect(api().quitAndInstall).toHaveBeenCalled();
    expect(screen.getByTestId('toast')).toHaveTextContent('Restarting');

    act(() => emitUpdate({ status: 'checking' }));
    expect(screen.getByText('Check now')).toBeDisabled();
  });

  it('does not download when the check finds nothing, and installs without a version', async () => {
    api().checkForUpdates.mockResolvedValue(null);
    await mount();
    fireEvent.click(screen.getByText('Check now'));
    await flush();
    expect(api().downloadUpdate).not.toHaveBeenCalled();
    act(() => emitUpdate({ status: 'downloaded' }));
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
    act(() => emitUpdate({ status: 'downloaded', version: '2.0.0' }));
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
    fireEvent.change(input, { target: { files: [] } });
  });
}
