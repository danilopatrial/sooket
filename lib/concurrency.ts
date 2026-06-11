interface QueueEntry {
  resolve: (granted: boolean) => void;
  timer?: ReturnType<typeof setTimeout>;
}

export class ExecutionSemaphore {
  readonly max: number;
  readonly maxQueue: number;
  /**
   * Max time (ms) a request may wait in the queue before `acquire()` gives up
   * and resolves `false`. `0` (the default) means wait indefinitely — the
   * historical behaviour. A positive value bounds queue residency so a backlog
   * of slow executions can't pin callers on an open connection forever; the
   * caller maps the `false` to the same 503 it returns when the queue is full.
   */
  readonly queueTimeoutMs: number;
  private running = 0;
  private queue: QueueEntry[] = [];

  constructor(max: number, maxQueue: number, queueTimeoutMs = 0) {
    this.max = max;
    this.maxQueue = maxQueue;
    this.queueTimeoutMs = queueTimeoutMs;
  }

  get activeCount(): number {
    return this.running;
  }

  get queueDepth(): number {
    return this.queue.length;
  }

  acquire(): Promise<boolean> {
    if (this.running < this.max) {
      this.running++;
      return Promise.resolve(true);
    }
    if (this.queue.length >= this.maxQueue) {
      return Promise.resolve(false);
    }
    return new Promise<boolean>((resolve) => {
      const entry: QueueEntry = { resolve };
      if (this.queueTimeoutMs > 0) {
        entry.timer = setTimeout(() => {
          // Wait timed out: drop the entry (freeing a queue slot) and reject the
          // caller. If release() already dequeued it, indexOf returns -1 and we
          // do nothing, so the waiter is never settled twice.
          const idx = this.queue.indexOf(entry);
          if (idx !== -1) {
            this.queue.splice(idx, 1);
            resolve(false);
          }
        }, this.queueTimeoutMs);
      }
      this.queue.push(entry);
    });
  }

  release(): void {
    // running must stay >= 0 even if release is called spuriously
    if (this.running > 0) this.running--;
    const next = this.queue.shift();
    if (next) {
      if (next.timer) clearTimeout(next.timer);
      this.running++;
      next.resolve(true);
    }
  }
}

export const executionSemaphore = new ExecutionSemaphore(
  Number(process.env.EXECUTION_CONCURRENCY ?? 10),
  Number(process.env.EXECUTION_MAX_QUEUE ?? 50),
  Number(process.env.EXECUTION_QUEUE_TIMEOUT_MS ?? 10_000),
);
