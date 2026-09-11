import { useEffect, useState } from 'react';
import { ToggleSwitch } from '../usersettings/ToggleSwitch';
import { Row } from './Row';
import styles from './General.module.css';

export function Analytics() {
  const [preference, setPreference] = useState<{ enabled: boolean; available: boolean }>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    window.api
      .analyticsPreference()
      .then(setPreference)
      .catch(() => setFailed(true));
  }, []);

  const change = async (enabled: boolean) => {
    setBusy(true);
    setFailed(false);
    try {
      setPreference(await window.api.analyticsSetEnabled(enabled));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Row
        id="usageAnalytics"
        label="Share usage counts"
        description="Optional. Off by default. Applies only to this installation."
      >
        <ToggleSwitch
          checked={preference?.enabled === true}
          onChange={(enabled) => void change(enabled)}
          disabled={busy || !preference || (!preference.available && !preference.enabled)}
          label="Share usage counts"
          testId="toggle-usageAnalytics"
        />
      </Row>
      <p className={styles.detail}>
        Sends active days and a random installation ID to PostHog. No clipboard content, configured
        tools, screen recordings or error reports. PostHog sees your connection’s IP address.
        Turning this off stops future reports and resets the ID.
      </p>
      {preference && !preference.available && (
        <p className={styles.detail}>Usage reporting is unavailable in this build.</p>
      )}
      {failed && <p role="alert">Could not read or save your usage reporting preference.</p>}
    </div>
  );
}
