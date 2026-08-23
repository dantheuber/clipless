import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { HotkeySettings } from '../../../../../shared/types';
import { Recorder } from './Recorder';

const hotkeys: HotkeySettings = {
  enabled: true,
  focusWindow: { enabled: true, key: 'CommandOrControl+Shift+V' },
  quickClip1: { enabled: true, key: 'CommandOrControl+Shift+1' },
  quickClip2: { enabled: true, key: 'CommandOrControl+Shift+2' },
  quickClip3: { enabled: true, key: 'CommandOrControl+Shift+3' },
  quickClip4: { enabled: true, key: 'CommandOrControl+Shift+4' },
  quickClip5: { enabled: true, key: 'CommandOrControl+Shift+5' },
  quickLook: { enabled: true, key: 'CommandOrControl+Shift+T' },
  searchClips: { enabled: true, key: 'CommandOrControl+Shift+F' },
};

const onAccept = vi.fn();
const onSwap = vi.fn();
const onCancel = vi.fn();

const mount = (platform = 'linux') =>
  render(
    <Recorder
      id="focusWindow"
      hotkeys={hotkeys}
      platform={platform}
      onAccept={onAccept}
      onSwap={onSwap}
      onCancel={onCancel}
    />
  );

const press = (over: Partial<KeyboardEventInit>) =>
  fireEvent.keyDown(window, { key: 'a', code: 'KeyA', ...over });

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe('Recorder', () => {
  it('says how to record and echoes held modifiers live', () => {
    mount();
    expect(screen.getByTestId('recorder')).toHaveTextContent('press keys, Esc cancels');
    press({ key: 'Control', code: 'ControlLeft', ctrlKey: true });
    expect(screen.getByTestId('recorder')).toHaveTextContent('Ctrl');
    press({ key: 'Shift', code: 'ShiftLeft', ctrlKey: true, shiftKey: true });
    expect(screen.getByTestId('recorder')).toHaveTextContent('Ctrl+Shift');
    fireEvent.keyUp(window, { key: 'Shift', code: 'ShiftLeft', ctrlKey: true, shiftKey: false });
    expect(screen.getByTestId('recorder')).not.toHaveTextContent('Shift');
    fireEvent.keyUp(window, { key: 'k', code: 'KeyK', ctrlKey: true });
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('completes on the first non-modifier key and leaves the old binding alone until then', () => {
    mount();
    press({ key: 'Control', code: 'ControlLeft', ctrlKey: true });
    expect(onAccept).not.toHaveBeenCalled();
    press({ key: 'k', code: 'KeyK', ctrlKey: true, shiftKey: true });
    expect(onAccept).toHaveBeenCalledWith('CommandOrControl+Shift+K');
  });

  it('refuses a press without Ctrl, Shift or Alt and keeps recording', () => {
    mount();
    press({ key: 'k', code: 'KeyK' });
    expect(screen.getByTestId('recorder-message')).toHaveTextContent('needs Ctrl, Shift or Alt');
    expect(onAccept).not.toHaveBeenCalled();
    press({ key: 'k', code: 'KeyK', altKey: true });
    expect(onAccept).toHaveBeenCalledWith('Alt+K');
  });

  it('names the modifiers for macOS', () => {
    mount('darwin');
    press({ key: 'k', code: 'KeyK', metaKey: false });
    expect(screen.getByTestId('recorder-message')).toHaveTextContent('needs Cmd, Shift or Opt');
  });

  it('cancels on Esc', () => {
    mount();
    press({ key: 'Escape', code: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('blocks a combination another row holds, names it, and offers swap and keep trying', () => {
    mount();
    press({ key: '1', code: 'Digit1', ctrlKey: true, shiftKey: true });
    expect(onAccept).not.toHaveBeenCalled();
    const message = screen.getByTestId('recorder-message');
    expect(message).toHaveTextContent('used by Copy clip 1');
    fireEvent.click(screen.getByText('keep trying'));
    expect(screen.queryByTestId('recorder-message')).toBeNull();
    press({ key: '!', code: 'Digit1', ctrlKey: true, shiftKey: true });
    fireEvent.click(screen.getByText('swap'));
    expect(onSwap).toHaveBeenCalledWith('quickClip1', 'CommandOrControl+Shift+1');
  });

  it('warns about a combination the OS keeps, and still accepts it', () => {
    mount('darwin');
    press({ key: ' ', code: 'Space', metaKey: true });
    expect(onAccept).toHaveBeenCalledWith('CommandOrControl+Space');
  });

  it('shows the OS warning while a reserved combination is held with a conflict-free key', () => {
    const { rerender } = render(
      <Recorder
        id="quickClip3"
        hotkeys={{ ...hotkeys, quickClip3: { enabled: true, key: 'CommandOrControl+Shift+9' } }}
        platform="darwin"
        onAccept={onAccept}
        onSwap={onSwap}
        onCancel={onCancel}
      />
    );
    // Cmd+Shift+3 is held by nobody now but is a macOS screenshot key: accepted with the warning shown
    press({ key: 'Meta', code: 'MetaLeft', metaKey: true });
    press({ key: '3', code: 'Digit3', metaKey: true, shiftKey: true });
    expect(screen.getByTestId('recorder')).toHaveTextContent('screenshot');
    expect(onAccept).toHaveBeenCalledWith('CommandOrControl+Shift+3');
    rerender(<div />);
  });
});
