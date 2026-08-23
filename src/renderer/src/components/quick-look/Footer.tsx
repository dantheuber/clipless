import type { ScanResult } from '../../../../shared/types';
import { TemplatePills } from '../TemplatePills';
import { tabCount } from '../tray/Tray';
import styles from './QuickLook.module.css';

interface FooterProps {
  scan: ScanResult | null;
  pinnedTotal: number;
  urlCount: number;
  short: boolean;
  onLaunch: () => void;
}

/**
 * The reader footer (spec 5, 7): keyboard hints, the templates strip, the pinned count and
 * a Launch button that states the tab count. In a short window the hints drop and only
 * ready templates show.
 */
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
      <button
        type="button"
        className={styles.primary}
        onClick={onLaunch}
        disabled={urlCount === 0}
        data-testid="ql-launch"
      >
        {pinnedTotal > 0 ? `Launch (${tabCount(urlCount)})` : 'Launch'}
      </button>
    </div>
  );
}
