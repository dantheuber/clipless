import React from 'react';
import { InfoTooltip } from '../quickclips/InfoTooltip';
import styles from '../HotkeyManager.module.css';

export const HotkeyHeader: React.FC = () => {

  return (
    <div className={styles.header}>
      <div className={styles.titleRow}>
        <h2>Global Hotkeys</h2>
        <InfoTooltip
          content={
            <div>
              <p>
                Quick Clip hotkeys copy clips by their display number:
              </p>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Quick Clip 1 → Copies clip #1 (position 1)</li>
                <li>Quick Clip 2 → Copies clip #2 (position 2)</li>
                <li>And so on...</li>
              </ul>
            </div>
          }
        />
      </div>
      <p className={styles.description}>
        Configure global hotkeys for quick access to Clipless features. Hotkeys work even when the
        application is minimized or in the background.
      </p>
    </div>
  );
};
