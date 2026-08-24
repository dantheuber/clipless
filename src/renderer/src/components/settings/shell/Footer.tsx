import type { ReactNode } from 'react';
import styles from './Shell.module.css';
import w from './widgets.module.css';

interface FooterProps {
  text: string;
  children?: ReactNode;
}

export function Footer({ text, children }: FooterProps) {
  return (
    <div className={styles.footer} data-testid="footer">
      <span className={styles.text}>{text}</span>
      <span className={w.sp} />
      {children}
    </div>
  );
}
