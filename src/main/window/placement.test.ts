import { describe, it, expect } from 'vitest';
import { resolveWindowPlacement, MIN_VISIBLE } from './placement';

const laptop = { workArea: { x: 0, y: 0, width: 1920, height: 1040 } };
const external = { workArea: { x: 1920, y: -200, width: 2560, height: 1400 } };

describe('resolveWindowPlacement', () => {
  it('returns null when nothing was saved', () => {
    expect(resolveWindowPlacement(null, [laptop], laptop)).toBeNull();
  });

  it('keeps a position that is fully on a display', () => {
    const saved = { x: 100, y: 120, width: 900, height: 670 };
    expect(resolveWindowPlacement(saved, [laptop, external], laptop)).toEqual(saved);
  });

  it('keeps a position on a secondary display', () => {
    const saved = { x: 2500, y: -100, width: 900, height: 670 };
    expect(resolveWindowPlacement(saved, [laptop, external], laptop)).toEqual(saved);
  });

  it('keeps a partially visible position', () => {
    const saved = { x: 1500, y: 800, width: 900, height: 670 };
    expect(resolveWindowPlacement(saved, [laptop], laptop)).toEqual(saved);
  });

  it('drops the position when the window is fully off every display', () => {
    const saved = { x: 2500, y: -100, width: 900, height: 670 };
    expect(resolveWindowPlacement(saved, [laptop], laptop)).toEqual({ width: 900, height: 670 });
  });

  it('drops the position when too little of the window is left to grab', () => {
    const saved = {
      x: 1920 - MIN_VISIBLE.width + 1,
      y: 1040 - MIN_VISIBLE.height + 1,
      width: 900,
      height: 670,
    };
    expect(resolveWindowPlacement(saved, [laptop], laptop)).toEqual({ width: 900, height: 670 });
  });

  it('clamps the saved size to the work area of the display it lands on', () => {
    const saved = { x: 10, y: 10, width: 3000, height: 2000 };
    expect(resolveWindowPlacement(saved, [laptop], laptop)).toEqual({
      x: 10,
      y: 10,
      width: 1920,
      height: 1040,
    });
  });

  it('clamps a dropped position to the primary display', () => {
    const saved = { x: -5000, y: -5000, width: 3000, height: 1200 };
    expect(resolveWindowPlacement(saved, [laptop, external], laptop)).toEqual({
      width: 1920,
      height: 1040,
    });
  });

  it('ignores a malformed saved rectangle', () => {
    const saved = { x: 'left', y: 10, width: 900, height: 670 } as unknown as {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    expect(resolveWindowPlacement(saved, [laptop], laptop)).toBeNull();
    expect(
      resolveWindowPlacement({ x: 0, y: 0, width: 0, height: 670 }, [laptop], laptop)
    ).toBeNull();
  });
});
