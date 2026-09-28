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
 * How much of the window's title bar must sit inside one display's work area for its saved
 * position to count as on-screen: `height` is the strip along the top of the window that the
 * user drags by, and at least `width` of that strip has to be reachable.
 */
export const MIN_VISIBLE = { width: 100, height: 40 };

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRect(value: unknown): value is Rect {
  if (typeof value !== 'object' || value === null) return false;
  const { x, y, width, height } = value as Record<string, unknown>;
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return false;
  return isFiniteNumber(width) && width > 0 && isFiniteNumber(height) && height > 0;
}

function intersection(a: Rect, b: Rect): { width: number; height: number } {
  return {
    width: Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
    height: Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
  };
}

/** The saved size, no larger than the work area it will be shown on. */
function clampSize(saved: Rect, workArea: Rect): { width: number; height: number } {
  return {
    width: Math.min(saved.width, workArea.width),
    height: Math.min(saved.height, workArea.height),
  };
}

/**
 * Decide where the main window opens given the bounds saved on the last close and the
 * displays attached now. Returns null when there is nothing usable to restore.
 *
 * - On a display (at least MIN_VISIBLE of the title bar inside some work area, once the
 *   size is clamped to that display): keep x and y.
 * - Off every display (a monitor that was unplugged, or only a bottom or right edge left
 *   on screen): drop x and y; Electron centres the window on the primary display.
 * - Either way the saved size is kept, clamped to the work area of the display it lands on.
 *
 * The size is clamped before the check so an oversized window cannot pass on a part that the
 * clamp then cuts off: `{ x: -2900, width: 3000 }` overlaps a 1920-wide display by 100px, but
 * clamped to 1920 wide it ends at -980 and is unreachable.
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
    const { width } = clampSize(saved, display.workArea);
    const titleBar = { x: saved.x, y: saved.y, width, height: MIN_VISIBLE.height };
    const overlap = intersection(titleBar, display.workArea);
    if (overlap.width < MIN_VISIBLE.width || overlap.height < MIN_VISIBLE.height) continue;
    const area = overlap.width * overlap.height;
    if (area > best) {
      best = area;
      target = display;
    }
  }

  const size = clampSize(saved, (target ?? primary).workArea);
  return target ? { x: saved.x, y: saved.y, ...size } : size;
}
