import { app } from 'electron';
import { join } from 'path';
import { promises as fs } from 'fs';
import type {
  ClipItem,
  StoredClip,
  UserSettings,
  AppData,
  StorageStats,
  Template,
  SearchTerm,
  QuickTool,
  QuickClipsConfig,
  TemplatesData,
  StorageMeta,
} from '../../shared/types';

// Import utility modules
import { DEFAULT_SETTINGS } from './defaults';
import { migrateData, migrateLegacyStorage } from './migration';
import {
  saveEncryptedJson,
  loadEncryptedJson,
  saveJsonFile,
  loadJsonFile,
  ensureDataDirectory,
  isEncryptionAvailable,
} from './file-operations';
import { convertToStoredClips, getClipStats } from './clips';
import { normalizeSettings, mergeSettings } from './settings';
import {
  createTemplateObject,
  updateTemplateObject,
  sortTemplatesByOrder,
  reorderTemplatesArray,
  generateTextFromTemplate,
} from './templates';
import {
  generateId,
  createSearchTermObject,
  updateSearchTermObject,
  sortSearchTermsByOrder,
  reorderSearchTermsArray,
} from './search-terms';
import {
  createQuickToolObject,
  updateQuickToolObject,
  sortQuickToolsByOrder,
  reorderQuickToolsArray,
  processQuickClipsConfig,
} from './quick-tools';
import { saveWindowBounds, getWindowBounds } from './window-bounds';
import { saveImage, deleteImage, deleteAllImages } from './image-store';

const CURRENT_STORAGE_VERSION = 1;

const DEFAULT_TEMPLATES_DATA: TemplatesData = {
  templates: [],
  searchTerms: [],
  quickTools: [],
};

class SecureStorage {
  private dataPath: string;
  private settingsPath: string;
  private clipsPath: string;
  private templatesPath: string;
  private metaPath: string;
  private isInitialized = false;
  private isBackgroundLoadComplete = false;

  // Domain-specific data stores
  private settings: UserSettings = DEFAULT_SETTINGS;
  private clips: StoredClip[] = [];
  private templatesData: TemplatesData = { ...DEFAULT_TEMPLATES_DATA };
  private meta: StorageMeta = { version: __APP_VERSION__, storageVersion: CURRENT_STORAGE_VERSION };

  // Per-domain save queuing
  private savePromises: Map<string, Promise<void>> = new Map();

  private onBackgroundLoadComplete?: () => void;

  constructor() {
    // Store data in the user data directory
    const userDataPath = app.getPath('userData');
    this.dataPath = join(userDataPath, 'clipless-data');
    this.settingsPath = join(this.dataPath, 'settings.enc');
    this.clipsPath = join(this.dataPath, 'clips.enc');
    this.templatesPath = join(this.dataPath, 'templates.enc');
    this.metaPath = join(this.dataPath, 'meta.json');
    console.log(`Secure storage initialized at: ${this.dataPath}`);
  }

  /**
   * Initialize the storage system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Start with default data immediately for fast startup
    this.settings = { ...DEFAULT_SETTINGS };
    this.clips = [];
    this.templatesData = { ...DEFAULT_TEMPLATES_DATA };
    this.meta = { version: __APP_VERSION__, storageVersion: CURRENT_STORAGE_VERSION };
    this.isInitialized = true;

    // Load actual data in the background
    this.loadDataInBackground();
  }

  /**
   * Load data in the background without blocking initialization
   */
  private async loadDataInBackground(): Promise<void> {
    try {
      // Ensure data directory exists
      await ensureDataDirectory(this.dataPath);

      // Check if safeStorage is available
      if (!isEncryptionAvailable()) {
        console.warn('Encryption not available, keeping default data');
        this.isBackgroundLoadComplete = true;
        this.onBackgroundLoadComplete?.();
        return;
      }

      // Migrate legacy data.enc if needed
      await migrateLegacyStorage(this.dataPath);

      // Load each domain independently
      await this.loadAllDomains();

      // Mark background loading as complete and notify
      this.isBackgroundLoadComplete = true;
      this.onBackgroundLoadComplete?.();
    } catch (error) {
      console.error('Failed to load data in background:', error);
      // Keep using default data
      this.isBackgroundLoadComplete = true;
      this.onBackgroundLoadComplete?.();
    }
  }

  /**
   * Load all domain-specific data files
   */
  private async loadAllDomains(): Promise<void> {
    // Load settings
    try {
      const loadedSettings = await loadEncryptedJson<UserSettings>(this.settingsPath);
      if (loadedSettings && typeof loadedSettings === 'object') {
        this.settings = { ...DEFAULT_SETTINGS, ...loadedSettings };
      }
    } catch (error) {
      if ((error as Error).message !== 'FILE_NOT_FOUND') {
        console.error('Failed to load settings:', error);
      }
    }

    // Load clips
    try {
      const loadedClips = await loadEncryptedJson<StoredClip[]>(this.clipsPath);
      if (Array.isArray(loadedClips)) {
        // Validate clips through migrateData
        const validated = migrateData({ clips: loadedClips });
        this.clips = validated.clips;
      }
    } catch (error) {
      if ((error as Error).message !== 'FILE_NOT_FOUND') {
        console.error('Failed to load clips:', error);
      }
    }

    // Load templates data
    try {
      const loadedTemplates = await loadEncryptedJson<TemplatesData>(this.templatesPath);
      if (loadedTemplates && typeof loadedTemplates === 'object') {
        // Validate through migrateData
        const validated = migrateData(loadedTemplates);
        this.templatesData = {
          templates: validated.templates,
          searchTerms: validated.searchTerms,
          quickTools: validated.quickTools,
        };
      }
    } catch (error) {
      if ((error as Error).message !== 'FILE_NOT_FOUND') {
        console.error('Failed to load templates data:', error);
      }
    }

    // Load meta
    try {
      const loadedMeta = await loadJsonFile<StorageMeta>(this.metaPath);
      if (loadedMeta && typeof loadedMeta === 'object') {
        this.meta = {
          version: loadedMeta.version || __APP_VERSION__,
          storageVersion: loadedMeta.storageVersion || CURRENT_STORAGE_VERSION,
        };
      }
    } catch (error) {
      if ((error as Error).message !== 'FILE_NOT_FOUND') {
        console.error('Failed to load meta:', error);
      }
    }

    // Migrate inline base64 image clips to separate files
    await this.migrateInlineImages();

    console.log(`Loaded ${this.clips.length} clips from secure storage`);
  }

  /**
   * Migrate existing inline base64 image clips to separate encrypted files.
   * Clips with type 'image' and content starting with 'data:image/' are legacy inline images.
   */
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

  /**
   * Save a specific domain file with queuing to prevent concurrent writes
   */
  private async saveDomain(key: string, data: unknown, filePath: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Storage not initialized');
    }

    const existing = this.savePromises.get(key);
    if (existing) {
      await existing;
      return;
    }

    const promise = saveEncryptedJson(data, filePath);
    this.savePromises.set(key, promise);

    try {
      await promise;
    } finally {
      this.savePromises.delete(key);
    }
  }

  /**
   * Save settings domain
   */
  private async saveSettingsData(): Promise<void> {
    await this.saveDomain('settings', this.settings, this.settingsPath);
  }

  /**
   * Save clips domain
   */
  private async saveClipsData(): Promise<void> {
    await this.saveDomain('clips', this.clips, this.clipsPath);
  }

  /**
   * Save templates domain (templates + search terms + quick tools)
   */
  private async saveTemplatesData(): Promise<void> {
    await this.saveDomain('templates', this.templatesData, this.templatesPath);
  }

  /**
   * Save storage metadata
   */
  private async saveMeta(): Promise<void> {
    await saveJsonFile(this.meta, this.metaPath);
  }

  /**
   * Set callback to be called when background loading completes
   */
  setOnBackgroundLoadComplete(callback: () => void): void {
    this.onBackgroundLoadComplete = callback;

    // If background loading is already complete, call the callback immediately
    if (this.isBackgroundLoadComplete) {
      callback();
    }
  }

  // ===== CLIP MANAGEMENT =====

  /**
   * Get all stored clips
   */
  async getClips(): Promise<StoredClip[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return [...this.clips];
  }

  /**
   * Save clips to storage.
   * Cleans up orphaned image files for deleted image clips.
   */
  async saveClips(clips: ClipItem[], lockedIndices: Record<number, boolean>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Collect image IDs from old clips for cleanup comparison
    const oldImageIds = new Set(
      this.clips.filter((c) => c.clip.imageId).map((c) => c.clip.imageId!)
    );

    this.clips = convertToStoredClips(clips, lockedIndices);

    // Collect image IDs from new clips
    const newImageIds = new Set(
      this.clips.filter((c) => c.clip.imageId).map((c) => c.clip.imageId!)
    );

    // Delete orphaned images (in old but not in new)
    for (const oldId of oldImageIds) {
      if (!newImageIds.has(oldId)) {
        deleteImage(oldId, this.dataPath).catch((err) =>
          console.error('Failed to delete orphaned image:', err)
        );
      }
    }

    await this.saveClipsData();
  }

  // ===== SETTINGS MANAGEMENT =====

  /**
   * Get user settings
   */
  async getSettings(): Promise<UserSettings> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const settings = normalizeSettings(this.settings);

    // Save if hotkeys were missing and added
    if (!this.settings.hotkeys) {
      this.settings = settings;
      await this.saveSettingsData();
    }

    return settings;
  }

  /**
   * Save user settings
   */
  async saveSettings(settings: Partial<UserSettings>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.settings = mergeSettings(this.settings, settings);
    await this.saveSettingsData();
  }

  /**
   * Update a specific setting
   */
  async updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]): Promise<void> {
    await this.saveSettings({ [key]: value } as Partial<UserSettings>);
  }

  // ===== TEMPLATE MANAGEMENT =====

  /**
   * Get all templates
   */
  async getTemplates(): Promise<Template[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return sortTemplatesByOrder(this.templatesData.templates);
  }

  /**
   * Create a new template
   */
  async createTemplate(name: string, content: string): Promise<Template> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const template = createTemplateObject(name, content, this.templatesData.templates.length);
    this.templatesData.templates.push(template);
    await this.saveTemplatesData();
    return template;
  }

  /**
   * Update an existing template
   */
  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const templateIndex = this.templatesData.templates.findIndex((t) => t.id === id);
    if (templateIndex === -1) {
      throw new Error('Template not found');
    }

    const updatedTemplate = updateTemplateObject(
      this.templatesData.templates[templateIndex],
      updates
    );
    this.templatesData.templates[templateIndex] = updatedTemplate;
    await this.saveTemplatesData();
    return updatedTemplate;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const templateIndex = this.templatesData.templates.findIndex((t) => t.id === id);
    if (templateIndex === -1) {
      throw new Error('Template not found');
    }

    this.templatesData.templates.splice(templateIndex, 1);
    this.templatesData.templates = reorderTemplatesArray(this.templatesData.templates);
    await this.saveTemplatesData();
  }

  /**
   * Reorder templates
   */
  async reorderTemplates(templates: Template[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Update order for each template
    templates.forEach((template, index) => {
      const existingTemplate = this.templatesData.templates.find((t) => t.id === template.id);
      if (existingTemplate) {
        existingTemplate.order = index;
      }
    });

    // Sort templates by order
    this.templatesData.templates.sort((a, b) => a.order - b.order);
    await this.saveTemplatesData();
  }

  /**
   * Generate text from template using clipboard contents
   */
  async generateTextFromTemplate(
    templateId: string,
    clipContents: string[],
    captures?: Record<string, string>
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const template = this.templatesData.templates.find((t) => t.id === templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    return generateTextFromTemplate(template, clipContents, captures);
  }

  // ===== SEARCH TERMS MANAGEMENT =====

  /**
   * Get all search terms
   */
  async getSearchTerms(): Promise<SearchTerm[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return sortSearchTermsByOrder(this.templatesData.searchTerms);
  }

  /**
   * Create a new search term
   */
  async createSearchTerm(name: string, pattern: string): Promise<SearchTerm> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const searchTerm = createSearchTermObject(name, pattern, this.templatesData.searchTerms.length);
    this.templatesData.searchTerms.push(searchTerm);
    await this.saveTemplatesData();
    return searchTerm;
  }

  /**
   * Update an existing search term
   */
  async updateSearchTerm(id: string, updates: Partial<SearchTerm>): Promise<SearchTerm> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const searchTermIndex = this.templatesData.searchTerms.findIndex((t) => t.id === id);
    if (searchTermIndex === -1) {
      throw new Error('Search term not found');
    }

    const updatedSearchTerm = updateSearchTermObject(
      this.templatesData.searchTerms[searchTermIndex],
      updates
    );
    this.templatesData.searchTerms[searchTermIndex] = updatedSearchTerm;
    await this.saveTemplatesData();
    return updatedSearchTerm;
  }

  /**
   * Delete a search term
   */
  async deleteSearchTerm(id: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const searchTermIndex = this.templatesData.searchTerms.findIndex((t) => t.id === id);
    if (searchTermIndex === -1) {
      throw new Error('Search term not found');
    }

    this.templatesData.searchTerms.splice(searchTermIndex, 1);
    this.templatesData.searchTerms = reorderSearchTermsArray(this.templatesData.searchTerms);
    await this.saveTemplatesData();
  }

  /**
   * Reorder search terms
   */
  async reorderSearchTerms(searchTerms: SearchTerm[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    searchTerms.forEach((searchTerm, index) => {
      const existingSearchTerm = this.templatesData.searchTerms.find((t) => t.id === searchTerm.id);
      if (existingSearchTerm) {
        existingSearchTerm.order = index;
      }
    });

    // Sort search terms by order
    this.templatesData.searchTerms.sort((a, b) => a.order - b.order);
    await this.saveTemplatesData();
  }

  // ===== QUICK TOOLS MANAGEMENT =====

  /**
   * Get all quick tools
   */
  async getQuickTools(): Promise<QuickTool[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return sortQuickToolsByOrder(this.templatesData.quickTools);
  }

  /**
   * Create a new quick tool
   */
  async createQuickTool(name: string, url: string, captureGroups: string[]): Promise<QuickTool> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const quickTool = createQuickToolObject(
      name,
      url,
      captureGroups,
      this.templatesData.quickTools.length
    );
    this.templatesData.quickTools.push(quickTool);
    await this.saveTemplatesData();
    return quickTool;
  }

  /**
   * Update an existing quick tool
   */
  async updateQuickTool(id: string, updates: Partial<QuickTool>): Promise<QuickTool> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const quickToolIndex = this.templatesData.quickTools.findIndex((t) => t.id === id);
    if (quickToolIndex === -1) {
      throw new Error('Quick tool not found');
    }

    const updatedQuickTool = updateQuickToolObject(
      this.templatesData.quickTools[quickToolIndex],
      updates
    );
    this.templatesData.quickTools[quickToolIndex] = updatedQuickTool;
    await this.saveTemplatesData();
    return updatedQuickTool;
  }

  /**
   * Delete a quick tool
   */
  async deleteQuickTool(id: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const quickToolIndex = this.templatesData.quickTools.findIndex((t) => t.id === id);
    if (quickToolIndex === -1) {
      throw new Error('Quick tool not found');
    }

    this.templatesData.quickTools.splice(quickToolIndex, 1);
    this.templatesData.quickTools = reorderQuickToolsArray(this.templatesData.quickTools);
    await this.saveTemplatesData();
  }

  /**
   * Reorder quick tools
   */
  async reorderQuickTools(quickTools: QuickTool[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    quickTools.forEach((quickTool, index) => {
      const existingQuickTool = this.templatesData.quickTools.find((t) => t.id === quickTool.id);
      if (existingQuickTool) {
        existingQuickTool.order = index;
      }
    });

    // Sort quick tools by order
    this.templatesData.quickTools.sort((a, b) => a.order - b.order);
    await this.saveTemplatesData();
  }

  /**
   * Import configuration data in batch (more efficient than individual imports)
   */
  async importQuickClipsConfig(config: QuickClipsConfig): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const { searchTerms, quickTools } = processQuickClipsConfig(config);

    let hasChanges = false;

    // Add search terms
    if (searchTerms.length > 0) {
      searchTerms.forEach((searchTerm) => {
        searchTerm.order =
          this.templatesData.searchTerms.length > 0
            ? Math.max(...this.templatesData.searchTerms.map((t) => t.order)) + 1
            : 0;
        this.templatesData.searchTerms.push(searchTerm);
      });
      hasChanges = true;
    }

    // Add quick tools
    if (quickTools.length > 0) {
      quickTools.forEach((quickTool) => {
        quickTool.order =
          this.templatesData.quickTools.length > 0
            ? Math.max(...this.templatesData.quickTools.map((t) => t.order)) + 1
            : 0;
        this.templatesData.quickTools.push(quickTool);
      });
      hasChanges = true;
    }

    // Add templates (backwards-compatible: missing templates array is fine)
    if (config.templates && Array.isArray(config.templates) && config.templates.length > 0) {
      config.templates.forEach((template) => {
        if (template.id && template.name && template.content) {
          const newTemplate = {
            ...template,
            order:
              this.templatesData.templates.length > 0
                ? Math.max(...this.templatesData.templates.map((t) => t.order)) + 1
                : 0,
          };
          this.templatesData.templates.push(newTemplate);
        }
      });
      hasChanges = true;
    }

    // Save only once at the end if there were changes
    if (hasChanges) {
      await this.saveTemplatesData();
    }
  }

  // ===== WINDOW BOUNDS MANAGEMENT =====

  /**
   * Save window bounds to storage
   */
  async saveWindowBounds(bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): Promise<void> {
    await saveWindowBounds(this.dataPath, bounds);
  }

  /**
   * Get window bounds from storage
   */
  async getWindowBounds(): Promise<{ x: number; y: number; width: number; height: number } | null> {
    return await getWindowBounds(this.dataPath);
  }

  // ===== UTILITY METHODS =====

  /**
   * Clear all data (for reset functionality)
   */
  async clearAllData(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.settings = { ...DEFAULT_SETTINGS };
    this.clips = [];
    this.templatesData = { ...DEFAULT_TEMPLATES_DATA };
    this.meta = { version: __APP_VERSION__, storageVersion: CURRENT_STORAGE_VERSION };

    // Delete all domain files
    const filesToDelete = [this.settingsPath, this.clipsPath, this.templatesPath, this.metaPath];

    for (const filePath of filesToDelete) {
      try {
        await fs.unlink(filePath);
      } catch {
        // File might not exist, that's okay
      }
    }

    // Delete all image files
    await deleteAllImages(this.dataPath);
  }

  /**
   * Export data (unencrypted for backup purposes)
   */
  async exportData(): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Reconstruct AppData for export compatibility
    const data: AppData = {
      clips: this.clips,
      settings: this.settings,
      templates: this.templatesData.templates,
      searchTerms: this.templatesData.searchTerms,
      quickTools: this.templatesData.quickTools,
      version: this.meta.version,
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import data from backup
   */
  async importData(jsonData: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const importedData = JSON.parse(jsonData);
      const migrated = migrateData(importedData);

      // Split into domain stores
      this.settings = migrated.settings;
      this.clips = migrated.clips;
      this.templatesData = {
        templates: migrated.templates,
        searchTerms: migrated.searchTerms,
        quickTools: migrated.quickTools,
      };
      this.meta = {
        version: migrated.version,
        storageVersion: CURRENT_STORAGE_VERSION,
      };

      // Save all domains
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

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const { clipCount, lockedCount } = getClipStats(this.clips);

    let dataSize = 0;
    const filesToStat = [this.settingsPath, this.clipsPath, this.templatesPath, this.metaPath];
    for (const filePath of filesToStat) {
      try {
        const stats = await fs.stat(filePath);
        dataSize += stats.size;
      } catch {
        // File might not exist yet
      }
    }

    // Include images directory size
    try {
      const imagesDir = join(this.dataPath, 'images');
      const imageFiles = await fs.readdir(imagesDir);
      for (const file of imageFiles) {
        try {
          const stats = await fs.stat(join(imagesDir, file));
          dataSize += stats.size;
        } catch {
          // Skip files that can't be stat'd
        }
      }
    } catch {
      // Images directory might not exist
    }

    return { clipCount, lockedCount, dataSize };
  }
}

// Export singleton instance
export const storage = new SecureStorage();
