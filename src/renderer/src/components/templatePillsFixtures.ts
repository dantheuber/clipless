import type { ScanResult, Template } from '../../../shared/types';

export const template = (id: string, name: string, content: string): Template => ({
  id,
  name,
  content,
  createdAt: 0,
  updatedAt: 0,
  order: 0,
});

export const templateScan = (matches: [string, string][]): ScanResult => ({
  matches: matches.map(([group, value], index) => ({
    group,
    value,
    start: index * 20,
    end: index * 20 + value.length,
    termId: 't',
  })),
  groups: [...new Set(matches.map(([group]) => group))],
  errors: [],
  large: false,
});
