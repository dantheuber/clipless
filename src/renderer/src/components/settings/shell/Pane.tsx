import type { ReactNode } from 'react';
import styles from './Shell.module.css';

interface PaneProps {
  title: ReactNode;

  bar?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;

  scroll?: boolean;
}

export function Pane({ title, bar, children, footer, scroll = true }: PaneProps) {
  return (
    <div className={styles.pane}>
      <div className={styles.titleBar} data-testid="title-bar">
        <span className={styles.title}>{title}</span>
        {bar}
      </div>
      <div className={styles.content}>
        {scroll ? <div className={styles.scroll}>{children}</div> : children}
      </div>
      {footer}
    </div>
  );
}
