import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Chip } from './Chip';

const { pinsState } = vi.hoisted(() => ({
  pinsState: {
    pinned: new Set<string>(),
    togglePins: vi.fn(),
  },
}));

vi.mock('../../../providers/clips', async () =>
  (await import('./clipTestFixtures')).pinnedClipHooks(
    (key) => pinsState.pinned.has(key),
    pinsState.togglePins
  )
);

vi.mock('../../../providers/scan', () => ({
  useScanIndex: () => ({ slotFor: (group: string) => (group === 'ip' ? 0 : 5) }),
}));

beforeEach(() => {
  pinsState.pinned = new Set();
  pinsState.togglePins.mockClear();
});

afterEach(cleanup);

describe('Chip', () => {
  it('renders the value with its group colour slot as --gc', () => {
    render(<Chip group="user" value="admin" />);
    const chip = screen.getByText('admin').closest('span[data-key]') as HTMLElement;
    expect(chip.style.getPropertyValue('--gc')).toBe('var(--slot-5)');
    expect(chip).toHaveAttribute('data-key', 'user|admin');
    expect(chip).not.toHaveAttribute('data-pinned');
    expect(chip.title).toBe('Pin user admin');
  });

  it('click toggles the pin and stops the click from reaching the row (never enters edit)', () => {
    const rowClick = vi.fn();
    render(
      <div onClick={rowClick}>
        <Chip group="ip" value="1.1.1.1" />
      </div>
    );
    fireEvent.click(screen.getByText('1.1.1.1'));
    expect(pinsState.togglePins).toHaveBeenCalledWith(['ip|1.1.1.1']);
    expect(rowClick).not.toHaveBeenCalled();
  });

  it('shows pinned styling and the unpin tooltip when the key is pinned', () => {
    pinsState.pinned = new Set(['ip|1.1.1.1']);
    render(<Chip group="ip" value="1.1.1.1" />);
    const chip = screen.getByText('1.1.1.1').closest('span[data-key]') as HTMLElement;
    expect(chip).toHaveAttribute('data-pinned', 'true');
    expect(chip.className).toContain('pinned');
    expect(chip.title).toBe('Unpin ip 1.1.1.1');
  });

  it('double-click selects the chip text instead of toggling twice', () => {
    const addRange = vi.fn();
    const removeAllRanges = vi.fn();
    vi.spyOn(window, 'getSelection').mockReturnValue({
      addRange,
      removeAllRanges,
    } as unknown as Selection);
    render(<Chip group="ip" value="1.1.1.1" />);
    const chip = screen.getByText('1.1.1.1');
    fireEvent.click(chip, { detail: 1 });
    fireEvent.click(chip, { detail: 2 });
    fireEvent.doubleClick(chip);
    expect(pinsState.togglePins).toHaveBeenCalledTimes(1);
    expect(removeAllRanges).toHaveBeenCalled();
    expect(addRange).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });

  it('survives a missing selection object', () => {
    vi.spyOn(window, 'getSelection').mockReturnValue(null);
    render(<Chip group="ip" value="1.1.1.1" />);
    fireEvent.doubleClick(screen.getByText('1.1.1.1'));
    vi.restoreAllMocks();
  });

  it('shows a count beyond one, renders children in place of the value, and reports hover', () => {
    const onHover = vi.fn();
    render(
      <Chip group="ip" value="1.1.1.1" count={3} lit onHover={onHover}>
        <b>styled</b>
      </Chip>
    );
    const chip = screen.getByText('styled').closest('span[data-key]') as HTMLElement;
    expect(chip).toHaveTextContent('x3');
    expect(chip.className).toContain('lit');
    fireEvent.mouseEnter(chip);
    expect(onHover).toHaveBeenCalledWith('ip|1.1.1.1');
    fireEvent.mouseLeave(chip);
    expect(onHover).toHaveBeenCalledWith(null);
  });

  it('keeps mousedown from the row so a click cannot start a drag or focus change', () => {
    const rowMouseDown = vi.fn();
    render(
      <div onMouseDown={rowMouseDown}>
        <Chip group="ip" value="1.1.1.1" />
      </div>
    );
    fireEvent.mouseDown(screen.getByText('1.1.1.1'));
    expect(rowMouseDown).not.toHaveBeenCalled();
  });

  it('hides a count of one', () => {
    render(<Chip group="ip" value="1.1.1.1" count={1} />);
    expect(screen.queryByText(/x1/)).toBeNull();
  });
});
