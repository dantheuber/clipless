import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import styles from './ClipContextMenu.module.css';

interface ContextMenuItemProps {
  icon: IconProp;
  label: string;
  disabled?: boolean;
  reason?: string;
  className?: string;
  onClick: () => void;
}

export function ContextMenuItem({
  icon,
  label,
  disabled,
  reason,
  className,
  onClick,
}: ContextMenuItemProps) {
  return (
    <div
      role="menuitem"
      aria-disabled={disabled ? 'true' : undefined}
      className={classNames(styles.menuItem, className, { [styles.disabled]: disabled })}
      onClick={disabled ? undefined : onClick}
      data-testid={`menu-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <FontAwesomeIcon icon={icon} className={styles.menuIcon} />
      <span>{label}</span>
      {disabled && reason && <span className={styles.reason}>{reason}</span>}
    </div>
  );
}
