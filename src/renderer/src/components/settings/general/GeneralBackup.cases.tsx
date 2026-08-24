import { fireEvent, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

type TestApi = () => Record<string, ReturnType<typeof vi.fn>>;

export function registerGeneralBackupCases(
  mount: () => Promise<void>,
  api: TestApi,
  flush: () => Promise<void>
) {
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
}
