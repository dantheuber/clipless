import type { GroupColours, QuickClipsConfig, QuickClipsImportMode } from '../../shared/types';
import { mergeGroupColours } from './group-colours';
import { processQuickClipsConfig } from './quick-tools';
import { SearchToolStorage } from './search-tool-storage';

function nextOrder(items: Array<{ order: number }>): number {
  return items.length > 0 ? Math.max(...items.map((item) => item.order)) + 1 : 0;
}

export class QuickConfigStorage extends SearchToolStorage {
  async getGroupColours(): Promise<GroupColours> {
    await this.ensureInitialized();
    return { ...(this.templatesData.groupColours ?? {}) };
  }

  async setGroupColours(groupColours: GroupColours): Promise<GroupColours> {
    await this.ensureInitialized();
    this.templatesData = { ...this.templatesData, groupColours: { ...groupColours } };
    await this.saveTemplatesData();
    return { ...(this.templatesData.groupColours ?? {}) };
  }

  async importQuickClipsConfig(
    config: QuickClipsConfig,
    mode: QuickClipsImportMode = 'merge'
  ): Promise<void> {
    await this.ensureInitialized();
    const { searchTerms, quickTools } = processQuickClipsConfig(config);
    let hasChanges = mode === 'replace';

    if (mode === 'replace') {
      this.templatesData = { templates: [], searchTerms: [], quickTools: [] };
    }

    for (const searchTerm of searchTerms) {
      searchTerm.order = nextOrder(this.templatesData.searchTerms);
      this.templatesData.searchTerms.push(searchTerm);
      hasChanges = true;
    }

    for (const quickTool of quickTools) {
      quickTool.order = nextOrder(this.templatesData.quickTools);
      this.templatesData.quickTools.push(quickTool);
      hasChanges = true;
    }

    if (config.templates && Array.isArray(config.templates) && config.templates.length > 0) {
      for (const template of config.templates) {
        if (template.id && template.name && template.content) {
          this.templatesData.templates.push({
            ...template,
            order: nextOrder(this.templatesData.templates),
          });
        }
      }
      hasChanges = true;
    }

    const groupColours = mergeGroupColours(
      this.templatesData.groupColours,
      config.groupColours,
      mode
    );
    if (JSON.stringify(groupColours) !== JSON.stringify(this.templatesData.groupColours ?? {})) {
      this.templatesData = { ...this.templatesData, groupColours };
      hasChanges = true;
    }

    if (hasChanges) await this.saveTemplatesData();
  }
}
