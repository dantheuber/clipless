import type { AppData, StoredClip, Template, SearchTerm, QuickTool } from '../../shared/types';
import { DEFAULT_DATA, DEFAULT_SETTINGS } from './defaults';

/**
 * Migrate data from older versions
 */
export function migrateData(data: unknown): AppData {
  // Start with default data
  const migratedData: AppData = { ...DEFAULT_DATA };

  // Validate data structure
  if (!data || typeof data !== 'object') {
    return migratedData;
  }

  const dataObj = data as Record<string, unknown>;

  // Copy over valid clips
  if (dataObj.clips && Array.isArray(dataObj.clips)) {
    migratedData.clips = dataObj.clips.filter(
      (item: unknown): item is StoredClip =>
        item !== null &&
        typeof item === 'object' &&
        'clip' in item &&
        item.clip !== null &&
        typeof item.clip === 'object' &&
        'type' in item.clip &&
        typeof item.clip.type === 'string' &&
        'content' in item.clip &&
        typeof item.clip.content === 'string'
    );
  }

  // Copy over valid settings
  if (dataObj.settings && typeof dataObj.settings === 'object') {
    migratedData.settings = {
      ...DEFAULT_SETTINGS,
      ...dataObj.settings,
    };
  }

  // Copy over valid templates
  if (dataObj.templates && Array.isArray(dataObj.templates)) {
    migratedData.templates = dataObj.templates.filter(
      (template: unknown): template is Template =>
        template !== null &&
        typeof template === 'object' &&
        'id' in template &&
        typeof template.id === 'string' &&
        'name' in template &&
        typeof template.name === 'string' &&
        'content' in template &&
        typeof template.content === 'string' &&
        'createdAt' in template &&
        typeof template.createdAt === 'number' &&
        'updatedAt' in template &&
        typeof template.updatedAt === 'number' &&
        'order' in template &&
        typeof template.order === 'number'
    );
  }

  // Copy over valid search terms
  if (dataObj.searchTerms && Array.isArray(dataObj.searchTerms)) {
    migratedData.searchTerms = dataObj.searchTerms.filter(
      (searchTerm: unknown): searchTerm is SearchTerm =>
        searchTerm !== null &&
        typeof searchTerm === 'object' &&
        'id' in searchTerm &&
        typeof searchTerm.id === 'string' &&
        'name' in searchTerm &&
        typeof searchTerm.name === 'string' &&
        'pattern' in searchTerm &&
        typeof searchTerm.pattern === 'string' &&
        'enabled' in searchTerm &&
        typeof searchTerm.enabled === 'boolean' &&
        'createdAt' in searchTerm &&
        typeof searchTerm.createdAt === 'number' &&
        'updatedAt' in searchTerm &&
        typeof searchTerm.updatedAt === 'number' &&
        'order' in searchTerm &&
        typeof searchTerm.order === 'number'
    );
  }

  // Copy over valid quick tools
  if (dataObj.quickTools && Array.isArray(dataObj.quickTools)) {
    migratedData.quickTools = dataObj.quickTools.filter(
      (quickTool: unknown): quickTool is QuickTool =>
        quickTool !== null &&
        typeof quickTool === 'object' &&
        'id' in quickTool &&
        typeof quickTool.id === 'string' &&
        'name' in quickTool &&
        typeof quickTool.name === 'string' &&
        'url' in quickTool &&
        typeof quickTool.url === 'string' &&
        'captureGroups' in quickTool &&
        Array.isArray(quickTool.captureGroups) &&
        'createdAt' in quickTool &&
        typeof quickTool.createdAt === 'number' &&
        'updatedAt' in quickTool &&
        typeof quickTool.updatedAt === 'number' &&
        'order' in quickTool &&
        typeof quickTool.order === 'number'
    );
  }

  // Preserve version
  if (dataObj.version && typeof dataObj.version === 'string') {
    migratedData.version = dataObj.version;
  }

  return migratedData;
}
