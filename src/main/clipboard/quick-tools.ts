import { storage } from '../storage';
import type { QuickTool } from '../../shared/types';

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

export const updateQuickTool = async (id: string, updates: Partial<QuickTool>) => {
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
