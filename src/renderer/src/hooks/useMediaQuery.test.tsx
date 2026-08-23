import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { useMediaQuery, NARROW_WINDOW, SHORT_WINDOW } from './useMediaQuery';

function Probe({ query }: { query: string }) {
  return <div data-testid="m">{useMediaQuery(query) ? 'yes' : 'no'}</div>;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useMediaQuery', () => {
  it('reads the initial match and follows change events', () => {
    let listener: (() => void) | null = null;
    const list = {
      matches: false,
      addEventListener: vi.fn((_: string, cb: () => void) => {
        listener = cb;
      }),
      removeEventListener: vi.fn(),
    };
    vi.spyOn(window, 'matchMedia').mockReturnValue(list as unknown as MediaQueryList);
    const { unmount } = render(<Probe query={NARROW_WINDOW} />);
    expect(screen.getByTestId('m')).toHaveTextContent('no');
    list.matches = true;
    act(() => listener?.());
    expect(screen.getByTestId('m')).toHaveTextContent('yes');
    unmount();
    expect(list.removeEventListener).toHaveBeenCalled();
    expect(SHORT_WINDOW).toContain('max-height');
  });
});
