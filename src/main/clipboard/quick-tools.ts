import { storage } from '../storage';

// Quick tools management functions
export const getAllQuickTools = async () => {
  try {
    return await storage.getQuickTools();
  } catch (error) {
    console.error('Failed to get quick tools:', error);
    throw error;
  }
};

export const createQuickTool = async (name: string, url: string, captureGroups: string[]) => {
  try {
    return await storage.createQuickTool(name, url, captureGroups);
  } catch (error) {
    console.error('Failed to create quick tool:', error);
    throw error;
  }
};

export const updateQuickTool = async (id: string, updates: any) => {
  try {
    return await storage.updateQuickTool(id, updates);
  } catch (error) {
    console.error('Failed to update quick tool:', error);
    throw error;
  }
};

export const deleteQuickTool = async (id: string) => {
  try {
    await storage.deleteQuickTool(id);
  } catch (error) {
    console.error('Failed to delete quick tool:', error);
    throw error;
  }
};

export const reorderQuickTools = async (tools: any[]) => {
  try {
    await storage.reorderQuickTools(tools);
  } catch (error) {
    console.error('Failed to reorder quick tools:', error);
    throw error;
  }
};

export const validateToolUrl = async (url: string, captureGroups: string[]) => {
  try {
    const errors: string[] = [];

    // Check if URL is valid
    try {
      new URL(url.replace(/\{[^}]+\}/g, 'test')); // Replace tokens with test values
    } catch {
      errors.push('Invalid URL format');
    }

    // Check if all capture groups in URL are in the provided list
    const urlTokens = url.match(/\{([^}]+)\}/g) || [];
    const urlCaptureGroups = urlTokens.map((token) => token.slice(1, -1));

    for (const group of urlCaptureGroups) {
      if (!captureGroups.includes(group)) {
        errors.push(`Token '{${group}}' is not in the selected capture groups`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error('Failed to validate tool URL:', error);
    throw error;
  }
};
