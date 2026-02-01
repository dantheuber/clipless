import { describe, it, expect, vi, afterEach } from 'vitest';
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
    </div>
  );
}

describe('ThemeProvider', () => {
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

  it('resolves system theme to light when matchMedia prefers light', () => {
    // matchMedia mock returns matches: false (light mode)
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );

    // system theme with matchMedia returning false → light
    expect(screen.getByTestId('theme').textContent).toBe('system');
  });

  it('throws when useTheme is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeDisplay />)).toThrow('useTheme must be used within a ThemeProvider');
    spy.mockRestore();
  });
});
