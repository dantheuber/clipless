import { storage } from '../storage';
import type { PatternMatch, QuickClipsConfig, QuickClipsImportMode } from '../../shared/types';

// Quick clips scanning functions
export const scanTextForPatterns = async (text: string): Promise<PatternMatch[]> => {
  try {
    const searchTerms = await storage.getSearchTerms();
    const matches: PatternMatch[] = [];

    for (const searchTerm of searchTerms) {
      if (!searchTerm.enabled) continue;

      try {
        const regex = new RegExp(searchTerm.pattern, 'g');
        let match;

        while ((match = regex.exec(text)) !== null) {
          const captures: Record<string, string> = {};

          // Extract named groups
          if (match.groups) {
            Object.entries(match.groups).forEach(([groupName, value]) => {
              if (value !== undefined && value !== null && typeof value === 'string') {
                captures[groupName] = value;
              }
            });
          }

          if (Object.keys(captures).length > 0) {
            matches.push({
              searchTermId: searchTerm.id,
              searchTermName: searchTerm.name,
              captures,
            });
          }
        }
      } catch (error) {
        console.error(`Failed to test pattern for search term ${searchTerm.name}:`, error);
        // Continue with other patterns
      }
    }

    return matches;
  } catch (error) {
    console.error('Failed to scan text:', error);
    throw error;
  }
};

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
