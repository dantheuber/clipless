import { promises as fs } from 'fs';
import { join } from 'path';
import type { AppData, StorageStats } from '../../shared/types';
import { getClipStats } from './clips';
import { DEFAULT_SETTINGS } from './defaults';
import { deleteAllImages } from './image-store';
import { migrateData } from './migration';
import { QuickConfigStorage } from './quick-config-storage';
import { CURRENT_STORAGE_VERSION, DEFAULT_TEMPLATES_DATA } from './storage-constants';
import { getWindowBounds, saveWindowBounds } from './window-bounds';

class SecureStorage extends QuickConfigStorage {
  async saveWindowBounds(bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): Promise<void> {
    await saveWindowBounds(this.dataPath, bounds);
  }

  async getWindowBounds(): Promise<{ x: number; y: number; width: number; height: number } | null> {
    return getWindowBounds(this.dataPath);
  }

  async clearAllData(): Promise<void> {
    await this.ensureInitialized();
    this.settings = { ...DEFAULT_SETTINGS };
    this.clips = [];
    this.templatesData = { ...DEFAULT_TEMPLATES_DATA };
    this.meta = { version: __APP_VERSION__, storageVersion: CURRENT_STORAGE_VERSION };
    const files = [this.settingsPath, this.clipsPath, this.templatesPath, this.metaPath];
    for (const filePath of files) await fs.unlink(filePath).catch(() => undefined);
    await deleteAllImages(this.dataPath);
  }

  async exportData(): Promise<string> {
    await this.ensureInitialized();
    const data: AppData = {
      clips: this.clips,
      settings: this.settings,
      templates: this.templatesData.templates,
      searchTerms: this.templatesData.searchTerms,
      quickTools: this.templatesData.quickTools,
      ...(this.templatesData.groupColours && { groupColours: this.templatesData.groupColours }),
      version: this.meta.version,
    };
    return JSON.stringify(data, null, 2);
  }

  async importData(jsonData: string): Promise<void> {
    await this.ensureInitialized();
    try {
      const migrated = migrateData(JSON.parse(jsonData));
      this.settings = migrated.settings;
      this.clips = migrated.clips;
      this.templatesData = {
        templates: migrated.templates,
        searchTerms: migrated.searchTerms,
        quickTools: migrated.quickTools,
        ...(migrated.groupColours && { groupColours: migrated.groupColours }),
      };
      this.meta = { version: migrated.version, storageVersion: CURRENT_STORAGE_VERSION };
      await Promise.all([
        this.saveSettingsData(),
        this.saveClipsData(),
        this.saveTemplatesData(),
        this.saveMeta(),
      ]);
    } catch (error) {
      console.error('Failed to import data:', error);
      throw new Error('Invalid data format');
    }
  }

  async getStorageStats(): Promise<StorageStats> {
    await this.ensureInitialized();
    const { clipCount, lockedCount } = getClipStats(this.clips);
    let dataSize = 0;
    const files = [this.settingsPath, this.clipsPath, this.templatesPath, this.metaPath];
    for (const filePath of files) {
      const stats = await fs.stat(filePath).catch(() => undefined);
      if (stats) dataSize += stats.size;
    }
    const imagesDir = join(this.dataPath, 'images');
    const imageFiles = await fs.readdir(imagesDir).catch(() => []);
    for (const file of imageFiles) {
      const stats = await fs.stat(join(imagesDir, file)).catch(() => undefined);
      if (stats) dataSize += stats.size;
    }
    return { clipCount, lockedCount, dataSize };
  }
}

export const storage = new SecureStorage();
