import { safeStorage } from 'electron';
import { promises as fs } from 'fs';

/**
 * Save data to encrypted storage
 */
export async function saveToFile(data: any, encryptedDataPath: string): Promise<void> {
  const tempPath = encryptedDataPath + '.tmp';

  try {
    // Serialize data
    const jsonData = JSON.stringify(data, null, 2);

    // Encrypt data
    const encryptedData = safeStorage.encryptString(jsonData);

    // Clean up any existing temp file first
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore if temp file doesn't exist
    }

    // Write to file atomically
    await fs.writeFile(tempPath, encryptedData);
    await fs.rename(tempPath, encryptedDataPath);

    console.log('Data saved to secure storage');
  } catch (error) {
    // Clean up temp file on error
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }

    console.error('Failed to save data to storage:', error);
    throw error;
  }
}

/**
 * Load data from encrypted storage
 */
export async function loadFromFile(encryptedDataPath: string): Promise<any> {
  try {
    // Check if encrypted file exists
    await fs.access(encryptedDataPath);

    // Read encrypted data
    const encryptedData = await fs.readFile(encryptedDataPath);

    // Decrypt data
    const decryptedBuffer = safeStorage.decryptString(encryptedData);
    const jsonData = Buffer.from(decryptedBuffer).toString('utf8');

    // Parse and return data
    return JSON.parse(jsonData);
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      // File doesn't exist
      throw new Error('FILE_NOT_FOUND');
    } else {
      console.error('Failed to load data from storage:', error);
      throw error;
    }
  }
}

/**
 * Ensure data directory exists
 */
export async function ensureDataDirectory(dataPath: string): Promise<void> {
  await fs.mkdir(dataPath, { recursive: true });
}

/**
 * Check if encryption is available
 */
export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}
