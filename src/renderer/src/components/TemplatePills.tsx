import classNames from 'classnames';
import type { ScanResult } from '../../../shared/types';
import { useTemplatePills } from './useTemplatePills';
import styles from './TemplatePills.module.css';

interface TemplatePillsProps {
  openClipScan?: ScanResult | null;

  readyOnly?: boolean;
  showLabel?: boolean;
}

export function TemplatePills({ openClipScan, readyOnly, showLabel = true }: TemplatePillsProps) {
  const { pills } = useTemplatePills(openClipScan);
  const shown = readyOnly ? pills.filter((p) => p.state === 'ready') : pills;
  if (shown.length === 0) return null;
  return (
    <span className={styles.pills} data-testid="template-pills">
      {showLabel && <span className={styles.label}>Templates</span>}
      {shown.map((pill) => (
        <button
          key={pill.template.id}
          type="button"
          className={classNames(styles.pill, {
            [styles.needs]: pill.state !== 'ready',
            [styles.inert]: pill.state === 'inert',
          })}
          title={pill.title}
          aria-disabled={pill.state === 'inert' ? 'true' : undefined}
          data-state={pill.state}
          onClick={pill.state === 'inert' ? undefined : pill.activate}
        >
          {pill.template.name}
          {pill.readiness.kind === 'needs' && (
            <span className={styles.need}>needs {pill.readiness.missing.join(' + ')}</span>
          )}
        </button>
      ))}
    </span>
  );
}
