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
 * Generate text from template using clipboard contents
 */
export function generateTextFromTemplate(template: Template, clipContents: string[]): string {
  let result = template.content;

  // Replace all {c#} tokens with corresponding clip contents
  const tokenRegex = /\{c(\d+)\}/g;
  result = result.replace(tokenRegex, (match, clipIndex) => {
    const index = parseInt(clipIndex) - 1; // Convert to 0-based index
    return index >= 0 && index < clipContents.length ? clipContents[index] : match;
  });

  return result;
}
