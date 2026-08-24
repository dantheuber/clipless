import type { QuickTool, SearchTerm } from '../../shared/types';
import { removeById, replaceById } from './collection';
import {
  createQuickToolObject,
  reorderQuickToolsArray,
  sortQuickToolsByOrder,
  updateQuickToolObject,
} from './quick-tools';
import {
  createSearchTermObject,
  reorderSearchTermsArray,
  sortSearchTermsByOrder,
  updateSearchTermObject,
} from './search-terms';
import { TemplateStorage } from './template-storage';

export class SearchToolStorage extends TemplateStorage {
  async getSearchTerms(): Promise<SearchTerm[]> {
    await this.ensureInitialized();
    return sortSearchTermsByOrder(this.templatesData.searchTerms);
  }

  async createSearchTerm(name: string, pattern: string): Promise<SearchTerm> {
    await this.ensureInitialized();
    const item = createSearchTermObject(name, pattern, this.templatesData.searchTerms.length);
    this.templatesData.searchTerms.push(item);
    await this.saveTemplatesData();
    return item;
  }

  async updateSearchTerm(id: string, updates: Partial<SearchTerm>): Promise<SearchTerm> {
    await this.ensureInitialized();
    const updated = replaceById(
      this.templatesData.searchTerms,
      id,
      'Search term not found',
      (item) => updateSearchTermObject(item, updates)
    );
    await this.saveTemplatesData();
    return updated;
  }

  async deleteSearchTerm(id: string): Promise<void> {
    await this.ensureInitialized();
    removeById(this.templatesData.searchTerms, id, 'Search term not found');
    this.templatesData.searchTerms = reorderSearchTermsArray(this.templatesData.searchTerms);
    await this.saveTemplatesData();
  }

  async getQuickTools(): Promise<QuickTool[]> {
    await this.ensureInitialized();
    return sortQuickToolsByOrder(this.templatesData.quickTools);
  }

  async createQuickTool(name: string, url: string, captureGroups: string[]): Promise<QuickTool> {
    await this.ensureInitialized();
    const item = createQuickToolObject(
      name,
      url,
      captureGroups,
      this.templatesData.quickTools.length
    );
    this.templatesData.quickTools.push(item);
    await this.saveTemplatesData();
    return item;
  }

  async updateQuickTool(id: string, updates: Partial<QuickTool>): Promise<QuickTool> {
    await this.ensureInitialized();
    const updated = replaceById(this.templatesData.quickTools, id, 'Quick tool not found', (item) =>
      updateQuickToolObject(item, updates)
    );
    await this.saveTemplatesData();
    return updated;
  }

  async deleteQuickTool(id: string): Promise<void> {
    await this.ensureInitialized();
    removeById(this.templatesData.quickTools, id, 'Quick tool not found');
    this.templatesData.quickTools = reorderQuickToolsArray(this.templatesData.quickTools);
    await this.saveTemplatesData();
  }
}
