import { nativeImage } from 'electron';
import { join } from 'path';
import { promises as fs } from 'fs';
import { saveEncryptedJson, loadEncryptedJson, ensureDataDirectory } from './file-operations';

const THUMBNAIL_WIDTH = 200;

/**
 * Get the images directory path
 */
function getImagesDir(dataPath: string): string {
  return join(dataPath, 'images');
}

/**
 * Save a full image and its thumbnail as encrypted files.
 * Returns the thumbnail data URL.
 */
export async function saveImage(id: string, dataUrl: string, dataPath: string): Promise<string> {
  const imagesDir = getImagesDir(dataPath);
  await ensureDataDirectory(imagesDir);

  const fullPath = join(imagesDir, `${id}.enc`);
  const thumbPath = join(imagesDir, `${id}_thumb.enc`);

  // Save full image
  await saveEncryptedJson(dataUrl, fullPath);

  // Generate thumbnail via nativeImage.resize()
  const image = nativeImage.createFromDataURL(dataUrl);
  const size = image.getSize();
  const thumbWidth = Math.min(THUMBNAIL_WIDTH, size.width);
  const thumbHeight = Math.round((thumbWidth / size.width) * size.height);
  const thumbnail = image.resize({ width: thumbWidth, height: thumbHeight });
  const thumbnailDataUrl = thumbnail.toDataURL();

  // Save thumbnail
  await saveEncryptedJson(thumbnailDataUrl, thumbPath);

  return thumbnailDataUrl;
}

/**
 * Load the full image data URL
 */
export async function loadImage(id: string, dataPath: string): Promise<string> {
  const fullPath = join(getImagesDir(dataPath), `${id}.enc`);
  return await loadEncryptedJson<string>(fullPath);
}

/**
 * Load the thumbnail data URL
 */
export async function loadThumbnail(id: string, dataPath: string): Promise<string> {
  const thumbPath = join(getImagesDir(dataPath), `${id}_thumb.enc`);
  return await loadEncryptedJson<string>(thumbPath);
}

/**
 * Delete both the full image and thumbnail files
 */
export async function deleteImage(id: string, dataPath: string): Promise<void> {
  const imagesDir = getImagesDir(dataPath);
  const fullPath = join(imagesDir, `${id}.enc`);
  const thumbPath = join(imagesDir, `${id}_thumb.enc`);

  try {
    await fs.unlink(fullPath);
  } catch {
    // File might not exist
  }
  try {
    await fs.unlink(thumbPath);
  } catch {
    // File might not exist
  }
}

/**
 * Delete the entire images directory (used in clearAllData)
 */
export async function deleteAllImages(dataPath: string): Promise<void> {
  const imagesDir = getImagesDir(dataPath);
  try {
    await fs.rm(imagesDir, { recursive: true, force: true });
  } catch {
    // Directory might not exist
  }
}
