import type { ReactNode } from 'react';
import styles from './Shell.module.css';

interface PaneProps {
  title: ReactNode;
  /** Extra title bar content, right of the title */
  bar?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Wrap the content in the scrolling area; off for tabs that manage their own panes */
  scroll?: boolean;
}

/**
 * The pane right of the rail: a title bar, the tab's content, one footer line.
 */
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
