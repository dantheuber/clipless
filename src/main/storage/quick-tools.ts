import type { QuickTool, SearchTerm } from '../../shared/types';
import { generateId } from './search-terms';

/**
 * Create a new quick tool object
 */
export function createQuickToolObject(
  name: string,
  url: string,
  captureGroups: string[],
  order: number
): QuickTool {
  return {
    id: generateId(),
    name,
    url,
    captureGroups: [...captureGroups],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    order,
  };
}

/**
 * Update an existing quick tool with new data
 */
export function updateQuickToolObject(quickTool: QuickTool, updates: Partial<QuickTool>): QuickTool {
  return {
    ...quickTool,
    ...updates,
    updatedAt: Date.now(),
  };
}

/**
 * Sort quick tools by order
 */
export function sortQuickToolsByOrder(quickTools: QuickTool[]): QuickTool[] {
  return [...quickTools].sort((a, b) => a.order - b.order);
}

/**
 * Reorder quick tools array
 */
export function reorderQuickToolsArray(quickTools: QuickTool[]): QuickTool[] {
  return quickTools.map((quickTool, index) => ({
    ...quickTool,
    order: index,
  }));
}

/**
 * Import configuration data for quick clips
 */
export function processQuickClipsConfig(config: any): {
  searchTerms: SearchTerm[];
  quickTools: QuickTool[];
} {
  const result = {
    searchTerms: [] as SearchTerm[],
    quickTools: [] as QuickTool[],
  };

  // Validate config structure
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid config format');
  }

  // Process search terms
  if (config.searchTerms && Array.isArray(config.searchTerms)) {
    for (const searchTermData of config.searchTerms) {
      // Skip invalid entries
      if (!searchTermData || typeof searchTermData !== 'object') {
        continue;
      }

      const now = Date.now();
      const searchTerm: SearchTerm = {
        id: generateId(),
        name: searchTermData.name || 'Imported Search Term',
        pattern: searchTermData.pattern || '(?<value>.*)',
        enabled: searchTermData.enabled !== false,
        createdAt: now,
        updatedAt: now,
        order: result.searchTerms.length,
      };

      result.searchTerms.push(searchTerm);
    }
  }

  // Process quick tools
  if (config.tools && Array.isArray(config.tools)) {
    for (const toolData of config.tools) {
      // Skip invalid entries
      if (!toolData || typeof toolData !== 'object') {
        continue;
      }

      const now = Date.now();
      const quickTool: QuickTool = {
        id: generateId(),
        name: toolData.name || 'Imported Tool',
        url: toolData.url || 'https://example.com/?q={value}',
        captureGroups: Array.isArray(toolData.captureGroups) ? toolData.captureGroups : [],
        createdAt: now,
        updatedAt: now,
        order: result.quickTools.length,
      };

      result.quickTools.push(quickTool);
    }
  }

  return result;
}
