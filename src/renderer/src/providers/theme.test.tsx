import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { ThemeDisplay } from './themeTestHarness';
import { configureThemeApi, preferDarkTheme, renderTheme } from './themeTestData';

describe('ThemeProvider', () => {
  let events: ReturnType<typeof configureThemeApi>;

  beforeEach(() => {
    events = configureThemeApi();
  });

  afterEach(() => {
    cleanup();
  });

  it('provides default theme values', () => {
    renderTheme();
    expect(screen.getByTestId('theme').textContent).toBe('system');
  });

  it('allows setting theme to light', async () => {
    renderTheme();

    await act(async () => {
      screen.getByText('Set Light').click();
    });

    expect(screen.getByTestId('effective').textContent).toBe('light');
    expect(screen.getByTestId('isLight').textContent).toBe('true');
    expect(screen.getByTestId('isDark').textContent).toBe('false');
  });

  it('allows setting theme to dark', async () => {
    await act(async () => {
      renderTheme();
    });

    await act(async () => {
      screen.getByText('Set Dark').click();
    });

    expect(screen.getByTestId('effective').textContent).toBe('dark');
  });

  it('loads theme from settings on mount', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.api as any).storageGetSettings = vi.fn().mockResolvedValue({ theme: 'dark' });

    await act(async () => {
      renderTheme();
    });

    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(screen.getByTestId('effective').textContent).toBe('dark');
  });

  it('handles theme loading error by defaulting to system', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.api as any).storageGetSettings = vi.fn().mockRejectedValue(new Error('fail'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      renderTheme();
    });

    expect(screen.getByTestId('theme').textContent).toBe('system');
    spy.mockRestore();
  });

  it('handles missing api gracefully during load', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).api = undefined;

    await act(async () => {
      renderTheme();
    });

    expect(screen.getByTestId('theme').textContent).toBe('system');
  });

  it('responds to settings updates from other windows', async () => {
    await act(async () => {
      renderTheme();
    });

    expect(events.settings).toBeTruthy();

    await act(async () => {
      events.settings!({ theme: 'light' });
    });

    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(screen.getByTestId('effective').textContent).toBe('light');
  });

  it('handles save error gracefully', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.api as any).storageSaveSettings = vi.fn().mockRejectedValue(new Error('save fail'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderTheme();

    await act(async () => {
      screen.getByText('Set Light').click();
    });

    expect(screen.getByTestId('effective').textContent).toBe('light');
    spy.mockRestore();
  });

  it('handles missing api during save', async () => {
    renderTheme();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).api = undefined;

    await act(async () => {
      screen.getByText('Set Light').click();
    });

    expect(screen.getByTestId('effective').textContent).toBe('light');
  });

  it('resolves system theme to light when matchMedia prefers light', () => {
    renderTheme();

    expect(screen.getByTestId('theme').textContent).toBe('system');
  });

  it('throws when useTheme is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeDisplay />)).toThrow('useTheme must be used within a ThemeProvider');
    spy.mockRestore();
  });

  it('resolves system theme to dark when matchMedia prefers dark', async () => {
    preferDarkTheme();

    await act(async () => {
      renderTheme();
    });

    expect(screen.getByTestId('effective').textContent).toBe('dark');
  });

  it('defaults to system when settings has no theme property', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.api as any).storageGetSettings = vi.fn().mockResolvedValue({});

    await act(async () => {
      renderTheme();
    });

    expect(screen.getByTestId('theme').textContent).toBe('system');
  });

  it('ignores settings update without theme property', async () => {
    await act(async () => {
      renderTheme();
    });

    await act(async () => {
      events.settings!({ maxClips: 200 });
    });

    expect(screen.getByTestId('theme').textContent).toBe('system');
  });

  it('responds to system theme media change', async () => {
    await act(async () => {
      renderTheme();
    });

    expect(events.mediaChange).toBeTruthy();

    preferDarkTheme();

    await act(async () => {
      events.mediaChange!();
    });

    expect(screen.getByTestId('effective').textContent).toBe('dark');
  });
});
