import type { AppData } from '../../shared/types';
import { DEFAULT_DATA, DEFAULT_SETTINGS } from './defaults';

/**
 * Migrate data from older versions
 */
export function migrateData(data: any): AppData {
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
