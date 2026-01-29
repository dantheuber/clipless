import type { Template } from '../../shared/types';

/**
 * Generate a unique ID for templates
 */
export function generateTemplateId(): string {
  return 'template-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Create a new template object
 */
export function createTemplateObject(name: string, content: string, order: number): Template {
  return {
    id: generateTemplateId(),
    name,
    content,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    order,
  };
}

/**
 * Update an existing template with new data
 */
export function updateTemplateObject(template: Template, updates: Partial<Template>): Template {
  return {
    ...template,
    ...updates,
    updatedAt: Date.now(),
  };
}

/**
 * Sort templates by order
 */
export function sortTemplatesByOrder(templates: Template[]): Template[] {
  return [...templates].sort((a, b) => a.order - b.order);
}

/**
 * Reorder templates array
 */
export function reorderTemplatesArray(templates: Template[]): Template[] {
  return templates.map((template, index) => ({
    ...template,
    order: index,
  }));
}

/**
 * Extract template tokens into positional ({c1}) and named ({groupName}) categories.
 */
export function extractTemplateTokens(content: string): {
  positional: string[];
  named: string[];
} {
  const positional: string[] = [];
  const named: string[] = [];
  const tokenRegex = /\{(\w+)\}/g;
  let match;

  while ((match = tokenRegex.exec(content)) !== null) {
    const token = match[1];
    if (/^c\d+$/.test(token)) {
      if (!positional.includes(token)) positional.push(token);
    } else {
      if (!named.includes(token)) named.push(token);
    }
  }

  return { positional, named };
}

/**
 * Generate text from template using clipboard contents and optional named captures.
 */
export function generateTextFromTemplate(
  template: Template,
  clipContents: string[],
  captures?: Record<string, string>
): string {
  let result = template.content;

  // First pass: replace named capture group tokens (skip positional {c\d+} tokens)
  if (captures) {
    result = result.replace(/\{(\w+)\}/g, (match, tokenName) => {
      if (/^c\d+$/.test(tokenName)) return match; // skip positional
      return tokenName in captures ? captures[tokenName] : match;
    });
  }

  // Second pass: replace positional {c#} tokens with clip contents
  result = result.replace(/\{c(\d+)\}/g, (match, clipIndex) => {
    const index = parseInt(clipIndex) - 1; // Convert to 0-based index
    return index >= 0 && index < clipContents.length ? clipContents[index] : match;
  });

  return result;
}
