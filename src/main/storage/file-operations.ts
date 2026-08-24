import { safeStorage } from 'electron';
import { promises as fs } from 'fs';

async function removeIgnoringErrors(filePath: string): Promise<void> {
  await fs.unlink(filePath).catch(() => undefined);
}

export async function saveEncryptedJson<T>(data: T, filePath: string): Promise<void> {
  const tempPath = filePath + '.tmp';

  try {
    const jsonData = JSON.stringify(data);

    const encryptedData = safeStorage.encryptString(jsonData);

    await removeIgnoringErrors(tempPath);

    await fs.writeFile(tempPath, encryptedData);
    await fs.rename(tempPath, filePath);

    console.log('Data saved to secure storage');
  } catch (error) {
    await removeIgnoringErrors(tempPath);

    console.error('Failed to save data to storage:', error);
    throw error;
  }
}

export async function loadEncryptedJson<T>(filePath: string): Promise<T> {
  try {
    await fs.access(filePath);

    const encryptedData = await fs.readFile(filePath);

    const decryptedBuffer = safeStorage.decryptString(encryptedData);
    const jsonData = Buffer.from(decryptedBuffer).toString('utf8');

    return JSON.parse(jsonData) as T;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error('FILE_NOT_FOUND');
    } else {
      console.error('Failed to load data from storage:', error);
      throw error;
    }
  }
}

export async function saveJsonFile<T>(data: T, filePath: string): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data));
}

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

export async function saveEncryptedBuffer(data: Buffer, filePath: string): Promise<void> {
  const tempPath = filePath + '.tmp';

  try {
    const base64 = data.toString('base64');
    const encryptedData = safeStorage.encryptString(base64);

    await removeIgnoringErrors(tempPath);

    await fs.writeFile(tempPath, encryptedData);
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await removeIgnoringErrors(tempPath);
    throw error;
  }
}

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

export async function ensureDataDirectory(dataPath: string): Promise<void> {
  await fs.mkdir(dataPath, { recursive: true });
}

export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}
