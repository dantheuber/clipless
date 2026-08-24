import classNames from 'classnames';
import styles from './Shell.module.css';

export type SettingsTab = 'general' | 'hotkeys' | 'tools';

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'hotkeys', label: 'Hotkeys' },
  { id: 'tools', label: 'Tools' },
];

interface RailProps {
  active: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
  version: string;
}

export function Rail({ active, onSelect, version }: RailProps) {
  return (
    <nav className={styles.rail} data-testid="rail" aria-label="Settings sections">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={classNames(styles.railItem, { [styles.on]: active === tab.id })}
          onClick={() => onSelect(tab.id)}
          aria-current={active === tab.id ? 'page' : undefined}
          data-testid={`rail-${tab.id}`}
        >
          {tab.label}
        </button>
      ))}
      <div className={styles.version} title={`Clipless ${version}`} data-testid="rail-version">
        v{version}
      </div>
    </nav>
  );
}
