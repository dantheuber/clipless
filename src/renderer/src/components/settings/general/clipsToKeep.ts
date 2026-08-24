export const CLIPS_MIN = 15;
export const CLIPS_MAX = 100;

export function parseClipsToKeep(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const value = Number(text);
  return value >= CLIPS_MIN && value <= CLIPS_MAX ? value : null;
}

export function clipsToKeepLoss(
  count: number,
  locked: number,
  limit: number
): { unlocked: number; locked: number } {
  const excess = Math.max(0, count - limit);
  const unlocked = Math.min(excess, Math.max(0, count - locked));
  return { unlocked, locked: excess - unlocked };
}
