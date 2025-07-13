import { storage } from '../storage';
import type { PatternMatch } from '../../shared/types';

// Search terms management functions
export const getAllSearchTerms = async () => {
  try {
    return await storage.getSearchTerms();
  } catch (error) {
    console.error('Failed to get search terms:', error);
    throw error;
  }
};

export const createSearchTerm = async (name: string, pattern: string) => {
  try {
    return await storage.createSearchTerm(name, pattern);
  } catch (error) {
    console.error('Failed to create search term:', error);
    throw error;
  }
};

export const updateSearchTerm = async (id: string, updates: any) => {
  try {
    return await storage.updateSearchTerm(id, updates);
  } catch (error) {
    console.error('Failed to update search term:', error);
    throw error;
  }
};

export const deleteSearchTerm = async (id: string) => {
  try {
    await storage.deleteSearchTerm(id);
  } catch (error) {
    console.error('Failed to delete search term:', error);
    throw error;
  }
};

export const reorderSearchTerms = async (searchTerms: any[]) => {
  try {
    await storage.reorderSearchTerms(searchTerms);
  } catch (error) {
    console.error('Failed to reorder search terms:', error);
    throw error;
  }
};

export const testSearchTerm = async (pattern: string, testText: string): Promise<PatternMatch[]> => {
  try {
    // Test a single pattern against text
    const regex = new RegExp(pattern, 'g');
    const matches: PatternMatch[] = [];
    let match;

    while ((match = regex.exec(testText)) !== null) {
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
          searchTermId: 'test',
          searchTermName: 'Test Pattern',
          captures,
        });
      }
    }

    return matches;
  } catch (error) {
    console.error('Failed to test search term:', error);
    throw error;
  }
};
