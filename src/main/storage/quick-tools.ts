import type { QuickTool, SearchTerm } from '../../shared/types';
import { generateId } from './search-terms';

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

export function updateQuickToolObject(
  quickTool: QuickTool,
  updates: Partial<QuickTool>
): QuickTool {
  return {
    ...quickTool,
    ...updates,
    updatedAt: Date.now(),
  };
}

export function sortQuickToolsByOrder(quickTools: QuickTool[]): QuickTool[] {
  return [...quickTools].sort((a, b) => a.order - b.order);
}

export function reorderQuickToolsArray(quickTools: QuickTool[]): QuickTool[] {
  return quickTools.map((quickTool, index) => ({
    ...quickTool,
    order: index,
  }));
}

export function processQuickClipsConfig(config: unknown): {
  searchTerms: SearchTerm[];
  quickTools: QuickTool[];
} {
  const result = {
    searchTerms: [] as SearchTerm[],
    quickTools: [] as QuickTool[],
  };

  if (!config || typeof config !== 'object') {
    throw new Error('Invalid config format');
  }

  const configObj = config as Record<string, unknown>;

  if (configObj.searchTerms && Array.isArray(configObj.searchTerms)) {
    for (const searchTermData of configObj.searchTerms) {
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

  if (configObj.tools && Array.isArray(configObj.tools)) {
    for (const toolData of configObj.tools) {
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
