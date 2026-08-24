import type { ReactNode } from 'react';
import styles from './Shell.module.css';

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className={styles.tip} title={text}>
      {children}
    </span>
  );
}
