import { act, cleanup, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GROUP_COLOUR_SLOTS } from '../../../shared/groupColours';
import { applySlotVariables } from './theme';
import { configureThemeApi, renderTheme } from './themeTestData';

beforeEach(configureThemeApi);
afterEach(cleanup);

describe('ThemeProvider optional settings listener', () => {
  it('does not listen for settings updates when api.onSettingsUpdated is missing', async () => {
    Object.assign(window, {
      api: {
        storageGetSettings: vi.fn().mockResolvedValue({ theme: 'system' }),
        storageSaveSettings: vi.fn(),
      },
    });
    await act(async () => renderTheme());
    expect(screen.getByTestId('theme').textContent).toBe('system');
  });
});

describe('applySlotVariables', () => {
  it('sets every slot variable from the pair that matches the theme', () => {
    applySlotVariables('dark');
    const root = document.documentElement.style;
    GROUP_COLOUR_SLOTS.forEach((slot, index) => {
      expect(root.getPropertyValue(`--slot-${index}`)).toBe(slot.dark);
    });
    applySlotVariables('light');
    expect(root.getPropertyValue('--slot-0')).toBe(GROUP_COLOUR_SLOTS[0].light);
    expect(root.getPropertyValue('--slot-11')).toBe(GROUP_COLOUR_SLOTS[11].light);
  });
});
