import type { ToastFn } from '../useToast';

export async function openTabs(urls: string[], toast: ToastFn): Promise<void> {
  if (urls.length === 0) return;
  try {
    const opened = await window.api.openExternalUrls(urls);
    toast(`Opened ${opened} ${opened === 1 ? 'tab' : 'tabs'}`, urls);
  } catch (error) {
    console.error('Failed to open tabs:', error);
    toast('Could not open the tabs', String(error));
  }
}

export const tabCount = (n: number): string => `${n} ${n === 1 ? 'tab' : 'tabs'}`;
