import { safeStorage, app } from 'electron';
import { join } from 'path';
import { promises as fs } from 'fs';
import type { ClipItem, StoredClip, UserSettings, AppData, StorageStats, Template } from '../shared/types';
import { DEFAULT_MAX_CLIPS } from '../shared/constants';

const DEFAULT_SETTINGS: UserSettings = {
  maxClips: DEFAULT_MAX_CLIPS,
  startMinimized: false,
  autoStart: false,
  theme: 'system'
};

const DEFAULT_DATA: AppData = {
  clips: [],
  settings: DEFAULT_SETTINGS,
  templates: [],
  version: '1.0.0'
};

class SecureStorage {
  private dataPath: string;
  private encryptedDataPath: string;
  private isInitialized = false;
  private data: AppData = DEFAULT_DATA;

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

    try {
      // Serialize data
      const jsonData = JSON.stringify(this.data, null, 2);
      
      // Encrypt data
      const encryptedData = safeStorage.encryptString(jsonData);
      
      // Write to file atomically
      const tempPath = this.encryptedDataPath + '.tmp';
      await fs.writeFile(tempPath, encryptedData);
      await fs.rename(tempPath, this.encryptedDataPath);
      
      console.log('Data saved to secure storage');
    } catch (error) {
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
      migratedData.clips = data.clips.filter((item: any) => 
        item && 
        item.clip && 
        typeof item.clip.type === 'string' && 
        typeof item.clip.content === 'string'
      );
    }

    // Copy over valid settings
    if (data.settings && typeof data.settings === 'object') {
      migratedData.settings = {
        ...DEFAULT_SETTINGS,
        ...data.settings
      };
    }

    // Copy over valid templates
    if (data.templates && Array.isArray(data.templates)) {
      migratedData.templates = data.templates.filter((template: any) => 
        template && 
        typeof template.id === 'string' &&
        typeof template.name === 'string' &&
        typeof template.content === 'string' &&
        typeof template.createdAt === 'number' &&
        typeof template.updatedAt === 'number' &&
        typeof template.order === 'number'
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
        timestamp: Date.now()
      }))
      .filter(storedClip => storedClip.clip.content && storedClip.clip.content.trim() !== '');

    await this.saveData();
  }

  /**
   * Get user settings
   */
  async getSettings(): Promise<UserSettings> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return { ...this.data.settings };
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
      ...settings
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
    } catch (error) {
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
    const lockedCount = this.data.clips.filter(clip => clip.isLocked).length;
    
    let dataSize = 0;
    try {
      const stats = await fs.stat(this.encryptedDataPath);
      dataSize = stats.size;
    } catch (error) {
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
      order: this.data.templates.length
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

    const templateIndex = this.data.templates.findIndex(t => t.id === id);
    if (templateIndex === -1) {
      throw new Error('Template not found');
    }

    const updatedTemplate = {
      ...this.data.templates[templateIndex],
      ...updates,
      updatedAt: Date.now()
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

    const templateIndex = this.data.templates.findIndex(t => t.id === id);
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
      const existingTemplate = this.data.templates.find(t => t.id === template.id);
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

    const template = this.data.templates.find(t => t.id === templateId);
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
}

// Export singleton instance
export const storage = new SecureStorage();
