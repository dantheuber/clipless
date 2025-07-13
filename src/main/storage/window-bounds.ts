import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Save window bounds to storage
 */
export async function saveWindowBounds(
  dataPath: string,
  bounds: { x: number; y: number; width: number; height: number }
): Promise<void> {
  try {
    const boundsPath = join(dataPath, 'window-bounds.json');
    await fs.writeFile(boundsPath, JSON.stringify(bounds, null, 2));
  } catch (error) {
    console.error('Failed to save window bounds:', error);
  }
}

/**
 * Get window bounds from storage
 */
export async function getWindowBounds(
  dataPath: string
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  try {
    const boundsPath = join(dataPath, 'window-bounds.json');
    const data = await fs.readFile(boundsPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    // File doesn't exist or is invalid, return null
    return null;
  }
}
