import { Fragment } from 'react';
import classNames from 'classnames';
import { displayKeys } from './display';
import w from '../shell/widgets.module.css';
import styles from './Hotkeys.module.css';

interface KeycapsProps {
  accelerator: string;
  platform: string;
  off?: boolean;
  className?: string;
}

/**
 * An accelerator as keycaps in the platform's names. The raw string is never shown.
 */
export function Keycaps({ accelerator, platform, off, className }: KeycapsProps) {
  const keys = displayKeys(accelerator, platform);
  return (
    <span className={classNames(w.kc, { [styles.kcOff]: off }, className)}>
      {keys.map((key, i) => (
        <Fragment key={i}>
          {i > 0 && <span className={w.plus}>+</span>}
          <kbd>{key}</kbd>
        </Fragment>
      ))}
    </span>
  );
}
