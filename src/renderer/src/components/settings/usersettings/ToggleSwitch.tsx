import classNames from 'classnames';
import styles from './ToggleSwitch.module.css';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  testId?: string;
}

/**
 * The one toggle of the settings window: a track and a knob, no ON or OFF text, both
 * themes through the variable set.
 */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label,
  testId,
}) => (
  <label className={classNames(styles.label, { [styles.disabled]: disabled })}>
    <input
      type="checkbox"
      role="switch"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className={styles.input}
      aria-label={label}
      aria-checked={checked}
      data-testid={testId}
    />
    <span className={classNames(styles.track, { [styles.on]: checked })} />
  </label>
);
