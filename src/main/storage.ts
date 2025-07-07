import { safeStorage, app } from 'electron';
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
  HotkeySettings,
} from '../shared/types';
import { DEFAULT_MAX_CLIPS } from '../shared/constants';

const DEFAULT_HOTKEY_SETTINGS: HotkeySettings = {
  enabled: false,
  focusWindow: {
    enabled: true,
    key: 'CommandOrControl+Shift+V',
  },
  quickClip1: {
    enabled: true,
    key: 'CommandOrControl+Shift+1',
  },
  quickClip2: {
    enabled: true,
    key: 'CommandOrControl+Shift+2',
  },
  quickClip3: {
    enabled: true,
    key: 'CommandOrControl+Shift+3',
  },
  quickClip4: {
    enabled: true,
    key: 'CommandOrControl+Shift+4',
  },
  quickClip5: {
    enabled: true,
    key: 'CommandOrControl+Shift+5',
  },
};

const DEFAULT_SETTINGS: UserSettings = {
  maxClips: DEFAULT_MAX_CLIPS,
  startMinimized: false,
  autoStart: false,
  theme: 'system',
  windowTransparency: 0,
  transparencyEnabled: false,
  opaqueWhenFocused: true,
  alwaysOnTop: false,
  rememberWindowPosition: true,
  hotkeys: DEFAULT_HOTKEY_SETTINGS,
};

const DEFAULT_DATA: AppData = {
  clips: [],
  settings: DEFAULT_SETTINGS,
  templates: [],
  searchTerms: [],
  quickTools: [],
  version: '1.0.0',
};

class SecureStorage {
  private dataPath: string;
  private encryptedDataPath: string;
  private isInitialized = false;
  private data: AppData = DEFAULT_DATA;
  private savePromise: Promise<void> | null = null;

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

    try {
      // Ensure data directory exists
      await fs.mkdir(this.dataPath, { recursive: true });

      // Check if safeStorage is available
      if (!safeStorage.isEncryptionAvailable()) {
        console.warn('Encryption not available, using plain text storage');
        throw new Error('Encryption not available');
      }

      // Try to load existing data
      await this.loadData();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize secure storage:', error);
      // Fall back to in-memory storage
      this.data = { ...DEFAULT_DATA };
      this.isInitialized = true;
    }
  }

  /**
   * Load data from encrypted storage
   */
  private async loadData(): Promise<void> {
    try {
      // Check if encrypted file exists
      await fs.access(this.encryptedDataPath);

      // Read encrypted data
      const encryptedData = await fs.readFile(this.encryptedDataPath);

      // Decrypt data
      const decryptedBuffer = safeStorage.decryptString(encryptedData);
      const jsonData = Buffer.from(decryptedBuffer).toString('utf8');

      // Parse and validate data
      const parsedData = JSON.parse(jsonData) as AppData;

      // Validate data structure and migrate if necessary
      this.data = this.migrateData(parsedData);

      console.log(`Loaded ${this.data.clips.length} clips from secure storage`);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
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
    const tempPath = this.encryptedDataPath + '.tmp';

    try {
      // Serialize data
      const jsonData = JSON.stringify(this.data, null, 2);

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
      await fs.rename(tempPath, this.encryptedDataPath);

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
   * Migrate data from older versions
   */
  private migrateData(data: any): AppData {
    // Start with default data
    const migratedData: AppData = { ...DEFAULT_DATA };

    // Copy over valid clips
    if (data.clips && Array.isArray(data.clips)) {
      migratedData.clips = data.clips.filter(
        (item: any) =>
          item?.clip && typeof item.clip.type === 'string' && typeof item.clip.content === 'string'
      );
    }

    // Copy over valid settings
    if (data.settings && typeof data.settings === 'object') {
      migratedData.settings = {
        ...DEFAULT_SETTINGS,
        ...data.settings,
      };
    }

    // Copy over valid templates
    if (data.templates && Array.isArray(data.templates)) {
      migratedData.templates = data.templates.filter(
        (template: any) =>
          template &&
          typeof template.id === 'string' &&
          typeof template.name === 'string' &&
          typeof template.content === 'string' &&
          typeof template.createdAt === 'number' &&
          typeof template.updatedAt === 'number' &&
          typeof template.order === 'number'
      );
    }

    // Copy over valid search terms
    if (data.searchTerms && Array.isArray(data.searchTerms)) {
      migratedData.searchTerms = data.searchTerms.filter(
        (searchTerm: any) =>
          searchTerm &&
          typeof searchTerm.id === 'string' &&
          typeof searchTerm.name === 'string' &&
          typeof searchTerm.pattern === 'string' &&
          typeof searchTerm.enabled === 'boolean' &&
          typeof searchTerm.createdAt === 'number' &&
          typeof searchTerm.updatedAt === 'number' &&
          typeof searchTerm.order === 'number'
      );
    }

    // Copy over valid quick tools
    if (data.quickTools && Array.isArray(data.quickTools)) {
      migratedData.quickTools = data.quickTools.filter(
        (quickTool: any) =>
          quickTool &&
          typeof quickTool.id === 'string' &&
          typeof quickTool.name === 'string' &&
          typeof quickTool.url === 'string' &&
          Array.isArray(quickTool.captureGroups) &&
          typeof quickTool.createdAt === 'number' &&
          typeof quickTool.updatedAt === 'number' &&
          typeof quickTool.order === 'number'
      );
    }

    // Preserve version
    if (data.version && typeof data.version === 'string') {
      migratedData.version = data.version;
    }

    return migratedData;
  }

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

    // Convert clips and lock states to stored format
    // Only save clips that have actual content to reduce storage size
    this.data.clips = clips
      .map((clip, index) => ({
        clip,
        isLocked: lockedIndices[index] === true,
        timestamp: Date.now(),
      }))
      .filter((storedClip) => storedClip.clip.content && storedClip.clip.content.trim() !== '');

    await this.saveData();
  }

  /**
   * Get user settings
   */
  async getSettings(): Promise<UserSettings> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Ensure hotkey settings exist with defaults if not present
    const settings = { ...this.data.settings };
    if (!settings.hotkeys) {
      settings.hotkeys = DEFAULT_HOTKEY_SETTINGS;
      // Save the updated settings
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

    // Merge with existing settings
    this.data.settings = {
      ...this.data.settings,
      ...settings,
    };

    await this.saveData();
  }

  /**
   * Update a specific setting
   */
  async updateSetting<K extends keyof UserSettings>(key: K, value: UserSettings[K]): Promise<void> {
    await this.saveSettings({ [key]: value } as Partial<UserSettings>);
  }

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
      this.data = this.migrateData(importedData);
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

    const clipCount = this.data.clips.length;
    const lockedCount = this.data.clips.filter((clip) => clip.isLocked).length;

    let dataSize = 0;
    try {
      const stats = await fs.stat(this.encryptedDataPath);
      dataSize = stats.size;
    } catch {
      // File might not exist yet
    }

    return { clipCount, lockedCount, dataSize };
  }

  /**
   * Generate a unique ID for templates
   */
  private generateTemplateId(): string {
    return 'template-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate a unique ID for any entity
   */
  private generateId(): string {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get all templates
   */
  async getTemplates(): Promise<Template[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return [...this.data.templates].sort((a, b) => a.order - b.order);
  }

  /**
   * Create a new template
   */
  async createTemplate(name: string, content: string): Promise<Template> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const template: Template = {
      id: this.generateTemplateId(),
      name,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      order: this.data.templates.length,
    };

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

    const updatedTemplate = {
      ...this.data.templates[templateIndex],
      ...updates,
      updatedAt: Date.now(),
    };

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

    // Reorder remaining templates
    this.data.templates.forEach((template, index) => {
      template.order = index;
    });

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
  async generateTextFromTemplate(templateId: string, clipContents: string[]): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const template = this.data.templates.find((t) => t.id === templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    let result = template.content;

    // Replace all {c#} tokens with corresponding clip contents
    const tokenRegex = /\{c(\d+)\}/g;
    result = result.replace(tokenRegex, (match, clipIndex) => {
      const index = parseInt(clipIndex) - 1; // Convert to 0-based index
      return index >= 0 && index < clipContents.length ? clipContents[index] : match;
    });

    return result;
  }

  // ===== SEARCH TERMS METHODS =====

  /**
   * Get all search terms
   */
  async getSearchTerms(): Promise<SearchTerm[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return [...this.data.searchTerms].sort((a, b) => a.order - b.order);
  }

  /**
   * Create a new search term
   */
  async createSearchTerm(name: string, pattern: string): Promise<SearchTerm> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const searchTerm: SearchTerm = {
      id: this.generateId(),
      name,
      pattern,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      order: this.data.searchTerms.length,
    };

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

    const updatedSearchTerm: SearchTerm = {
      ...this.data.searchTerms[searchTermIndex],
      ...updates,
      updatedAt: Date.now(),
    };

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

    // Reorder remaining search terms
    this.data.searchTerms.forEach((searchTerm, index) => {
      searchTerm.order = index;
    });

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

  // ===== QUICK TOOLS METHODS =====

  /**
   * Get all quick tools
   */
  async getQuickTools(): Promise<QuickTool[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return [...this.data.quickTools].sort((a, b) => a.order - b.order);
  }

  /**
   * Create a new quick tool
   */
  async createQuickTool(name: string, url: string, captureGroups: string[]): Promise<QuickTool> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const quickTool: QuickTool = {
      id: this.generateId(),
      name,
      url,
      captureGroups: [...captureGroups],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      order: this.data.quickTools.length,
    };

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

    const updatedQuickTool: QuickTool = {
      ...this.data.quickTools[quickToolIndex],
      ...updates,
      updatedAt: Date.now(),
    };

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

    // Reorder remaining quick tools
    this.data.quickTools.forEach((quickTool, index) => {
      quickTool.order = index;
    });

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

    // Validate config structure
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid config format');
    }

    let hasChanges = false;

    // Import search terms
    if (config.searchTerms && Array.isArray(config.searchTerms)) {
      for (const searchTermData of config.searchTerms) {
        // Skip invalid entries
        if (!searchTermData || typeof searchTermData !== 'object') {
          continue;
        }

        const now = Date.now();
        const searchTerm: SearchTerm = {
          id: this.generateId(),
          name: searchTermData.name || 'Imported Search Term',
          pattern: searchTermData.pattern || '(?<value>.*)',
          enabled: searchTermData.enabled !== false,
          createdAt: now,
          updatedAt: now,
          order:
            this.data.searchTerms.length > 0
              ? Math.max(...this.data.searchTerms.map((t) => t.order)) + 1
              : 0,
        };

        this.data.searchTerms.push(searchTerm);
        hasChanges = true;
      }
    }

    // Import quick tools
    if (config.tools && Array.isArray(config.tools)) {
      for (const toolData of config.tools) {
        // Skip invalid entries
        if (!toolData || typeof toolData !== 'object') {
          continue;
        }

        const now = Date.now();
        const quickTool: QuickTool = {
          id: this.generateId(),
          name: toolData.name || 'Imported Tool',
          url: toolData.url || 'https://example.com/?q={value}',
          captureGroups: Array.isArray(toolData.captureGroups) ? toolData.captureGroups : [],
          createdAt: now,
          updatedAt: now,
          order:
            this.data.quickTools.length > 0
              ? Math.max(...this.data.quickTools.map((t) => t.order)) + 1
              : 0,
        };

        this.data.quickTools.push(quickTool);
        hasChanges = true;
      }
    }

    // Save only once at the end if there were changes
    if (hasChanges) {
      await this.saveData();
    }
  }

  /**
   * Save window bounds to storage
   */
  async saveWindowBounds(bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): Promise<void> {
    try {
      const boundsPath = join(this.dataPath, 'window-bounds.json');
      await fs.writeFile(boundsPath, JSON.stringify(bounds, null, 2));
    } catch (error) {
      console.error('Failed to save window bounds:', error);
    }
  }

  /**
   * Get window bounds from storage
   */
  async getWindowBounds(): Promise<{ x: number; y: number; width: number; height: number } | null> {
    try {
      const boundsPath = join(this.dataPath, 'window-bounds.json');
      const data = await fs.readFile(boundsPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      // File doesn't exist or is invalid, return null
      return null;
    }
  }
}

// Export singleton instance
export const storage = new SecureStorage();
