import { safeStorage } from 'electron';
import { promises as fs } from 'fs';

/**
 * Save data as encrypted JSON to a file (atomic write via temp file)
 */
export async function saveEncryptedJson<T>(data: T, filePath: string): Promise<void> {
  const tempPath = filePath + '.tmp';

  try {
    // Serialize without pretty-printing for minimal size
    const jsonData = JSON.stringify(data);

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
    await fs.rename(tempPath, filePath);

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
 * Load and decrypt JSON from an encrypted file
 */
export async function loadEncryptedJson<T>(filePath: string): Promise<T> {
  try {
    // Check if encrypted file exists
    await fs.access(filePath);

    // Read encrypted data
    const encryptedData = await fs.readFile(filePath);

    // Decrypt data
    const decryptedBuffer = safeStorage.decryptString(encryptedData);
    const jsonData = Buffer.from(decryptedBuffer).toString('utf8');

    // Parse and return data
    return JSON.parse(jsonData) as T;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      // File doesn't exist
      throw new Error('FILE_NOT_FOUND');
    } else {
      console.error('Failed to load data from storage:', error);
      throw error;
    }
  }
}

/**
 * Save plain JSON to a file (for unencrypted metadata)
 */
export async function saveJsonFile<T>(data: T, filePath: string): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data));
}

/**
 * Load plain JSON from a file
 */
export async function loadJsonFile<T>(filePath: string): Promise<T> {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error('FILE_NOT_FOUND');
    }
    throw error;
  }
}

/**
 * Save a raw buffer as an encrypted file (atomic write via temp file)
 */
export async function saveEncryptedBuffer(data: Buffer, filePath: string): Promise<void> {
  const tempPath = filePath + '.tmp';

  try {
    const base64 = data.toString('base64');
    const encryptedData = safeStorage.encryptString(base64);

    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore if temp file doesn't exist
    }

    await fs.writeFile(tempPath, encryptedData);
    await fs.rename(tempPath, filePath);
  } catch (error) {
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Load and decrypt a raw buffer from an encrypted file
 */
export async function loadEncryptedBuffer(filePath: string): Promise<Buffer> {
  try {
    await fs.access(filePath);
    const encryptedData = await fs.readFile(filePath);
    const base64 = safeStorage.decryptString(encryptedData);
    return Buffer.from(base64, 'base64');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error('FILE_NOT_FOUND');
    }
    throw error;
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
