import { storage } from '../storage';
import type { SearchTerm } from '../../shared/types';

const RESERVED_GROUP_NAME = /^c\d+$/;

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

export const updateSearchTerm = async (id: string, updates: Partial<SearchTerm>) => {
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
