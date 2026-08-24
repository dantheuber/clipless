import type { ClipItem, StoredClip, UserSettings } from '../../shared/types';
import { convertToStoredClips } from './clips';
import { deleteImage } from './image-store';
import { mergeSettings, normalizeSettings } from './settings';
import { StorageCore } from './storage-core';

export class ClipSettingsStorage extends StorageCore {
  async getClips(): Promise<StoredClip[]> {
    await this.ensureInitialized();
    return [...this.clips];
  }

  async saveClips(clips: ClipItem[], lockedIndices: Record<number, boolean>): Promise<void> {
    await this.ensureInitialized();
    const oldImageIds = new Set(
      this.clips.filter((clip) => clip.clip.imageId).map((clip) => clip.clip.imageId!)
    );
    this.clips = convertToStoredClips(clips, lockedIndices);
    const newImageIds = new Set(
      this.clips.filter((clip) => clip.clip.imageId).map((clip) => clip.clip.imageId!)
    );
    for (const oldId of oldImageIds) {
      if (!newImageIds.has(oldId)) {
        deleteImage(oldId, this.dataPath).catch((error) =>
          console.error('Failed to delete orphaned image:', error)
        );
      }
    }
    await this.saveClipsData();
  }

  async getSettings(): Promise<UserSettings> {
    await this.ensureInitialized();
    const settings = normalizeSettings(this.settings);
    if (JSON.stringify(settings) !== JSON.stringify(this.settings)) {
      this.settings = settings;
      await this.saveSettingsData();
    }
    return settings;
  }

  async saveSettings(settings: Partial<UserSettings>): Promise<void> {
    await this.ensureInitialized();
    this.settings = mergeSettings(this.settings, settings);
    await this.saveSettingsData();
  }

  async updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]): Promise<void> {
    await this.saveSettings({ [key]: value } as Partial<UserSettings>);
  }
}
