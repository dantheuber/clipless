import { useEffect, useState } from 'react';
import type { AnalyticsPreference } from '../../../../../shared/types';
import { errorText } from '../../../utils/errorText';
import { ToggleSwitch } from '../usersettings/ToggleSwitch';
import { Panel, Row } from './Row';
import { SAVED_LABEL_MS, type RowStatus } from './useSetting';
import styles from './General.module.css';

/**
 * Privacy (spec 15.4): the opt-in usage reporting switch and its disclosure. The panel title is
 * owned here so General stays a list of self-contained panels.
 */
export function Privacy() {
  const [preference, setPreference] = useState<AnalyticsPreference>();
  const [unreadable, setUnreadable] = useState(false);
  const [status, setStatus] = useState<RowStatus>();

  useEffect(() => {
    window.api
      .analyticsPreference()
      .then(setPreference)
      .catch(() => setUnreadable(true));
  }, []);

  useEffect(() => {
    if (status?.kind !== 'saved') return;
    const timer = setTimeout(() => setStatus(undefined), SAVED_LABEL_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const change = async (enabled: boolean) => {
    setStatus({ kind: 'saving' });
    try {
      setPreference(await window.api.analyticsSetEnabled(enabled));
      setStatus({ kind: 'saved', label: true });
    } catch (e) {
      // The main process drops the sending ID before writing, so a failed opt-out is paused in
      // memory but the consent file is unchanged. Keep the previous value so the switch shows the file.
      setStatus({
        kind: 'error',
        retry: () => void change(enabled),
        message: enabled
          ? errorText(e)
          : 'Could not save your choice. Reporting is paused now but may resume next launch.',
      });
    }
  };

  return (
    <Panel title="Privacy">
      <div className={styles.analytics}>
        <Row
          id="usageAnalytics"
          label="Share usage counts"
          description="Optional. Off by default. Applies only to this installation."
          status={status}
        >
          <ToggleSwitch
            checked={preference?.enabled === true}
            onChange={(enabled) => void change(enabled)}
            disabled={
              status?.kind === 'saving' ||
              !preference ||
              (!preference.available && !preference.enabled)
            }
            label="Share usage counts"
            testId="toggle-usageAnalytics"
          />
        </Row>
        <p className={styles.detail}>
          Sends active days and a random installation ID to PostHog. No clipboard content,
          configured tools, screen recordings or error reports. PostHog sees your connection’s IP
          address. Turning this off stops future reports and resets the ID.
        </p>
        {preference && !preference.available && (
          <p className={styles.detail}>Usage reporting is unavailable in this build.</p>
        )}
        {unreadable && <p role="alert">Could not read your usage reporting preference.</p>}
      </div>
    </Panel>
  );
}
