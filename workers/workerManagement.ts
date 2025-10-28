import { CONFIG } from "@/helpers/useChatHelper";

export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Set<Worker> = new Set();
  private busyWorkers: Map<Worker, { timeout: ReturnType<typeof setTimeout> }> =
    new Map();
  private taskQueue: Array<{
    data: any;
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  private isTerminated = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (typeof window === "undefined") return;

    const poolSize = Math.min(CONFIG.WORKER_POOL_SIZE, 4);

    for (let i = 0; i < poolSize; i++) {
      try {
        const worker = new Worker(
          new URL("./sseWorker.ts", import.meta.url),
          { type: "module" }
        );

        this.workers.push(worker);
        this.availableWorkers.add(worker);
      } catch (err) {
        console.error("Failed to create worker:", err);
      }
    }
  }

  async execute<T>(data: any): Promise<T> {
    if (this.isTerminated) {
      throw new Error("Worker pool is terminated");
    }

    return new Promise((resolve, reject) => {
      const task = { data, resolve, reject, timestamp: Date.now() };

      if (this.availableWorkers.size > 0) {
        this.runTask(task);
      } else {
        if (this.taskQueue.length > 100) {
          reject(new Error("Task queue is full"));
          return;
        }
        this.taskQueue.push(task);
      }
    });
  }

  private runTask(task: (typeof this.taskQueue)[0]) {
    const worker = Array.from(this.availableWorkers)[0];
    if (!worker) return;

    this.availableWorkers.delete(worker);

    const timeout = setTimeout(() => {
      this.handleWorkerTimeout(worker, task);
    }, CONFIG.WORKER_TIMEOUT_MS);

    this.busyWorkers.set(worker, { timeout });

    const handleMessage = (e: MessageEvent) => {
      this.cleanupWorkerTask(worker, handleMessage, handleError);

      if (e.data.error) {
        task.reject(new Error(e.data.error));
      } else {
        task.resolve(e.data);
      }

      this.processNextTask();
    };

    const handleError = (err: ErrorEvent) => {
      this.cleanupWorkerTask(worker, handleMessage, handleError);
      task.reject(new Error(err.message || "Worker error"));
      this.processNextTask();
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);

    try {
      worker.postMessage(task.data);
    } catch (err) {
      this.cleanupWorkerTask(worker, handleMessage, handleError);
      task.reject(err instanceof Error ? err : new Error(String(err)));
      this.processNextTask();
    }
  }

  private handleWorkerTimeout(
    worker: Worker,
    task: (typeof this.taskQueue)[0]
  ) {
    console.error("Worker task timeout");
    this.busyWorkers.delete(worker);
    this.availableWorkers.add(worker);
    task.reject(new Error("Worker task timeout"));
    this.processNextTask();
  }

  private cleanupWorkerTask(
    worker: Worker,
    handleMessage: (e: MessageEvent) => void,
    handleError: (err: ErrorEvent) => void
  ) {
    worker.removeEventListener("message", handleMessage);
    worker.removeEventListener("error", handleError);

    const busyInfo = this.busyWorkers.get(worker);
    if (busyInfo) {
      clearTimeout(busyInfo.timeout);
      this.busyWorkers.delete(worker);
    }

    this.availableWorkers.add(worker);
  }

  private processNextTask() {
    if (this.taskQueue.length > 0 && this.availableWorkers.size > 0) {
      const task = this.taskQueue.shift()!;

      if (Date.now() - task.timestamp > 30000) {
        task.reject(new Error("Task expired"));
        this.processNextTask();
        return;
      }

      this.runTask(task);
    }
  }

  getStats() {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.size,
      busyWorkers: this.busyWorkers.size,
      queuedTasks: this.taskQueue.length,
    };
  }

  terminate() {
    this.isTerminated = true;

    this.busyWorkers.forEach((info) => clearTimeout(info.timeout));
    this.busyWorkers.clear();

    this.workers.forEach((w) => {
      try {
        w.terminate();
      } catch (err) {
        console.error("Error terminating worker:", err);
      }
    });

    this.workers = [];
    this.availableWorkers.clear();

    this.taskQueue.forEach((task) => {
      task.reject(new Error("Worker pool terminated"));
    });
    this.taskQueue = [];
  }
}

export let workerPool: WorkerPool | null = null;

export function getWorkerPool() {
  if (!workerPool || (workerPool as any).isTerminated) {
    workerPool = new WorkerPool();
  }
  return workerPool;
}
