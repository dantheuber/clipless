import { storage } from '../storage';
import type { PatternMatch } from '../../shared/types';

const RESERVED_GROUP_NAME = /^c\d+$/;

/**
 * Validate that named capture groups in a pattern don't use reserved names (c1, c2, etc.)
 * These names conflict with positional template tokens.
 */
function validateCaptureGroupNames(pattern: string): void {
  const groupNameRegex = /\(\?<(\w+)>/g;
  let match;
  while ((match = groupNameRegex.exec(pattern)) !== null) {
    const name = match[1];
    if (RESERVED_GROUP_NAME.test(name)) {
      throw new Error(
        `Capture group name "${name}" is reserved. Names matching "c" followed by digits (c1, c2, etc.) conflict with positional template tokens.`
      );
    }
  }
}

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
    validateCaptureGroupNames(pattern);
    return await storage.createSearchTerm(name, pattern);
  } catch (error) {
    console.error('Failed to create search term:', error);
    throw error;
  }
};

export const updateSearchTerm = async (id: string, updates: any) => {
  try {
    if (updates.pattern) {
      validateCaptureGroupNames(updates.pattern);
    }
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

export const testSearchTerm = async (
  pattern: string,
  testText: string
): Promise<PatternMatch[]> => {
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
