import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { UpdateBanner } from './UpdateBanner';
import type { UpdateState } from '../../../shared/types';

vi.mock('../providers/theme', () => ({
  useTheme: () => ({ isLight: false }),
}));

vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: ({ icon }: { icon: string }) => <i data-icon={icon} />,
}));

type StateCallback = (state: UpdateState) => void;

const setupOnState = (): {
  emit: (state: UpdateState) => void;
  unsubscribe: ReturnType<typeof vi.fn>;
} => {
  let cb: StateCallback = () => {};
  const unsubscribe = vi.fn();
  (window.api.onUpdateState as ReturnType<typeof vi.fn>).mockImplementation(
    (callback: StateCallback) => {
      cb = callback;
      return unsubscribe;
    }
  );
  return { emit: (state) => act(() => cb(state)), unsubscribe };
};

const flush = () => act(async () => {});

beforeEach(() => {
  vi.clearAllMocks();
  (window.api.getUpdateState as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'idle' });
});

afterEach(() => {
  cleanup();
});

describe('UpdateBanner', () => {
  it('subscribes on mount and unsubscribes on unmount', async () => {
    const { unsubscribe } = setupOnState();
    const { unmount } = render(<UpdateBanner />);
    await flush();
    expect(window.api.onUpdateState).toHaveBeenCalledTimes(1);
    expect(window.api.getUpdateState).toHaveBeenCalledTimes(1);
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('renders hidden by default and reveals the version once downloaded', async () => {
    const { emit } = setupOnState();
    const { container } = render(<UpdateBanner />);
    await flush();
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).not.toMatch(/visible/);

    emit({ status: 'available', version: '1.2.3' });
    expect(wrapper.className).not.toMatch(/visible/);

    emit({ status: 'downloaded', version: '1.2.3' });
    expect(wrapper.className).toMatch(/visible/);
    expect(screen.getByText('Version 1.2.3 available!')).toBeInTheDocument();
  });

  it('shows an update that downloaded before the banner mounted', async () => {
    setupOnState();
    (window.api.getUpdateState as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'downloaded',
      version: '9.9.9',
    });
    const { container } = render(<UpdateBanner />);
    await flush();
    expect((container.firstChild as HTMLElement).className).toMatch(/visible/);
  });

  it('logs when the initial state read fails', async () => {
    setupOnState();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (window.api.getUpdateState as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ipc'));
    render(<UpdateBanner />);
    await flush();
    expect(errSpy).toHaveBeenCalledWith('Failed to read update state:', expect.any(Error));
    errSpy.mockRestore();
  });

  it('calls window.api.quitAndInstall when Restart Now is clicked', async () => {
    const { emit } = setupOnState();
    render(<UpdateBanner />);
    await flush();
    emit({ status: 'downloaded', version: '1.2.3' });

    fireEvent.click(screen.getByRole('button', { name: 'Restart Now' }));
    expect(window.api.quitAndInstall).toHaveBeenCalledTimes(1);
  });

  it('logs and recovers when quitAndInstall fails', async () => {
    const { emit } = setupOnState();
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (window.api.quitAndInstall as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('install fail')
    );

    render(<UpdateBanner />);
    await flush();
    emit({ status: 'downloaded', version: '1.2.3' });

    fireEvent.click(screen.getByRole('button', { name: 'Restart Now' }));
    await flush();

    expect(errSpy).toHaveBeenCalledWith('Failed to restart for update:', expect.any(Error));
    errSpy.mockRestore();
  });

  it('hides the banner when dismiss is clicked and re-shows for a newer version', async () => {
    const { emit } = setupOnState();
    const { container } = render(<UpdateBanner />);
    await flush();
    emit({ status: 'downloaded', version: '1.2.3' });
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toMatch(/visible/);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss update notification' }));
    expect(wrapper.className).not.toMatch(/visible/);

    emit({ status: 'downloaded', version: '1.2.3' });
    expect(wrapper.className).not.toMatch(/visible/);

    emit({ status: 'downloaded', version: '1.2.4' });
    expect(wrapper.className).toMatch(/visible/);
    expect(screen.getByText('Version 1.2.4 available!')).toBeInTheDocument();
  });

  it('treats a downloaded state without a version as an empty version', async () => {
    const { emit } = setupOnState();
    const { container } = render(<UpdateBanner />);
    await flush();
    emit({ status: 'downloaded' });
    expect((container.firstChild as HTMLElement).className).toMatch(/visible/);
  });
});
