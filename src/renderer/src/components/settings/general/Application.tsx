import { ClipsToKeep } from './ClipsToKeep';
import { Panel, Row, ToggleRow } from './Row';
import { useSetting } from './useSetting';
import w from '../shell/widgets.module.css';

/**
 * Application (spec 15.4): Clips to keep, Start minimized, Start with the system (hidden on
 * Linux, where login items are not managed), Theme, Notifications, Code detection.
 */
export function Application() {
  const theme = useSetting('theme');
  return (
    <Panel title="Application">
      <ClipsToKeep />
      <ToggleRow
        id="startMinimized"
        label="Start minimized"
        description="Open to the tray, not the window."
      />
      {window.api.platform !== 'linux' && (
        <ToggleRow
          id="autoStart"
          label="Start with the system"
          description="Launch Clipless at login."
        />
      )}
      <Row
        id="theme"
        label="Theme"
        description="Follow the system, or force light or dark."
        status={theme.status}
      >
        <select
          className={w.select}
          value={theme.value ?? 'system'}
          aria-label="Theme"
          onChange={(e) => theme.set(e.target.value as 'system' | 'light' | 'dark')}
          data-testid="theme-select"
        >
          <option value="system">system</option>
          <option value="light">light</option>
          <option value="dark">dark</option>
        </select>
      </Row>
      <ToggleRow
        id="showNotifications"
        label="Notifications"
        description="OS notification when a hotkey copies a clip. Copies from the window toast instead."
      />
      <ToggleRow
        id="codeDetectionEnabled"
        label="Code detection"
        description="Detect the language of text clips and colour them as code in the row tag, the editor and quick look."
      />
    </Panel>
  );
}
