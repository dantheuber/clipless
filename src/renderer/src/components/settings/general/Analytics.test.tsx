import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Analytics } from './Analytics';

afterEach(cleanup);

describe('analytics consent', () => {
  it('explains the data sent and requires an explicit toggle to participate', async () => {
    render(<Analytics />);
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

  it('shows the switch as still on when an opt-out cannot be saved', async () => {
    vi.mocked(window.api.analyticsPreference).mockResolvedValue({ enabled: true, available: true });
    vi.mocked(window.api.analyticsSetEnabled).mockRejectedValueOnce(new Error('EROFS'));
    render(<Analytics />);
    const toggle = screen.getByRole('switch', { name: 'Share usage counts' });
    await waitFor(() => expect(toggle).toBeChecked());
    fireEvent.click(toggle);
    const status = await screen.findByTestId('status-usageAnalytics');
    await waitFor(() => expect(status).toHaveTextContent('not saved'));
    expect(status).toHaveAttribute('title', expect.stringContaining('may resume next launch'));
    expect(toggle).toBeChecked();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('keeps the control disabled if reading consent fails', async () => {
    vi.mocked(window.api.analyticsPreference).mockRejectedValueOnce(new Error('unreadable'));
    render(<Analytics />);
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByRole('switch')).toBeDisabled();
  });
});
