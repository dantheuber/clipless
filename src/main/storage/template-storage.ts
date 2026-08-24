import type { Template } from '../../shared/types';
import { generateTextFromTemplate } from '../../shared/templates';
import { removeById, replaceById } from './collection';
import { ClipSettingsStorage } from './clip-settings-storage';
import {
  createTemplateObject,
  reorderTemplatesArray,
  sortTemplatesByOrder,
  updateTemplateObject,
} from './templates';

export class TemplateStorage extends ClipSettingsStorage {
  async getTemplates(): Promise<Template[]> {
    await this.ensureInitialized();
    return sortTemplatesByOrder(this.templatesData.templates);
  }

  async createTemplate(name: string, content: string): Promise<Template> {
    await this.ensureInitialized();
    const template = createTemplateObject(name, content, this.templatesData.templates.length);
    this.templatesData.templates.push(template);
    await this.saveTemplatesData();
    return template;
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template> {
    await this.ensureInitialized();
    const updated = replaceById(
      this.templatesData.templates,
      id,
      'Template not found',
      (template) => updateTemplateObject(template, updates)
    );
    await this.saveTemplatesData();
    return updated;
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.ensureInitialized();
    removeById(this.templatesData.templates, id, 'Template not found');
    this.templatesData.templates = reorderTemplatesArray(this.templatesData.templates);
    await this.saveTemplatesData();
  }

  async reorderTemplates(templates: Template[]): Promise<void> {
    await this.ensureInitialized();
    templates.forEach((template, index) => {
      const existing = this.templatesData.templates.find((item) => item.id === template.id);
      if (existing) existing.order = index;
    });
    this.templatesData.templates.sort((a, b) => a.order - b.order);
    await this.saveTemplatesData();
  }

  async generateTextFromTemplate(
    templateId: string,
    clipContents: string[],
    captures?: Record<string, string>
  ): Promise<string> {
    await this.ensureInitialized();
    const template = this.templatesData.templates.find((item) => item.id === templateId);
    if (!template) throw new Error('Template not found');
    return generateTextFromTemplate(template, clipContents, captures);
  }
}
