import { storage } from '../storage';
import { DEFAULT_SETTINGS } from '../storage/defaults';
import type { ClipItem, StoredClipsSnapshot, UserSettings } from '../../shared/types';

// Storage integration functions

// The clips come with the load state they were read under: until `loadState.complete` they
// are the empty placeholder, and with `loadState.error` set they are not the stored history
export const getClipsSnapshot = async (): Promise<StoredClipsSnapshot> => {
  try {
    return await storage.getClipsSnapshot();
  } catch (error) {
    console.error('Failed to get clips from storage:', error);
    return { loadState: storage.getLoadState(), clips: [] };
  }
};

export const saveClips = async (
  clips: ClipItem[],
  lockedIndices: Record<number, boolean>
): Promise<boolean> => {
  try {
    await storage.saveClips(clips, lockedIndices);
    return true;
  } catch (error) {
    console.error('Failed to save clips to storage:', error);
    return false;
  }
};

export const getSettings = async (): Promise<UserSettings> => {
  try {
    return await storage.getSettings();
  } catch (error) {
    console.error('Failed to get settings from storage:', error);
    // The defaults, not {}: maxClips and the hotkey map must exist downstream (spec 17.8)
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveSettings = async (settings: UserSettings): Promise<boolean> => {
  try {
    await storage.saveSettings(settings);
    return true;
  } catch (error) {
    console.error('Failed to save settings to storage:', error);
    return false;
  }
};

export const getStorageStats = async () => {
  try {
    return await storage.getStorageStats();
  } catch (error) {
    console.error('Failed to get storage stats:', error);
    return { clipCount: 0, lockedCount: 0, dataSize: 0 };
  }
};

export const exportData = async () => {
  try {
    return await storage.exportData();
  } catch (error) {
    console.error('Failed to export data:', error);
    throw error;
  }
};

export const importData = async (jsonData: string): Promise<boolean> => {
  try {
    await storage.importData(jsonData);
    return true;
  } catch (error) {
    console.error('Failed to import data:', error);
    throw error;
  }
};

export const clearAllData = async (): Promise<boolean> => {
  try {
    await storage.clearAllData();
    return true;
  } catch (error) {
    console.error('Failed to clear all data:', error);
    return false;
  }
};
