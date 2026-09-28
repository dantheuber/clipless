export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The part of Electron.Display this module reads, so tests need not build whole displays. */
export interface DisplayLike {
  workArea: Rect;
}

/**
 * Startup placement for the main window: a saved position is only reused when enough of the
 * window still lands on a display; otherwise x and y are left out so Electron centres it.
 */
export interface WindowPlacement {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

/**
 * How much of the window must sit inside one display's work area for its saved position to
 * count as on-screen: enough of the title bar to grab, not a sliver in a corner.
 */
export const MIN_VISIBLE = { width: 100, height: 40 };

function isRect(value: unknown): value is Rect {
  if (typeof value !== 'object' || value === null) return false;
  const { x, y, width, height } = value as Record<string, unknown>;
  return (
    [x, y, width, height].every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    (width as number) > 0 &&
    (height as number) > 0
  );
}

function intersection(a: Rect, b: Rect): { width: number; height: number } {
  return {
    width: Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
    height: Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
  };
}

/**
 * Decide where the main window opens given the bounds saved on the last close and the
 * displays attached now. Returns null when there is nothing usable to restore.
 *
 * - On a display (at least MIN_VISIBLE of it inside some work area): keep x and y.
 * - Off every display (a monitor that was unplugged): drop x and y; Electron centres the
 *   window on the primary display.
 * - Either way the saved size is kept, clamped to the work area of the display it lands on.
 */
export function resolveWindowPlacement(
  saved: Rect | null | undefined,
  displays: DisplayLike[],
  primary: DisplayLike
): WindowPlacement | null {
  if (!isRect(saved)) return null;

  let target: DisplayLike | null = null;
  let best = 0;
  for (const display of displays) {
    const overlap = intersection(saved, display.workArea);
    if (overlap.width < MIN_VISIBLE.width || overlap.height < MIN_VISIBLE.height) continue;
    const area = overlap.width * overlap.height;
    if (area > best) {
      best = area;
      target = display;
    }
  }

  const workArea = (target ?? primary).workArea;
  const size = {
    width: Math.min(saved.width, workArea.width),
    height: Math.min(saved.height, workArea.height),
  };

  return target ? { x: saved.x, y: saved.y, ...size } : size;
}
