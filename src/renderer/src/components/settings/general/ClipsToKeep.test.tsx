import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { ClipsToKeep, clipsToKeepLoss, parseClipsToKeep } from './ClipsToKeep';
import { SettingsProvider } from './SettingsProvider';
import { StatsProvider } from './stats';

const api = () => window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const flush = () => act(async () => {});

const mount = async () => {
  render(
    <SettingsProvider>
      <StatsProvider>
        <ClipsToKeep />
      </StatsProvider>
    </SettingsProvider>
  );
  await flush();
};

beforeEach(() => {
  vi.clearAllMocks();
  api().storageGetSettings.mockResolvedValue({
    maxClips: 100,
    startMinimized: false,
    autoStart: false,
  });
  api().storageGetStats.mockResolvedValue({ clipCount: 87, lockedCount: 4, dataSize: 2048 });
  api().settingsChanged.mockResolvedValue({ ok: true, failed: [] });
});

afterEach(cleanup);

describe('parseClipsToKeep', () => {
  it('accepts whole numbers from 15 to 100 only', () => {
    expect(parseClipsToKeep('15')).toBe(15);
    expect(parseClipsToKeep(' 100 ')).toBe(100);
    expect(parseClipsToKeep('14')).toBeNull();
    expect(parseClipsToKeep('101')).toBeNull();
    expect(parseClipsToKeep('5e1')).toBeNull();
    expect(parseClipsToKeep('')).toBeNull();
  });
});

describe('clipsToKeepLoss', () => {
  it('counts the oldest unlocked clips first and locked ones only past the limit', () => {
    expect(clipsToKeepLoss(87, 4, 50)).toEqual({ unlocked: 37, locked: 0 });
    expect(clipsToKeepLoss(87, 4, 90)).toEqual({ unlocked: 0, locked: 0 });
    expect(clipsToKeepLoss(30, 20, 15)).toEqual({ unlocked: 10, locked: 5 });
  });
});

describe('ClipsToKeep', () => {
  it('commits on Enter', async () => {
    await mount();
    const input = screen.getByTestId('clips-to-keep');
    fireEvent.change(input, { target: { value: '90' } });
    expect(api().settingsChanged).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    await flush();
    expect(api().settingsChanged).toHaveBeenCalledWith(expect.objectContaining({ maxClips: 90 }));
    expect(screen.getByTestId('status-maxClips')).toHaveTextContent('saved');
  });

  it('commits on blur', async () => {
    await mount();
    const input = screen.getByTestId('clips-to-keep');
    fireEvent.change(input, { target: { value: '95' } });
    fireEvent.blur(input);
    await flush();
    expect(api().settingsChanged).toHaveBeenCalledWith(expect.objectContaining({ maxClips: 95 }));
  });

  it('shows 15 to 100 in red for an out of range value and does not apply it', async () => {
    await mount();
    const input = screen.getByTestId('clips-to-keep');
    fireEvent.change(input, { target: { value: '7' } });
    expect(screen.getByText('15 to 100')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);
    await flush();
    expect(api().settingsChanged).not.toHaveBeenCalled();
    expect(input).toHaveValue(7);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue(100);
  });

  it('asks once with the numbers when the value is below the clip count', async () => {
    await mount();
    const input = screen.getByTestId('clips-to-keep');
    fireEvent.change(input, { target: { value: '50' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Keep 50 clips?');
    expect(dialog).toHaveTextContent('You have 87');
    expect(dialog).toHaveTextContent('37 oldest unlocked');
    expect(dialog).toHaveTextContent('Locked clips (4) stay');
    expect(api().settingsChanged).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Delete 37 clips'));
    await flush();
    expect(api().settingsChanged).toHaveBeenCalledWith(expect.objectContaining({ maxClips: 50 }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('undo')).toBeNull();
  });

  it('names locked clips past the limit, and cancel keeps the old value', async () => {
    api().storageGetStats.mockResolvedValue({ clipCount: 30, lockedCount: 20, dataSize: 10 });
    await mount();
    const input = screen.getByTestId('clips-to-keep');
    fireEvent.change(input, { target: { value: '15' } });
    fireEvent.blur(input);
    expect(screen.getByRole('dialog')).toHaveTextContent('5 of the 20 locked');
    fireEvent.click(screen.getByText('Cancel'));
    await flush();
    expect(api().settingsChanged).not.toHaveBeenCalled();
    expect(input).toHaveValue(100);
  });

  it('does nothing when the value did not change', async () => {
    await mount();
    const input = screen.getByTestId('clips-to-keep');
    fireEvent.change(input, { target: { value: '90' } });
    fireEvent.change(input, { target: { value: '100' } });
    fireEvent.blur(input);
    fireEvent.blur(input);
    await flush();
    expect(api().settingsChanged).not.toHaveBeenCalled();
  });
});
