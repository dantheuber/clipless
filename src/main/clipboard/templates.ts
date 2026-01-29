import { storage } from '../storage';

// Template management functions
export const getAllTemplates = async () => {
  try {
    return await storage.getTemplates();
  } catch (error) {
    console.error('Failed to get templates:', error);
    return [];
  }
};

export const createTemplate = async (name: string, content: string) => {
  try {
    return await storage.createTemplate(name, content);
  } catch (error) {
    console.error('Failed to create template:', error);
    throw error;
  }
};

export const updateTemplate = async (id: string, updates: any) => {
  try {
    return await storage.updateTemplate(id, updates);
  } catch (error) {
    console.error('Failed to update template:', error);
    throw error;
  }
};

export const deleteTemplate = async (id: string) => {
  try {
    await storage.deleteTemplate(id);
  } catch (error) {
    console.error('Failed to delete template:', error);
    throw error;
  }
};

export const reorderTemplates = async (templates: any[]) => {
  try {
    await storage.reorderTemplates(templates);
  } catch (error) {
    console.error('Failed to reorder templates:', error);
    throw error;
  }
};

export const generateTextFromTemplate = async (
  templateId: string,
  clipContents: string[],
  captures?: Record<string, string>
) => {
  try {
    return await storage.generateTextFromTemplate(templateId, clipContents, captures);
  } catch (error) {
    console.error('Failed to generate text from template:', error);
    throw error;
  }
};
