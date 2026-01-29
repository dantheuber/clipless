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
} from '../../shared/types';

// Import utility modules
import { DEFAULT_DATA } from './defaults';
import { migrateData } from './migration';
import {
  saveToFile,
  loadFromFile,
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

class SecureStorage {
  private dataPath: string;
  private encryptedDataPath: string;
  private isInitialized = false;
  private isBackgroundLoadComplete = false;
  private data: AppData = DEFAULT_DATA;
  private savePromise: Promise<void> | null = null;
  private onBackgroundLoadComplete?: () => void;

  constructor() {
    // Store data in the user data directory
    const userDataPath = app.getPath('userData');
    this.dataPath = join(userDataPath, 'clipless-data');
    this.encryptedDataPath = join(this.dataPath, 'data.enc');
    console.log(`Secure storage initialized at: ${this.encryptedDataPath}`);
  }

  /**
   * Initialize the storage system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Start with default data immediately for fast startup
    this.data = { ...DEFAULT_DATA };
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

      // Try to load existing data
      await this.loadData();

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
   * Load data from encrypted storage
   */
  private async loadData(): Promise<void> {
    try {
      const parsedData = await loadFromFile(this.encryptedDataPath);

      // Validate data structure and migrate if necessary
      this.data = migrateData(parsedData);

      console.log(`Loaded ${this.data.clips.length} clips from secure storage`);
    } catch (error) {
      if ((error as Error).message === 'FILE_NOT_FOUND') {
        // File doesn't exist, start with default data
        console.log('No existing data file found, starting with defaults');
        this.data = { ...DEFAULT_DATA };
      } else {
        console.error('Failed to load data from storage:', error);
        // Use default data if decryption fails
        this.data = { ...DEFAULT_DATA };
      }
    }
  }

  /**
   * Save data to encrypted storage
   */
  private async saveData(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Storage not initialized');
    }

    // If a save operation is already in progress, wait for it to complete
    if (this.savePromise) {
      await this.savePromise;
      return;
    }

    // Start a new save operation
    this.savePromise = this.performSave();

    try {
      await this.savePromise;
    } finally {
      this.savePromise = null;
    }
  }

  /**
   * Perform the actual save operation
   */
  private async performSave(): Promise<void> {
    await saveToFile(this.data, this.encryptedDataPath);
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
    return [...this.data.clips];
  }

  /**
   * Save clips to storage
   */
  async saveClips(clips: ClipItem[], lockedIndices: Record<number, boolean>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.data.clips = convertToStoredClips(clips, lockedIndices);
    await this.saveData();
  }

  // ===== SETTINGS MANAGEMENT =====

  /**
   * Get user settings
   */
  async getSettings(): Promise<UserSettings> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const settings = normalizeSettings(this.data.settings);

    // Save if hotkeys were missing and added
    if (!this.data.settings.hotkeys) {
      this.data.settings = settings;
      await this.saveData();
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

    this.data.settings = mergeSettings(this.data.settings, settings);
    await this.saveData();
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
    return sortTemplatesByOrder(this.data.templates);
  }

  /**
   * Create a new template
   */
  async createTemplate(name: string, content: string): Promise<Template> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const template = createTemplateObject(name, content, this.data.templates.length);
    this.data.templates.push(template);
    await this.saveData();
    return template;
  }

  /**
   * Update an existing template
   */
  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const templateIndex = this.data.templates.findIndex((t) => t.id === id);
    if (templateIndex === -1) {
      throw new Error('Template not found');
    }

    const updatedTemplate = updateTemplateObject(this.data.templates[templateIndex], updates);
    this.data.templates[templateIndex] = updatedTemplate;
    await this.saveData();
    return updatedTemplate;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const templateIndex = this.data.templates.findIndex((t) => t.id === id);
    if (templateIndex === -1) {
      throw new Error('Template not found');
    }

    this.data.templates.splice(templateIndex, 1);
    this.data.templates = reorderTemplatesArray(this.data.templates);
    await this.saveData();
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
      const existingTemplate = this.data.templates.find((t) => t.id === template.id);
      if (existingTemplate) {
        existingTemplate.order = index;
      }
    });

    // Sort templates by order
    this.data.templates.sort((a, b) => a.order - b.order);
    await this.saveData();
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

    const template = this.data.templates.find((t) => t.id === templateId);
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
    return sortSearchTermsByOrder(this.data.searchTerms);
  }

  /**
   * Create a new search term
   */
  async createSearchTerm(name: string, pattern: string): Promise<SearchTerm> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const searchTerm = createSearchTermObject(name, pattern, this.data.searchTerms.length);
    this.data.searchTerms.push(searchTerm);
    await this.saveData();
    return searchTerm;
  }

  /**
   * Update an existing search term
   */
  async updateSearchTerm(id: string, updates: Partial<SearchTerm>): Promise<SearchTerm> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const searchTermIndex = this.data.searchTerms.findIndex((t) => t.id === id);
    if (searchTermIndex === -1) {
      throw new Error('Search term not found');
    }

    const updatedSearchTerm = updateSearchTermObject(
      this.data.searchTerms[searchTermIndex],
      updates
    );
    this.data.searchTerms[searchTermIndex] = updatedSearchTerm;
    await this.saveData();
    return updatedSearchTerm;
  }

  /**
   * Delete a search term
   */
  async deleteSearchTerm(id: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const searchTermIndex = this.data.searchTerms.findIndex((t) => t.id === id);
    if (searchTermIndex === -1) {
      throw new Error('Search term not found');
    }

    this.data.searchTerms.splice(searchTermIndex, 1);
    this.data.searchTerms = reorderSearchTermsArray(this.data.searchTerms);
    await this.saveData();
  }

  /**
   * Reorder search terms
   */
  async reorderSearchTerms(searchTerms: SearchTerm[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    searchTerms.forEach((searchTerm, index) => {
      const existingSearchTerm = this.data.searchTerms.find((t) => t.id === searchTerm.id);
      if (existingSearchTerm) {
        existingSearchTerm.order = index;
      }
    });

    // Sort search terms by order
    this.data.searchTerms.sort((a, b) => a.order - b.order);
    await this.saveData();
  }

  // ===== QUICK TOOLS MANAGEMENT =====

  /**
   * Get all quick tools
   */
  async getQuickTools(): Promise<QuickTool[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return sortQuickToolsByOrder(this.data.quickTools);
  }

  /**
   * Create a new quick tool
   */
  async createQuickTool(name: string, url: string, captureGroups: string[]): Promise<QuickTool> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const quickTool = createQuickToolObject(name, url, captureGroups, this.data.quickTools.length);
    this.data.quickTools.push(quickTool);
    await this.saveData();
    return quickTool;
  }

  /**
   * Update an existing quick tool
   */
  async updateQuickTool(id: string, updates: Partial<QuickTool>): Promise<QuickTool> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const quickToolIndex = this.data.quickTools.findIndex((t) => t.id === id);
    if (quickToolIndex === -1) {
      throw new Error('Quick tool not found');
    }

    const updatedQuickTool = updateQuickToolObject(this.data.quickTools[quickToolIndex], updates);
    this.data.quickTools[quickToolIndex] = updatedQuickTool;
    await this.saveData();
    return updatedQuickTool;
  }

  /**
   * Delete a quick tool
   */
  async deleteQuickTool(id: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const quickToolIndex = this.data.quickTools.findIndex((t) => t.id === id);
    if (quickToolIndex === -1) {
      throw new Error('Quick tool not found');
    }

    this.data.quickTools.splice(quickToolIndex, 1);
    this.data.quickTools = reorderQuickToolsArray(this.data.quickTools);
    await this.saveData();
  }

  /**
   * Reorder quick tools
   */
  async reorderQuickTools(quickTools: QuickTool[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    quickTools.forEach((quickTool, index) => {
      const existingQuickTool = this.data.quickTools.find((t) => t.id === quickTool.id);
      if (existingQuickTool) {
        existingQuickTool.order = index;
      }
    });

    // Sort quick tools by order
    this.data.quickTools.sort((a, b) => a.order - b.order);
    await this.saveData();
  }

  /**
   * Import configuration data in batch (more efficient than individual imports)
   */
  async importQuickClipsConfig(config: any): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const { searchTerms, quickTools } = processQuickClipsConfig(config);

    let hasChanges = false;

    // Add search terms
    if (searchTerms.length > 0) {
      searchTerms.forEach((searchTerm) => {
        searchTerm.order =
          this.data.searchTerms.length > 0
            ? Math.max(...this.data.searchTerms.map((t) => t.order)) + 1
            : 0;
        this.data.searchTerms.push(searchTerm);
      });
      hasChanges = true;
    }

    // Add quick tools
    if (quickTools.length > 0) {
      quickTools.forEach((quickTool) => {
        quickTool.order =
          this.data.quickTools.length > 0
            ? Math.max(...this.data.quickTools.map((t) => t.order)) + 1
            : 0;
        this.data.quickTools.push(quickTool);
      });
      hasChanges = true;
    }

    // Add templates (backwards-compatible: missing templates array is fine)
    if (config.templates && Array.isArray(config.templates) && config.templates.length > 0) {
      config.templates.forEach((template: any) => {
        if (template.id && template.name && template.content) {
          const newTemplate = {
            ...template,
            order:
              this.data.templates.length > 0
                ? Math.max(...this.data.templates.map((t) => t.order)) + 1
                : 0,
          };
          this.data.templates.push(newTemplate);
        }
      });
      hasChanges = true;
    }

    // Save only once at the end if there were changes
    if (hasChanges) {
      await this.saveData();
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

    this.data = { ...DEFAULT_DATA };

    try {
      await fs.unlink(this.encryptedDataPath);
    } catch {
      // File might not exist, that's okay
    }
  }

  /**
   * Export data (unencrypted for backup purposes)
   */
  async exportData(): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return JSON.stringify(this.data, null, 2);
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
      this.data = migrateData(importedData);
      await this.saveData();
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

    const { clipCount, lockedCount } = getClipStats(this.data.clips);

    let dataSize = 0;
    try {
      const stats = await fs.stat(this.encryptedDataPath);
      dataSize = stats.size;
    } catch {
      // File might not exist yet
    }

    return { clipCount, lockedCount, dataSize };
  }
}

// Export singleton instance
export const storage = new SecureStorage();
