export class ExecutionSemaphore {
  readonly max: number;
  readonly maxQueue: number;
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(max: number, maxQueue: number) {
    this.max = max;
    this.maxQueue = maxQueue;
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
      this.queue.push(() => {
        this.running++;
        resolve(true);
      });
    });
  }

  release(): void {
    // running must stay >= 0 even if release is called spuriously
    if (this.running > 0) this.running--;
    const next = this.queue.shift();
    if (next) next();
  }
}

export const executionSemaphore = new ExecutionSemaphore(
  Number(process.env.EXECUTION_CONCURRENCY ?? 10),
  Number(process.env.EXECUTION_MAX_QUEUE ?? 50),
);
