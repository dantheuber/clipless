import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Privacy } from './Privacy';
import { SAVED_LABEL_MS } from './useSetting';

afterEach(cleanup);

describe('analytics consent', () => {
  it('explains the data sent and requires an explicit toggle to participate', async () => {
    render(<Privacy />);
    const toggle = screen.getByRole('switch', { name: 'Share usage counts' });
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).not.toBeChecked();
    expect(screen.getByText(/PostHog sees your connection/)).toBeVisible();
    expect(window.api.analyticsSetEnabled).not.toHaveBeenCalled();
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toBeChecked());
    expect(window.api.analyticsSetEnabled).toHaveBeenCalledWith(true);
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    expect(window.api.analyticsSetEnabled).toHaveBeenLastCalledWith(false);
  });

  it('keeps the switch on when an opt-out cannot be saved, including after a remount', async () => {
    // After a failed opt-out the main process keeps reporting the on-disk consent, which is on.
    vi.mocked(window.api.analyticsPreference).mockResolvedValue({ enabled: true, available: true });
    vi.mocked(window.api.analyticsSetEnabled).mockRejectedValueOnce(new Error('EROFS'));
    const { unmount } = render(<Privacy />);
    const toggle = screen.getByRole('switch', { name: 'Share usage counts' });
    await waitFor(() => expect(toggle).toBeChecked());
    const reads = vi.mocked(window.api.analyticsPreference).mock.calls.length;
    fireEvent.click(toggle);
    const status = await screen.findByTestId('status-usageAnalytics');
    await waitFor(() => expect(status).toHaveTextContent('not saved'));
    expect(status).toHaveAttribute('title', expect.stringContaining('may resume next launch'));
    expect(toggle).toBeChecked();
    expect(window.api.analyticsPreference).toHaveBeenCalledTimes(reads);
    expect(screen.queryByRole('alert')).toBeNull();
    unmount();
    render(<Privacy />);
    const remounted = screen.getByRole('switch', { name: 'Share usage counts' });
    await waitFor(() => expect(remounted).toBeEnabled());
    expect(remounted).toBeChecked();
  });

  it('clears the saved label after the shared delay', async () => {
    vi.useFakeTimers();
    try {
      render(<Privacy />);
      const toggle = screen.getByRole('switch', { name: 'Share usage counts' });
      await act(() => vi.advanceTimersByTimeAsync(0));
      fireEvent.click(toggle);
      await act(() => vi.advanceTimersByTimeAsync(0));
      expect(screen.getByTestId('status-usageAnalytics')).toHaveTextContent('saved');
      await act(() => vi.advanceTimersByTimeAsync(SAVED_LABEL_MS));
      expect(screen.getByTestId('status-usageAnalytics')).toHaveTextContent('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the control disabled if reading consent fails', async () => {
    vi.mocked(window.api.analyticsPreference).mockRejectedValueOnce(new Error('unreadable'));
    render(<Privacy />);
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByRole('switch')).toBeDisabled();
  });
});
