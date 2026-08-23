import type { ReactNode } from 'react';
import styles from './Shell.module.css';

/**
 * A label whose description is its tooltip, marked with a dotted underline (spec 15.4).
 * The label has to carry its meaning alone; the tooltip is the long form.
 */
export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className={styles.tip} title={text}>
      {children}
    </span>
  );
}
