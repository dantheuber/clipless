import { app } from 'electron';
import { join } from 'path';
import type { StoredClip, StorageMeta, TemplatesData, UserSettings } from '../../shared/types';
import { DEFAULT_SETTINGS } from './defaults';
import {
  ensureDataDirectory,
  isEncryptionAvailable,
  loadEncryptedJson,
  loadJsonFile,
  saveEncryptedJson,
  saveJsonFile,
} from './file-operations';
import { pruneGroupColours } from './group-colours';
import { saveImage } from './image-store';
import { migrateData, migrateLegacyStorage } from './migration';
import { SaveQueue } from './save-queue';
import { generateId } from './search-terms';
import { CURRENT_STORAGE_VERSION, DEFAULT_TEMPLATES_DATA } from './storage-constants';

export class StorageCore {
  protected dataPath: string;
  protected settingsPath: string;
  protected clipsPath: string;
  protected templatesPath: string;
  protected metaPath: string;
  protected isInitialized = false;
  protected settings: UserSettings = DEFAULT_SETTINGS;
  protected clips: StoredClip[] = [];
  protected templatesData: TemplatesData = { ...DEFAULT_TEMPLATES_DATA };
  protected meta: StorageMeta = {
    version: __APP_VERSION__,
    storageVersion: CURRENT_STORAGE_VERSION,
  };
  private isBackgroundLoadComplete = false;
  private saveQueue = new SaveQueue();
  private onBackgroundLoadComplete?: () => void;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dataPath = join(userDataPath, 'clipless-data');
    this.settingsPath = join(this.dataPath, 'settings.enc');
    this.clipsPath = join(this.dataPath, 'clips.enc');
    this.templatesPath = join(this.dataPath, 'templates.enc');
    this.metaPath = join(this.dataPath, 'meta.json');
    console.log(`Secure storage initialized at: ${this.dataPath}`);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.settings = { ...DEFAULT_SETTINGS };
    this.clips = [];
    this.templatesData = { ...DEFAULT_TEMPLATES_DATA };
    this.meta = { version: __APP_VERSION__, storageVersion: CURRENT_STORAGE_VERSION };
    this.isInitialized = true;
    this.loadDataInBackground();
  }

  protected async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) await this.initialize();
  }

  private async loadDataInBackground(): Promise<void> {
    try {
      await ensureDataDirectory(this.dataPath);
      if (!isEncryptionAvailable()) {
        console.warn('Encryption not available, keeping default data');
        return;
      }
      await migrateLegacyStorage(this.dataPath);
      await this.loadAllDomains();
    } catch (error) {
      console.error('Failed to load data in background:', error);
    } finally {
      this.isBackgroundLoadComplete = true;
      this.onBackgroundLoadComplete?.();
    }
  }

  private async loadAllDomains(): Promise<void> {
    await this.loadDomain(
      'settings',
      () => loadEncryptedJson<UserSettings>(this.settingsPath),
      (v) => {
        if (v && typeof v === 'object') this.settings = { ...DEFAULT_SETTINGS, ...v };
      }
    );
    await this.loadDomain(
      'clips',
      () => loadEncryptedJson<StoredClip[]>(this.clipsPath),
      (v) => {
        if (Array.isArray(v)) this.clips = migrateData({ clips: v }).clips;
      }
    );
    await this.loadDomain(
      'templates data',
      () => loadEncryptedJson<TemplatesData>(this.templatesPath),
      (v) => {
        if (!v || typeof v !== 'object') return;
        const validated = migrateData(v);
        this.templatesData = {
          templates: validated.templates,
          searchTerms: validated.searchTerms,
          quickTools: validated.quickTools,
          ...(validated.groupColours && { groupColours: validated.groupColours }),
        };
      }
    );
    await this.loadDomain(
      'meta',
      () => loadJsonFile<StorageMeta>(this.metaPath),
      (v) => {
        if (v && typeof v === 'object') {
          this.meta = {
            version: v.version || __APP_VERSION__,
            storageVersion: v.storageVersion || CURRENT_STORAGE_VERSION,
          };
        }
      }
    );
    await this.migrateInlineImages();
    console.log(`Loaded ${this.clips.length} clips from secure storage`);
  }

  private async loadDomain<T>(
    name: string,
    load: () => Promise<T>,
    accept: (value: T) => void
  ): Promise<void> {
    try {
      accept(await load());
    } catch (error) {
      if ((error as Error).message !== 'FILE_NOT_FOUND') {
        console.error(`Failed to load ${name}:`, error);
      }
    }
  }

  private async migrateInlineImages(): Promise<void> {
    let hasMigrated = false;
    for (const storedClip of this.clips) {
      if (
        storedClip.clip.type === 'image' &&
        storedClip.clip.content.startsWith('data:image/') &&
        !storedClip.clip.imageId
      ) {
        try {
          const imageId = generateId();
          const thumbnailDataUrl = await saveImage(imageId, storedClip.clip.content, this.dataPath);
          storedClip.clip.imageId = imageId;
          storedClip.clip.thumbnailDataUrl = thumbnailDataUrl;
          storedClip.clip.content = imageId;
          hasMigrated = true;
        } catch (error) {
          console.error('Failed to migrate inline image:', error);
        }
      }
    }
    if (hasMigrated) {
      await this.saveClipsData();
      console.log('Migrated inline base64 image clips to separate files');
    }
  }

  private async saveDomain(key: string, data: unknown, filePath: string): Promise<void> {
    if (!this.isInitialized) throw new Error('Storage not initialized');
    await this.saveQueue.run(key, () => saveEncryptedJson(data, filePath));
  }

  async flush(): Promise<void> {
    await this.saveQueue.idle();
  }

  protected async saveSettingsData(): Promise<void> {
    await this.saveDomain('settings', this.settings, this.settingsPath);
  }

  protected async saveClipsData(): Promise<void> {
    await this.saveDomain('clips', this.clips, this.clipsPath);
  }

  protected async saveTemplatesData(): Promise<void> {
    const pruned = pruneGroupColours(this.templatesData.groupColours, this.templatesData);
    if (pruned !== this.templatesData.groupColours) {
      this.templatesData = { ...this.templatesData, groupColours: pruned };
    }
    await this.saveDomain('templates', this.templatesData, this.templatesPath);
  }

  protected async saveMeta(): Promise<void> {
    await saveJsonFile(this.meta, this.metaPath);
  }

  setOnBackgroundLoadComplete(callback: () => void): void {
    this.onBackgroundLoadComplete = callback;
    if (this.isBackgroundLoadComplete) callback();
  }
}
