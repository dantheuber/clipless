import { useEffect, useState } from 'react';
import { Panel, Row, ToggleRow } from './Row';
import { useSetting } from './useSetting';
import w from '../shell/widgets.module.css';

/**
 * Window (spec 15.4): Always on top, Remember position, Transparency, Transparency level
 * (writes on release, the percent follows the slider live), Opaque when focused. The last
 * two are dimmed, not hidden, while Transparency is off.
 */
export function Window() {
  const transparency = useSetting('transparencyEnabled');
  const level = useSetting('windowTransparency');
  const off = transparency.value !== true;
  const stored = level.value ?? 0;
  const [live, setLive] = useState(stored);

  useEffect(() => {
    setLive(stored);
  }, [stored]);

  const release = () => {
    if (live !== stored) level.set(live);
  };

  return (
    <Panel title="Window">
      <ToggleRow
        id="alwaysOnTop"
        label="Always on top"
        description="Keep the clips window above other windows."
      />
      <ToggleRow
        id="rememberWindowPosition"
        label="Remember position"
        description="Reopen where it was closed."
      />
      <ToggleRow
        id="transparencyEnabled"
        label="Transparency"
        description="Let the window be see-through."
      />
      <Row
        id="windowTransparency"
        label="Transparency level"
        description="0% solid, 100% invisible."
        status={level.status}
        dimmed={off}
      >
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={live}
          disabled={off}
          aria-label="Transparency level"
          className={w.range}
          onChange={(e) => setLive(Number(e.target.value))}
          onMouseUp={release}
          onTouchEnd={release}
          onKeyUp={release}
          onBlur={release}
          data-testid="transparency-level"
        />
        <span className={w.pct}>{live}%</span>
      </Row>
      <ToggleRow
        id="opaqueWhenFocused"
        label="Opaque when focused"
        description="Solid while it has focus, see-through when it does not."
        dimmed={off}
      />
    </Panel>
  );
}
