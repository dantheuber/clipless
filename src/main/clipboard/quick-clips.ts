import { storage } from '../storage';
import type { QuickClipsConfig, QuickClipsImportMode } from '../../shared/types';

export const exportQuickClipsConfig = async () => {
  try {
    const searchTerms = await storage.getSearchTerms();
    const tools = await storage.getQuickTools();
    const templates = await storage.getTemplates();
    const groupColours = await storage.getGroupColours();

    const config: QuickClipsConfig = {
      searchTerms,
      tools,
      templates,
      groupColours,
      version: '2.0.0',
    };
    return config;
  } catch (error) {
    console.error('Failed to export quick clips config:', error);
    throw error;
  }
};

export const importQuickClipsConfig = async (
  config: QuickClipsConfig,
  mode: QuickClipsImportMode = 'merge'
) => {
  try {
    // Use the new batch import method to avoid race conditions
    await storage.importQuickClipsConfig(config, mode);
  } catch (error) {
    console.error('Failed to import quick clips config:', error);
    throw error;
  }
};
