import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import { useOpenQuickLookSignal } from './useOpenQuickLookSignal';

const api = () => window.api as unknown as Record<string, ReturnType<typeof vi.fn>>;

let openHandler: (payload: { pending: boolean }) => void = () => {};
let clipboardHandler: () => void = () => {};
const onOpen = vi.fn();

function Probe() {
  useOpenQuickLookSignal(onOpen);
  return null;
}

beforeEach(() => {
  onOpen.mockClear();
  api().onOpenQuickLook.mockImplementation((cb: typeof openHandler) => {
    openHandler = cb;
    return () => {};
  });
  api().onClipboardChanged.mockImplementation((cb: typeof clipboardHandler) => {
    clipboardHandler = cb;
    return () => {};
  });
});

afterEach(cleanup);

describe('useOpenQuickLookSignal', () => {
  it('opens at once when no clipboard change is pending', () => {
    render(<Probe />);
    act(() => openHandler({ pending: false }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('waits for the pending clipboard-changed, then opens once', () => {
    render(<Probe />);
    act(() => openHandler({ pending: true }));
    expect(onOpen).not.toHaveBeenCalled();
    act(() => clipboardHandler());
    expect(onOpen).toHaveBeenCalledTimes(1);
    act(() => clipboardHandler());
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('ignores clipboard changes when nothing is awaited', () => {
    render(<Probe />);
    act(() => clipboardHandler());
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('calls the latest onOpen', () => {
    const first = vi.fn();
    const second = vi.fn();
    function Dynamic({ cb }: { cb: () => void }) {
      useOpenQuickLookSignal(cb);
      return null;
    }
    const { rerender } = render(<Dynamic cb={first} />);
    rerender(<Dynamic cb={second} />);
    act(() => openHandler({ pending: false }));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('does nothing without the preload methods', () => {
    const saved = window.api;
    Object.defineProperty(window, 'api', { value: {}, writable: true });
    expect(() => render(<Probe />)).not.toThrow();
    Object.defineProperty(window, 'api', { value: saved, writable: true });
  });
});
