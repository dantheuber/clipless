import type { ReactNode } from 'react';
import styles from './Shell.module.css';
import w from './widgets.module.css';

interface FooterProps {
  text: string;
  children?: ReactNode;
}

/**
 * One line per tab (spec 15.2): which model the tab uses, and the rare actions as links.
 */
export function Footer({ text, children }: FooterProps) {
  return (
    <div className={styles.footer} data-testid="footer">
      <span className={styles.text}>{text}</span>
      <span className={w.sp} />
      {children}
    </div>
  );
}
