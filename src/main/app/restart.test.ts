import { describe, it, expect, vi, beforeEach } from 'vitest';

const { calls } = vi.hoisted(() => ({ calls: [] as string[] }));

vi.mock('electron', () => ({
  app: {
    relaunch: vi.fn(() => calls.push('relaunch')),
    quit: vi.fn(() => calls.push('quit')),
  },
}));

vi.mock('../storage', () => ({
  storage: { flush: vi.fn(async () => calls.push('flush')) },
}));

vi.mock('../tray', () => ({
  setIsQuitting: vi.fn((value: boolean) => calls.push(`quitting:${value}`)),
}));

import { restartApp } from './restart';

describe('restartApp', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('flushes storage before marking the app as quitting and relaunching', async () => {
    await restartApp();
    expect(calls).toEqual(['flush', 'quitting:true', 'relaunch', 'quit']);
  });
});
