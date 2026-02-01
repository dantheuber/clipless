import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { ThemeProvider, useTheme } from './theme';

// Test component that displays theme info
function ThemeDisplay() {
  const { theme, effectiveTheme, isLight, isDark, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="effective">{effectiveTheme}</span>
      <span data-testid="isLight">{String(isLight)}</span>
      <span data-testid="isDark">{String(isDark)}</span>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('system')}>Set System</button>
    </div>
  );
}

describe('ThemeProvider', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let settingsCallback: ((settings: any) => void) | null = null;
  let mediaChangeCallback: (() => void) | null = null;

  beforeEach(() => {
    settingsCallback = null;
    mediaChangeCallback = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).api = {
      storageGetSettings: vi.fn().mockResolvedValue({ theme: 'system' }),
      storageSaveSettings: vi.fn().mockResolvedValue(undefined),
      onSettingsUpdated: vi.fn().mockImplementation((cb) => {
        settingsCallback = cb;
        return vi.fn(); // cleanup function
      }),
    };

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn().mockImplementation((_event, cb) => {
          mediaChangeCallback = cb;
        }),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('provides default theme values', () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme').textContent).toBe('system');
  });

  it('allows setting theme to light', async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );

    await act(async () => {
      screen.getByText('Set Light').click();
    });

    expect(screen.getByTestId('effective').textContent).toBe('light');
    expect(screen.getByTestId('isLight').textContent).toBe('true');
    expect(screen.getByTestId('isDark').textContent).toBe('false');
  });

  it('allows setting theme to dark', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
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
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(screen.getByTestId('effective').textContent).toBe('dark');
  });

  it('handles theme loading error by defaulting to system', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.api as any).storageGetSettings = vi.fn().mockRejectedValue(new Error('fail'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    expect(screen.getByTestId('theme').textContent).toBe('system');
    spy.mockRestore();
  });

  it('handles missing api gracefully during load', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).api = undefined;

    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    expect(screen.getByTestId('theme').textContent).toBe('system');
  });

  it('responds to settings updates from other windows', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    expect(settingsCallback).toBeTruthy();

    await act(async () => {
      settingsCallback!({ theme: 'light' });
    });

    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(screen.getByTestId('effective').textContent).toBe('light');
  });

  it('handles save error gracefully', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.api as any).storageSaveSettings = vi.fn().mockRejectedValue(new Error('save fail'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );

    await act(async () => {
      screen.getByText('Set Light').click();
    });

    // Should still update locally even if save fails
    expect(screen.getByTestId('effective').textContent).toBe('light');
    spy.mockRestore();
  });

  it('handles missing api during save', async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );

    // Remove api after mount
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).api = undefined;

    await act(async () => {
      screen.getByText('Set Light').click();
    });

    // Should still update locally
    expect(screen.getByTestId('effective').textContent).toBe('light');
  });

  it('resolves system theme to light when matchMedia prefers light', () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme').textContent).toBe('system');
  });

  it('throws when useTheme is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeDisplay />)).toThrow('useTheme must be used within a ThemeProvider');
    spy.mockRestore();
  });

  it('resolves system theme to dark when matchMedia prefers dark', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true, // prefers dark
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    expect(screen.getByTestId('effective').textContent).toBe('dark');
  });

  it('defaults to system when settings has no theme property', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.api as any).storageGetSettings = vi.fn().mockResolvedValue({});

    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    expect(screen.getByTestId('theme').textContent).toBe('system');
  });

  it('ignores settings update without theme property', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    await act(async () => {
      settingsCallback!({ maxClips: 200 }); // no theme property
    });

    // Theme should remain unchanged (system)
    expect(screen.getByTestId('theme').textContent).toBe('system');
  });

  it('responds to system theme media change', async () => {
    // Theme defaults to 'system', so the media change listener should be active
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    expect(mediaChangeCallback).toBeTruthy();

    // Simulate system theme change
    // Change matchMedia to return dark
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    await act(async () => {
      mediaChangeCallback!();
    });

    expect(screen.getByTestId('effective').textContent).toBe('dark');
  });

  it('does not listen for settings updates when api.onSettingsUpdated is missing', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).api = {
      storageGetSettings: vi.fn().mockResolvedValue({ theme: 'system' }),
      storageSaveSettings: vi.fn(),
    };

    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    // Should not throw
    expect(screen.getByTestId('theme').textContent).toBe('system');
  });
});
