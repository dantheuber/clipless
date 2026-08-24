import type { QuickClipsConfig } from '../../../../../shared/types';
import { patternGroups } from '../../../../../shared/readiness';

export interface ConfigSummary {
  terms: number;
  tools: number;
  templates: number;
  groups: string[];
  colours: number;
}

export type ConfigParse = { summary: ConfigSummary; config: QuickClipsConfig } | { error: string };

export function summarizeConfig(text: string): ConfigParse {
  if (text.trim().length === 0) return { error: '' };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'Not valid JSON yet.' };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { error: 'Not a Quick Clips config: expected an object with searchTerms and tools.' };
  }
  const record = data as Record<string, unknown>;
  const terms = Array.isArray(record.searchTerms) ? record.searchTerms : [];
  const tools = Array.isArray(record.tools) ? record.tools : [];
  const templates = Array.isArray(record.templates) ? record.templates : [];
  if (
    !Array.isArray(record.searchTerms) &&
    !Array.isArray(record.tools) &&
    !Array.isArray(record.templates)
  ) {
    return { error: 'Not a Quick Clips config: it has no searchTerms, tools or templates.' };
  }
  const groups: string[] = [];
  for (const term of terms) {
    const pattern = (term as { pattern?: unknown })?.pattern;
    if (typeof pattern !== 'string') continue;
    for (const g of patternGroups(pattern)) if (!groups.includes(g)) groups.push(g);
  }
  const colours =
    record.groupColours && typeof record.groupColours === 'object'
      ? Object.keys(record.groupColours as object).length
      : 0;
  return {
    summary: {
      terms: terms.length,
      tools: tools.length,
      templates: templates.length,
      groups,
      colours,
    },
    config: record as unknown as QuickClipsConfig,
  };
}
