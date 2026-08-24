import type { ScanResult } from '../../../../shared/types';
import { TemplatePills } from '../TemplatePills';
import { tabCount } from '../tray/openTabs';
import styles from './QuickLook.module.css';
import { CompactPrimaryButton } from '../CompactPrimaryButton';

interface FooterProps {
  scan: ScanResult | null;
  pinnedTotal: number;
  urlCount: number;
  short: boolean;
  onLaunch: () => void;
}

export function Footer({ scan, pinnedTotal, urlCount, short, onLaunch }: FooterProps) {
  return (
    <div className={styles.footer} data-testid="ql-footer">
      {!short && (
        <span className={styles.hints}>
          <kbd>↑</kbd>
          <kbd>↓</kbd> clips · <kbd>p</kbd> pin all · <kbd>t</kbd> copy template · <kbd>e</kbd> edit
          · <kbd>c</kbd> copy · <kbd>w</kbd> wrap · <kbd>Esc</kbd> close
        </span>
      )}
      <span className={styles.spacer} />
      <TemplatePills openClipScan={scan} readyOnly={short} showLabel={!short} />
      <span className={styles.pinCount} data-testid="ql-pinned-count">
        {pinnedTotal > 0 ? (
          <>
            <b>{pinnedTotal}</b> pinned
          </>
        ) : (
          'nothing pinned'
        )}
      </span>
      <CompactPrimaryButton onClick={onLaunch} disabled={urlCount === 0} testId="ql-launch">
        {pinnedTotal > 0 ? `Launch (${tabCount(urlCount)})` : 'Launch'}
      </CompactPrimaryButton>
    </div>
  );
}
