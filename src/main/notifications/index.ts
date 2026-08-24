import { Notification } from 'electron';
import { storage } from '../storage';

export async function showNotification(title: string, body: string): Promise<void> {
  try {
    if (!Notification.isSupported()) return;

    const settings = await storage.getSettings();
    if (settings.showNotifications === false) return;

    const notification = new Notification({ title, body });
    notification.show();
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}
