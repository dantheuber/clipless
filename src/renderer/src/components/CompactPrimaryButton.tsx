import type { ReactNode } from 'react';
import styles from './CompactPrimaryButton.module.css';

interface CompactPrimaryButtonProps {
  children: ReactNode;
  disabled: boolean;
  testId: string;
  onClick: () => void;
}

export function CompactPrimaryButton({
  children,
  disabled,
  testId,
  onClick,
}: CompactPrimaryButtonProps) {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
    >
      {children}
    </button>
  );
}
