import { useTheme } from './theme';

export function ThemeDisplay() {
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
