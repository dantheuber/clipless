import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import type { AnalyticsPreference } from '../../shared/types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** No event/property arguments: application data must never enter this boundary. */
export class UsageAnalytics {
  /** Sending ID. Cleared before an opt-out is written so a failed write never keeps sending. */
  private id: string | undefined;
  /** Consent as last written to disk. Reported to the renderer, and unchanged by a failed write. */
  private persisted = false;
  private ready: Promise<void>;
  private writes: Promise<void> = Promise.resolve();
  private lastDay = '';
  private request: AbortController | undefined;
  private stopped = false;
  private endpoint: string | undefined;

  constructor(
    private statePath: string,
    private token: string,
    region: string,
    packaged: boolean
  ) {
    if (packaged && /^phc_[a-zA-Z0-9]+$/.test(token) && ['us', 'eu'].includes(region)) {
      this.endpoint = `https://${region}.i.posthog.com/i/v0/e/`;
    }
    this.ready = this.load();
  }

  private async load(): Promise<void> {
    try {
      const state = JSON.parse(await fs.readFile(this.statePath, 'utf8'));
      if (state.enabled === true && typeof state.id === 'string' && UUID.test(state.id)) {
        this.id = state.id;
        this.persisted = true;
      }
    } catch {
      // Missing, corrupt or unreadable consent always means off.
    }
  }

  async preference(): Promise<AnalyticsPreference> {
    await this.ready;
    return { enabled: this.persisted, available: !!this.endpoint };
  }

  setEnabled(enabled: boolean): Promise<void> {
    if (typeof enabled !== 'boolean') return Promise.reject(new Error('Invalid preference'));
    const change = this.writes.then(async () => {
      await this.ready;
      this.request?.abort();
      const nextId = enabled ? (this.id ?? randomUUID()) : undefined;
      // Disable in memory before disk I/O; failed opt-outs must not keep sending.
      this.id = undefined;
      this.lastDay = '';
      const temporaryPath = `${this.statePath}.tmp`;
      await fs.writeFile(temporaryPath, JSON.stringify({ enabled, id: nextId }), { mode: 0o600 });
      await fs.rename(temporaryPath, this.statePath);
      this.id = nextId;
      this.persisted = enabled;
    });
    this.writes = change.catch(() => {});
    return change;
  }

  async recordActivity(): Promise<void> {
    await this.ready;
    await this.writes;
    const day = new Date().toISOString().slice(0, 10);
    if (this.stopped || !this.endpoint || !this.id || this.lastDay === day) return;
    // At most one attempt per UTC day per process. No offline queue or retries.
    this.lastDay = day;
    this.request?.abort();
    const controller = new AbortController();
    this.request = controller;
    const timeout = setTimeout(() => controller.abort(), 5000);
    timeout.unref();
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        redirect: 'error',
        signal: controller.signal,
        body: JSON.stringify({
          api_key: this.token,
          event: 'app_active',
          distinct_id: this.id,
          properties: {
            $process_person_profile: false,
            $geoip_disable: true,
            $ip: '0.0.0.0',
          },
        }),
      });
    } catch {
      // Analytics never interrupts clipboard operations or uploads error details.
    } finally {
      clearTimeout(timeout);
      if (this.request === controller) this.request = undefined;
    }
  }

  stop(): void {
    this.stopped = true;
    this.request?.abort();
  }
}
