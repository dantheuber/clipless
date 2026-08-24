import type { Template } from '../../shared/types';

export function generateTemplateId(): string {
  return 'template-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

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

export function updateTemplateObject(template: Template, updates: Partial<Template>): Template {
  return {
    ...template,
    ...updates,
    updatedAt: Date.now(),
  };
}

export function sortTemplatesByOrder(templates: Template[]): Template[] {
  return [...templates].sort((a, b) => a.order - b.order);
}

export function reorderTemplatesArray(templates: Template[]): Template[] {
  return templates.map((template, index) => ({
    ...template,
    order: index,
  }));
}
