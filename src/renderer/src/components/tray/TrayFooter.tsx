import type { ReactNode } from 'react';
import { TemplatePills } from '../TemplatePills';
import styles from './Tray.module.css';

/**
 * The tray's last line: the templates strip (spec 7) and Open all with the exact tab count.
 */
export function TrayFooter({ openAll }: { openAll: ReactNode }) {
  return (
    <div className={styles.footer}>
      <TemplatePills />
      <span className={styles.spacer} />
      {openAll}
    </div>
  );
}
