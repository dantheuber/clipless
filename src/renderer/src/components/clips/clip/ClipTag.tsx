import type { ReactNode } from 'react';
import classNames from 'classnames';
import styles from './ClipTag.module.css';

export function ClipTag({ children, row = false }: { children: ReactNode; row?: boolean }) {
  return <span className={classNames(styles.tag, { [styles.row]: row })}>{children}</span>;
}
