import type { SearchTerm } from '../../shared/types';

/**
 * Generate a unique ID for any entity
 */
export function generateId(): string {
  return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Create a new search term object
 */
export function createSearchTermObject(name: string, pattern: string, order: number): SearchTerm {
  return {
    id: generateId(),
    name,
    pattern,
    enabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    order,
  };
}

/**
 * Update an existing search term with new data
 */
export function updateSearchTermObject(
  searchTerm: SearchTerm,
  updates: Partial<SearchTerm>
): SearchTerm {
  return {
    ...searchTerm,
    ...updates,
    updatedAt: Date.now(),
  };
}

/**
 * Sort search terms by order
 */
export function sortSearchTermsByOrder(searchTerms: SearchTerm[]): SearchTerm[] {
  return [...searchTerms].sort((a, b) => a.order - b.order);
}

/**
 * Reorder search terms array
 */
export function reorderSearchTermsArray(searchTerms: SearchTerm[]): SearchTerm[] {
  return searchTerms.map((searchTerm, index) => ({
    ...searchTerm,
    order: index,
  }));
}
