import type { CSSProperties } from 'react';
import type { QuickTool } from '../../../../shared/types';
import { buildToolUrls, type PinsByGroup } from '../../../../shared/tools';
import styles from './Tray.module.css';

interface TrayGroupProps {
  group: string;
  values: readonly string[];
  tools: QuickTool[];
  pinsByGroup: PinsByGroup;
  style: CSSProperties; // carries --gc
  onRemove: (value: string) => void;
  onOpen: (urls: string[]) => void;
}

const shorten = (value: string) => (value.length > 30 ? `${value.slice(0, 28)}…` : value);

/**
 * One capture group in the tray: name and colour, the pinned values as removable chips, and
 * one button per compatible tool with a multiplier when it opens more than one tab. Under
 * 480px the three columns stack (CSS).
 */
export function TrayGroup({
  group,
  values,
  tools,
  pinsByGroup,
  style,
  onRemove,
  onOpen,
}: TrayGroupProps) {
  return (
    <div className={styles.group} style={style} data-testid={`tray-group-${group}`}>
      <div className={styles.groupName}>
        <i className={styles.swatch} />
        {group}
        {values.length > 1 && ` x${values.length}`}
      </div>
      <div className={styles.values}>
        {values.map((value) => (
          <span key={value} className={styles.value} title={value}>
            {shorten(value)}
            <button
              type="button"
              className={styles.remove}
              onClick={() => onRemove(value)}
              title={`Unpin ${value}`}
              aria-label={`Unpin ${value}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className={styles.tools}>
        {tools.map((tool) => {
          const urls = buildToolUrls(tool, pinsByGroup);
          return (
            <button
              key={tool.id}
              type="button"
              className={styles.pill}
              onClick={() => onOpen(urls)}
              title={`Open ${urls.length} ${urls.length === 1 ? 'tab' : 'tabs'}`}
            >
              {tool.name}
              {urls.length > 1 && ` x${urls.length}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
