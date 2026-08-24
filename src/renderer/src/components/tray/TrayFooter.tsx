import type { ReactNode } from 'react';
import { TemplatePills } from '../TemplatePills';
import styles from './Tray.module.css';

export function TrayFooter({ openAll }: { openAll: ReactNode }) {
  return (
    <div className={styles.footer}>
      <TemplatePills />
      <span className={styles.spacer} />
      {openAll}
    </div>
  );
}
