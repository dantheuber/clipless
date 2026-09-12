import { useEffect, useRef, useState } from 'react';
import styles from './ConfirmDialog.module.css';
import promptStyles from './AnalyticsPrompt.module.css';

/** Only mounted in the main window. Native modality keeps background controls inert. */
export function AnalyticsPrompt() {
  const dialog = useRef<HTMLDialogElement>(null);
  const decline = useRef<HTMLButtonElement>(null);
  const saving = useRef(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    window.api
      .analyticsPreference()
      .then((preference) => {
        if (mounted) setOpen(preference.available && preference.needsPrompt);
      })
      .catch(() => {
        // No readable consent means no reporting. Settings remains available for retry.
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      decline.current?.focus();
    }
  }, [open]);

  const choose = async (enabled: boolean) => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await window.api.analyticsSetEnabled(enabled);
      dialog.current?.close();
      setOpen(false);
    } catch {
      setFailed(true);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  if (!open) return null;
  return (
    <dialog
      ref={dialog}
      className={`${styles.dialog} ${promptStyles.prompt}`}
      aria-labelledby="analytics-prompt-title"
      onCancel={(event) => {
        event.preventDefault();
        void choose(false);
      }}
    >
      <h3 id="analytics-prompt-title" className={styles.title}>
        Help improve Clipless?
      </h3>
      <div className={styles.message}>
        <p>
          Would you like to send basic usage metrics to help us improve the Clipless experience?
        </p>
        <p>
          <b>100% opt-in.</b> Analytics is off unless you choose “Send analytics”.
        </p>
        <p>
          Your clipboard content, tool configurations and search term details are never sent. There
          are no screen recordings. We only count activity and how often features like search, Quick
          Look, copying clips, templates and tool launching are used.
        </p>
        <p>You can change your choice anytime in Settings → General → Privacy.</p>
        <details>
          <summary>What is shared?</summary>
          <p>
            PostHog receives activity and feature counts with a random installation ID. It also sees
            the connection’s IP address.
          </p>
        </details>
        {failed && <p role="alert">Could not save your choice. Please try again.</p>}
      </div>
      <div className={styles.actions}>
        {failed && (
          <button type="button" className={styles.button} onClick={() => setOpen(false)}>
            Continue without analytics
          </button>
        )}
        <span className={styles.spacer} />
        <button
          type="button"
          className={styles.button}
          disabled={busy}
          onClick={() => void choose(false)}
          ref={decline}
        >
          No thanks
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={busy}
          onClick={() => void choose(true)}
        >
          Send analytics
        </button>
      </div>
    </dialog>
  );
}
