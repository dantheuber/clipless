import { describe, it, expect, vi } from 'vitest';
import { SaveQueue } from './save-queue';

const deferred = () => {
  let resolve: () => void = () => {};
  let reject: (e: unknown) => void = () => {};
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('SaveQueue', () => {
  it('runs a write straight away when nothing is in flight', async () => {
    const queue = new SaveQueue();
    const write = vi.fn().mockResolvedValue(undefined);
    await queue.run('clips', write);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it('writes the newer state after the in-flight write instead of dropping it', async () => {
    const queue = new SaveQueue();
    const first = deferred();
    const order: string[] = [];
    const p1 = queue.run('clips', () => {
      order.push('first');
      return first.promise;
    });
    const second = vi.fn(async () => {
      order.push('second');
    });
    const p2 = queue.run('clips', second);

    expect(second).not.toHaveBeenCalled();
    first.resolve();
    await p1;
    await p2;
    expect(order).toEqual(['first', 'second']);
  });

  it('coalesces to the newest state when several saves queue behind one write', async () => {
    const queue = new SaveQueue();
    const first = deferred();
    const p1 = queue.run('clips', () => first.promise);
    const stale = vi.fn().mockResolvedValue(undefined);
    const newest = vi.fn().mockResolvedValue(undefined);
    const p2 = queue.run('clips', stale);
    const p3 = queue.run('clips', newest);

    first.resolve();
    await Promise.all([p1, p2, p3]);
    expect(stale).not.toHaveBeenCalled();
    expect(newest).toHaveBeenCalledTimes(1);
  });

  it('keeps keys independent', async () => {
    const queue = new SaveQueue();
    const first = deferred();
    const p1 = queue.run('clips', () => first.promise);
    const settings = vi.fn().mockResolvedValue(undefined);
    await queue.run('settings', settings);
    expect(settings).toHaveBeenCalledTimes(1);
    first.resolve();
    await p1;
  });

  it('rejects the waiting callers when the queued write fails, and keeps going', async () => {
    const queue = new SaveQueue();
    const first = deferred();
    const p1 = queue.run('clips', () => first.promise);
    const p2 = queue.run('clips', () => Promise.reject(new Error('disk full')));
    first.resolve();
    await p1;
    await expect(p2).rejects.toThrow('disk full');
    const after = vi.fn().mockResolvedValue(undefined);
    await queue.run('clips', after);
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('rejects the caller when an immediate write fails', async () => {
    const queue = new SaveQueue();
    await expect(queue.run('clips', () => Promise.reject(new Error('no')))).rejects.toThrow('no');
  });

  it('idle resolves even when the write it waited on fails', async () => {
    const queue = new SaveQueue();
    const failing = deferred();
    const p = queue.run('clips', () => failing.promise);
    p.catch(() => {});
    const idle = queue.idle('clips');
    failing.reject(new Error('disk full'));
    await expect(idle).resolves.toBeUndefined();
  });

  it('idle resolves once every write for a key, or every key, has finished', async () => {
    const queue = new SaveQueue();
    const first = deferred();
    const done: string[] = [];
    queue.run('clips', async () => {
      await first.promise;
      done.push('first');
    });
    queue.run('clips', async () => {
      done.push('second');
    });
    queue.run('settings', () => Promise.reject(new Error('ignored'))).catch(() => {});

    const idleClips = queue.idle('clips');
    const idleAll = queue.idle();
    first.resolve();
    await idleClips;
    await idleAll;
    expect(done).toEqual(['first', 'second']);
    await queue.idle('nothing-queued');
  });
});
