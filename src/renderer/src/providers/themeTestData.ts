import { createElement } from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { ThemeProvider } from './theme';
import { ThemeDisplay } from './themeTestHarness';

export function renderTheme() {
  return render(createElement(ThemeProvider, null, createElement(ThemeDisplay)));
}

type ThemeEvents = {
  settings: ((settings: Record<string, unknown>) => void) | null;
  mediaChange: (() => void) | null;
};

export function configureThemeApi(): ThemeEvents {
  const events: ThemeEvents = { settings: null, mediaChange: null };
  Object.assign(window, {
    api: {
      storageGetSettings: vi.fn().mockResolvedValue({ theme: 'system' }),
      storageSaveSettings: vi.fn().mockResolvedValue(undefined),
      onSettingsUpdated: vi.fn().mockImplementation((callback) => {
        events.settings = callback;
        return vi.fn();
      }),
    },
  });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn().mockImplementation((_event, callback) => {
        events.mediaChange = callback;
      }),
      removeEventListener: vi.fn(),
    })),
  });
  return events;
}

export function preferDarkTheme(): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}
