import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { UsageAnalytics } from './client';

let directory: string;
let path: string;
const token = 'phc_test';
const send = vi.fn().mockResolvedValue({ ok: true });

beforeEach(async () => {
  directory = await fs.mkdtemp(join(tmpdir(), 'clipless-analytics-'));
  path = join(directory, 'usage-analytics.json');
  vi.stubGlobal('fetch', send);
  send.mockClear();
});

afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  await fs.rm(directory, { recursive: true, force: true });
});

describe('usage analytics privacy boundary', () => {
  it('sends nothing and creates no ID until explicit opt-in', async () => {
    const client = new UsageAnalytics(path, token, 'us', true);
    await client.recordActivity();
    expect(await client.preference()).toEqual({ enabled: false, available: true });
    expect(send).not.toHaveBeenCalled();
    await expect(fs.readFile(path)).rejects.toThrow();
  });

  it('sends only the fixed schema, ignores extra arguments, and deduplicates activity', async () => {
    const client = new UsageAnalytics(path, token, 'us', true);
    await client.setEnabled(true);
    // Runtime callers cannot inject content even if they bypass the TypeScript signature.
    const privateData = { content: 'secret clipboard', tools: ['private company tool'] };
    await Reflect.apply(client.recordActivity, client, [privateData]);
    await Promise.all([client.recordActivity(), client.recordActivity()]);
    expect(send).toHaveBeenCalledTimes(1);
    const [url, options] = send.mock.calls[0];
    expect(url).toBe('https://us.i.posthog.com/i/v0/e/');
    expect(options).toMatchObject({ credentials: 'omit', redirect: 'error' });
    expect(JSON.parse(options.body)).toEqual({
      api_key: token,
      event: 'app_active',
      distinct_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      properties: { $process_person_profile: false, $geoip_disable: true, $ip: '0.0.0.0' },
    });
    expect(options.body).not.toContain('secret');
    const id = JSON.parse(options.body).distinct_id;
    const restarted = new UsageAnalytics(path, token, 'us', true);
    await restarted.recordActivity();
    expect(JSON.parse(send.mock.calls[1][1].body).distinct_id).toBe(id);
  });

  it('reports activity on a subsequent UTC day, but has no background heartbeat', async () => {
    const client = new UsageAnalytics(path, token, 'us', true);
    await client.setEnabled(true);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-11T23:59:00Z'));
    await client.recordActivity();
    vi.setSystemTime(new Date('2026-09-12T00:01:00Z'));
    expect(send).toHaveBeenCalledTimes(1);
    await client.recordActivity();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('opts out immediately, aborts an in-flight request and rotates identity on re-opt-in', async () => {
    let finish!: () => void;
    send.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)));
    const client = new UsageAnalytics(path, token, 'us', true);
    await client.setEnabled(true);
    const pending = client.recordActivity();
    await vi.waitFor(() => expect(send).toHaveBeenCalled());
    const originalId = JSON.parse(send.mock.calls[0][1].body).distinct_id;
    await client.setEnabled(false);
    expect(send.mock.calls[0][1].signal.aborted).toBe(true);
    finish();
    await pending;
    await client.recordActivity();
    expect(send).toHaveBeenCalledTimes(1);
    expect(JSON.parse(await fs.readFile(path, 'utf8'))).toEqual({ enabled: false });
    await client.setEnabled(true);
    await client.recordActivity();
    expect(JSON.parse(send.mock.calls[1][1].body).distinct_id).not.toBe(originalId);
  });

  it.each([
    ['', 'us', true],
    [token, 'invalid', true],
    [token, 'us', false],
  ])(
    'does not send with missing configuration or in development: %s %s %s',
    async (key, region, packaged) => {
      const client = new UsageAnalytics(path, key as string, region as string, packaged as boolean);
      await client.setEnabled(true);
      await client.recordActivity();
      expect(send).not.toHaveBeenCalled();
    }
  );

  it.each(['broken json', '{"enabled":true,"id":"clipboard content"}', '{"enabled":"true"}'])(
    'fails closed for invalid consent/identity: %s',
    async (state) => {
      await fs.writeFile(path, state);
      const client = new UsageAnalytics(path, token, 'us', true);
      await client.recordActivity();
      expect(send).not.toHaveBeenCalled();
    }
  );

  it('does not enable reporting if consent cannot be saved', async () => {
    const client = new UsageAnalytics(join(directory, 'missing', 'state.json'), token, 'us', true);
    await expect(client.setEnabled(true)).rejects.toThrow();
    await client.recordActivity();
    expect(send).not.toHaveBeenCalled();
  });

  it('reports the on-disk consent after a failed opt-out while sending nothing', async () => {
    const client = new UsageAnalytics(path, token, 'us', true);
    await client.setEnabled(true);
    const rename = vi.spyOn(fs, 'rename').mockRejectedValueOnce(new Error('EROFS'));
    await expect(client.setEnabled(false)).rejects.toThrow('EROFS');
    rename.mockRestore();
    expect(await client.preference()).toEqual({ enabled: true, available: true });
    expect(JSON.parse(await fs.readFile(path, 'utf8')).enabled).toBe(true);
    await client.recordActivity();
    expect(send).not.toHaveBeenCalled();
    await client.setEnabled(false);
    expect(await client.preference()).toEqual({ enabled: false, available: true });
  });

  it('swallows network failures without retrying and stops at shutdown', async () => {
    const client = new UsageAnalytics(path, token, 'eu', true);
    await client.setEnabled(true);
    send.mockRejectedValueOnce(new Error('network unavailable'));
    await expect(client.recordActivity()).resolves.toBeUndefined();
    await client.recordActivity();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBe('https://eu.i.posthog.com/i/v0/e/');
    const restarted = new UsageAnalytics(path, token, 'us', true);
    restarted.stop();
    await restarted.recordActivity();
    expect(send).toHaveBeenCalledTimes(1);
  });
});
