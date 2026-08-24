import type { SearchTerm } from '../../shared/types';

export function generateId(): string {
  return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

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

export function sortSearchTermsByOrder(searchTerms: SearchTerm[]): SearchTerm[] {
  return [...searchTerms].sort((a, b) => a.order - b.order);
}

export function reorderSearchTermsArray(searchTerms: SearchTerm[]): SearchTerm[] {
  return searchTerms.map((searchTerm, index) => ({
    ...searchTerm,
    order: index,
  }));
}
