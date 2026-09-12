import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AnalyticsPrompt } from './AnalyticsPrompt';

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      }),
    },
    close: {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.removeAttribute('open');
      }),
    },
  });
  vi.mocked(window.api.analyticsPreference).mockResolvedValue({
    enabled: false,
    available: true,
    needsPrompt: true,
  });
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  vi.restoreAllMocks();
});

describe('first-launch analytics choice', () => {
  it.each([
    ['Send analytics', true],
    ['No thanks', false],
  ] as const)('only saves a choice when the user selects %s', async (label, enabled) => {
    render(<AnalyticsPrompt />);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('100% opt-in');
    expect(window.api.analyticsSetEnabled).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: label }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(window.api.analyticsSetEnabled).toHaveBeenCalledWith(enabled);
  });

  it('treats Escape as a saved decline', async () => {
    render(<AnalyticsPrompt />);
    const dialog = await screen.findByRole('dialog');
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    await waitFor(() => expect(window.api.analyticsSetEnabled).toHaveBeenCalledWith(false));
  });

  it.each([
    { enabled: false, available: true, needsPrompt: false },
    { enabled: true, available: true, needsPrompt: false },
    { enabled: false, available: false, needsPrompt: true },
  ])('does not prompt when already decided or reporting is unavailable: %j', async (preference) => {
    vi.mocked(window.api.analyticsPreference).mockResolvedValue(preference);
    render(<AnalyticsPrompt />);
    await waitFor(() => expect(window.api.analyticsPreference).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
  });

  it('keeps the prompt open with retryable choices if saving fails', async () => {
    vi.mocked(window.api.analyticsSetEnabled).mockRejectedValueOnce(new Error('disk'));
    render(<AnalyticsPrompt />);
    fireEvent.click(await screen.findByRole('button', { name: 'No thanks' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save your choice');
    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'No thanks' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
