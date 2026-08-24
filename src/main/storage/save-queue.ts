export class SaveQueue {
  private inFlight = new Map<string, Promise<void>>();
  private pending = new Map<string, { write: () => Promise<void>; settle: Deferred }>();

  run(key: string, write: () => Promise<void>): Promise<void> {
    const current = this.inFlight.get(key);
    if (!current) {
      return this.start(key, write);
    }

    const queued = this.pending.get(key);
    if (queued) {
      queued.write = write;
      return queued.settle.promise;
    }

    const settle = new Deferred();
    this.pending.set(key, { write, settle });
    return settle.promise;
  }

  async idle(key?: string): Promise<void> {
    const keys = key === undefined ? [...this.inFlight.keys()] : [key];
    for (const k of keys) {
      let current = this.inFlight.get(k);
      while (current) {
        await current.catch(() => undefined);
        current = this.inFlight.get(k);
      }
    }
  }

  private start(key: string, write: () => Promise<void>): Promise<void> {
    const promise = Promise.resolve()
      .then(write)
      .finally(() => {
        this.inFlight.delete(key);
        const next = this.pending.get(key);
        if (next) {
          this.pending.delete(key);
          this.start(key, next.write).then(next.settle.resolve, next.settle.reject);
        }
      });
    this.inFlight.set(key, promise);
    return promise;
  }
}

class Deferred {
  promise: Promise<void>;
  resolve!: () => void;
  reject!: (error: unknown) => void;

  constructor() {
    this.promise = new Promise<void>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}
