import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { UpdateBanner } from './UpdateBanner';

vi.mock('../providers/theme', () => ({
  useTheme: () => ({ isLight: false }),
}));

vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: ({ icon }: { icon: string }) => <i data-icon={icon} />,
}));

type UpdateCallback = (info: { version: string }) => void;

const setupOnUpdate = (): {
  emit: (info: { version: string }) => void;
  unsubscribe: ReturnType<typeof vi.fn>;
} => {
  let cb: UpdateCallback = () => {};
  const unsubscribe = vi.fn();
  (window.api.onUpdateDownloaded as ReturnType<typeof vi.fn>).mockImplementation(
    (callback: UpdateCallback) => {
      cb = callback;
      return unsubscribe;
    }
  );
  return { emit: (info) => act(() => cb(info)), unsubscribe };
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('UpdateBanner', () => {
  it('subscribes on mount and unsubscribes on unmount', () => {
    const { unsubscribe } = setupOnUpdate();
    const { unmount } = render(<UpdateBanner />);
    expect(window.api.onUpdateDownloaded).toHaveBeenCalledTimes(1);
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('renders hidden by default and reveals the version when an update arrives', () => {
    const { emit } = setupOnUpdate();
    const { container } = render(<UpdateBanner />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).not.toMatch(/visible/);

    emit({ version: '1.2.3' });

    expect(wrapper.className).toMatch(/visible/);
    expect(screen.getByText('Version 1.2.3 available!')).toBeInTheDocument();
  });

  it('calls window.api.quitAndInstall when Restart Now is clicked', async () => {
    const { emit } = setupOnUpdate();
    render(<UpdateBanner />);
    emit({ version: '1.2.3' });

    fireEvent.click(screen.getByRole('button', { name: 'Restart Now' }));
    expect(window.api.quitAndInstall).toHaveBeenCalledTimes(1);
  });

  it('logs and recovers when quitAndInstall fails', async () => {
    const { emit } = setupOnUpdate();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (window.api.quitAndInstall as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('install fail')
    );

    render(<UpdateBanner />);
    emit({ version: '1.2.3' });

    fireEvent.click(screen.getByRole('button', { name: 'Restart Now' }));
    await Promise.resolve();
    await Promise.resolve();

    expect(errSpy).toHaveBeenCalledWith('Failed to restart for update:', expect.any(Error));
    errSpy.mockRestore();
  });

  it('hides the banner when dismiss is clicked', () => {
    const { emit } = setupOnUpdate();
    const { container } = render(<UpdateBanner />);
    emit({ version: '1.2.3' });
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toMatch(/visible/);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss update notification' }));
    expect(wrapper.className).not.toMatch(/visible/);
  });

  it('re-shows after dismiss when a new update arrives', () => {
    const { emit } = setupOnUpdate();
    const { container } = render(<UpdateBanner />);
    emit({ version: '1.2.3' });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss update notification' }));
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).not.toMatch(/visible/);

    emit({ version: '1.2.4' });
    expect(wrapper.className).toMatch(/visible/);
    expect(screen.getByText('Version 1.2.4 available!')).toBeInTheDocument();
  });
});
