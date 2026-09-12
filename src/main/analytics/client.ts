import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import type { AnalyticsPreference } from '../../shared/types';
import { isAnalyticsFeature, type AnalyticsFeature } from '../../shared/analytics';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Only fixed event names and validated feature categories can leave this boundary. */
export class UsageAnalytics {
  /** Sending ID. Cleared before an opt-out is written so a failed write never keeps sending. */
  private id: string | undefined;
  /** Consent as last written to disk. Reported to the renderer, and unchanged by a failed write. */
  private persisted = false;
  private decided = false;
  private ready: Promise<void>;
  private writes: Promise<void> = Promise.resolve();
  private lastDay = '';
  private requests = new Set<AbortController>();
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
      // Existing explicit declines count as a decision, including older state files.
      if (state.enabled === false) this.decided = true;
      if (state.enabled === true && typeof state.id === 'string' && UUID.test(state.id)) {
        this.id = state.id;
        this.persisted = true;
        this.decided = true;
      }
    } catch {
      // Missing, corrupt or unreadable consent always means off.
    }
  }

  async preference(): Promise<AnalyticsPreference> {
    await this.ready;
    return { enabled: this.persisted, available: !!this.endpoint, needsPrompt: !this.decided };
  }

  setEnabled(enabled: boolean): Promise<void> {
    if (typeof enabled !== 'boolean') return Promise.reject(new Error('Invalid preference'));
    const change = this.writes.then(async () => {
      await this.ready;
      this.requests.forEach((request) => request.abort());
      const nextId = enabled ? (this.id ?? randomUUID()) : undefined;
      // Disable in memory before disk I/O; failed opt-outs must not keep sending.
      this.id = undefined;
      this.lastDay = '';
      const temporaryPath = `${this.statePath}.tmp`;
      await fs.writeFile(temporaryPath, JSON.stringify({ enabled, id: nextId }), { mode: 0o600 });
      await fs.rename(temporaryPath, this.statePath);
      this.id = nextId;
      this.persisted = enabled;
      this.decided = true;
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
    await this.send('app_active');
  }

  async recordFeature(feature: AnalyticsFeature): Promise<void> {
    // Validate at runtime too: IPC callers can bypass TypeScript and pass arbitrary data.
    if (!isAnalyticsFeature(feature)) return;
    await this.ready;
    const id = this.id;
    if (!id) return;
    await this.writes;
    if (this.id !== id || this.stopped || !this.endpoint) return;
    void this.recordActivity();
    await this.send('feature_used', feature);
  }

  private async send(
    event: 'app_active' | 'feature_used',
    feature?: AnalyticsFeature
  ): Promise<void> {
    if (this.stopped || !this.endpoint || !this.id) return;
    const controller = new AbortController();
    this.requests.add(controller);
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
          event,
          distinct_id: this.id,
          properties: {
            $process_person_profile: false,
            $geoip_disable: true,
            $ip: '0.0.0.0',
            ...(feature ? { feature } : {}),
          },
        }),
      });
    } catch {
      // Analytics never interrupts clipboard operations or uploads error details.
    } finally {
      clearTimeout(timeout);
      this.requests.delete(controller);
    }
  }

  stop(): void {
    this.stopped = true;
    this.requests.forEach((request) => request.abort());
  }
}
