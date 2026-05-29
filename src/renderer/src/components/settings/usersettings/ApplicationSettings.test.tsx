import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ApplicationSettings } from './ApplicationSettings';
import type { UserSettings } from '../../../../../shared/types';

vi.mock('../../../providers/theme', () => ({
  useTheme: () => ({
    isLight: false,
    isDark: true,
    theme: 'dark',
    effectiveTheme: 'dark',
    setTheme: vi.fn(),
  }),
}));

const baseSettings: UserSettings = {
  maxClips: 25,
  startMinimized: false,
  autoStart: true,
  theme: 'system',
  windowTransparency: 0,
  transparencyEnabled: false,
  opaqueWhenFocused: true,
  alwaysOnTop: false,
  rememberWindowPosition: true,
  showNotifications: false,
  codeDetectionEnabled: true,
} as UserSettings;

interface RenderOptions {
  overrides?: Partial<UserSettings>;
  saving?: boolean;
  tempMaxClips?: number | null;
  debounceTimeout?: NodeJS.Timeout | null;
}

const renderComponent = ({
  overrides = {},
  saving = false,
  tempMaxClips = null,
  debounceTimeout = null,
}: RenderOptions = {}) => {
  const onSettingChange = vi.fn();
  const onMaxClipsChange = vi.fn();
  render(
    <ApplicationSettings
      settings={{ ...baseSettings, ...overrides }}
      onSettingChange={onSettingChange}
      onMaxClipsChange={onMaxClipsChange}
      saving={saving}
      tempMaxClips={tempMaxClips}
      debounceTimeout={debounceTimeout}
    />
  );
  return { onSettingChange, onMaxClipsChange };
};

const setPlatform = (platform: NodeJS.Platform): void => {
  (window.api as { platform: NodeJS.Platform }).platform = platform;
};

describe('ApplicationSettings - Auto Start toggle', () => {
  const originalPlatform = (window.api as { platform: NodeJS.Platform }).platform;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    setPlatform(originalPlatform);
    cleanup();
  });

  it('shows normal description and enabled toggle on win32', () => {
    setPlatform('win32');
    renderComponent({ overrides: { autoStart: true } });

    expect(
      screen.getByText('Start Clipless automatically when your computer boots up')
    ).toBeInTheDocument();
    expect(screen.queryByText('Not available on Linux')).not.toBeInTheDocument();

    const toggle = screen.getByRole('checkbox', { name: 'Auto Start with System' });
    expect(toggle).not.toBeDisabled();
    expect(toggle).toBeChecked();
  });

  it('shows normal description and enabled toggle on darwin', () => {
    setPlatform('darwin');
    renderComponent({ overrides: { autoStart: true } });

    const toggle = screen.getByRole('checkbox', { name: 'Auto Start with System' });
    expect(toggle).not.toBeDisabled();
    expect(toggle).toBeChecked();
  });

  it('disables toggle and shows "Not available on Linux" on linux', () => {
    setPlatform('linux');
    renderComponent({ overrides: { autoStart: true } });

    expect(screen.getByText('Not available on Linux')).toBeInTheDocument();
    expect(
      screen.queryByText('Start Clipless automatically when your computer boots up')
    ).not.toBeInTheDocument();

    const toggle = screen.getByRole('checkbox', { name: 'Auto Start with System' });
    expect(toggle).toBeDisabled();
    expect(toggle).not.toBeChecked();
  });

  it('forwards Auto Start toggle changes to onSettingChange on supported platforms', () => {
    setPlatform('win32');
    const { onSettingChange } = renderComponent({ overrides: { autoStart: false } });

    fireEvent.click(screen.getByRole('checkbox', { name: 'Auto Start with System' }));
    expect(onSettingChange).toHaveBeenCalledWith('autoStart', true);
  });
});

describe('ApplicationSettings - other settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Maximum Clips input with current value and forwards changes', () => {
    const { onMaxClipsChange } = renderComponent({ overrides: { maxClips: 42 } });
    const input = screen.getByLabelText('Maximum Clips') as HTMLInputElement;
    expect(input.value).toBe('42');

    fireEvent.change(input, { target: { value: '50' } });
    expect(onMaxClipsChange).toHaveBeenCalledWith(50);
  });

  it('uses tempMaxClips value over settings.maxClips and shows pending hint', () => {
    renderComponent({
      overrides: { maxClips: 42 },
      tempMaxClips: 77,
      debounceTimeout: setTimeout(() => {}, 1000),
    });
    expect((screen.getByLabelText(/Maximum Clips/) as HTMLInputElement).value).toBe('77');
    expect(screen.getByText('Change pending...')).toBeInTheDocument();
  });

  it('disables all controls when saving', () => {
    renderComponent({ saving: true });
    expect(screen.getByLabelText(/Maximum Clips/)).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Start Minimized' })).toBeDisabled();
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Show Notifications' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Code Detection & Highlighting' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Automatic Updates' })).toBeDisabled();
  });

  it('forwards Start Minimized toggle changes', () => {
    const { onSettingChange } = renderComponent({ overrides: { startMinimized: false } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Start Minimized' }));
    expect(onSettingChange).toHaveBeenCalledWith('startMinimized', true);
  });

  it('forwards theme changes', () => {
    const { onSettingChange } = renderComponent({ overrides: { theme: 'system' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'dark' } });
    expect(onSettingChange).toHaveBeenCalledWith('theme', 'dark');
  });

  it('falls back to "system" when theme is undefined', () => {
    renderComponent({ overrides: { theme: undefined as unknown as UserSettings['theme'] } });
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('system');
  });

  it('forwards Show Notifications toggle changes', () => {
    const { onSettingChange } = renderComponent({ overrides: { showNotifications: false } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show Notifications' }));
    expect(onSettingChange).toHaveBeenCalledWith('showNotifications', true);
  });

  it('forwards Code Detection toggle changes', () => {
    const { onSettingChange } = renderComponent({ overrides: { codeDetectionEnabled: true } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Code Detection & Highlighting' }));
    expect(onSettingChange).toHaveBeenCalledWith('codeDetectionEnabled', false);
  });

  it('treats undefined showNotifications/codeDetectionEnabled as defaults', () => {
    renderComponent({
      overrides: {
        showNotifications: undefined as unknown as boolean,
        codeDetectionEnabled: undefined as unknown as boolean,
      },
    });
    expect(screen.getByRole('checkbox', { name: 'Show Notifications' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Code Detection & Highlighting' })).toBeChecked();
  });

  it('renders Automatic Updates toggle defaulted on when undefined', () => {
    renderComponent({
      overrides: { automaticUpdates: undefined as unknown as boolean },
    });
    expect(screen.getByRole('checkbox', { name: 'Automatic Updates' })).toBeChecked();
  });

  it('forwards Automatic Updates toggle changes', () => {
    const { onSettingChange } = renderComponent({ overrides: { automaticUpdates: true } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Automatic Updates' }));
    expect(onSettingChange).toHaveBeenCalledWith('automaticUpdates', false);
  });
});
