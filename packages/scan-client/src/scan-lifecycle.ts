export type ScanIdentity = { scanId: string };
export type ScanLifecycleTransport<Request extends ScanIdentity> = {
  start: (request: Request) => Promise<ScanIdentity | void>;
  cancel?: (scanId: string) => Promise<unknown>;
};
export type ScanLifecycleCallbacks = {
  onStartError: (error: unknown) => void;
  onCancelError: (error: unknown) => void;
};
type Job = { id: string; acknowledged: boolean; cancelRequested: boolean; cancelAttempt: number };

/** Transport-neutral identity/ack/cancel lifetime. DTOs and result commits stay in adapters. */
export class ScanLifecycle<Request extends ScanIdentity> {
  private job: Job | null = null;
  private disposed = false;
  private phase: "idle" | "running" | "cancelling" | "terminal" = "idle";

  private readonly transport: ScanLifecycleTransport<Request>;
  private readonly callbacks: ScanLifecycleCallbacks;
  private readonly options: { cancelBeforeAcknowledgement?: boolean };

  constructor(
    transport: ScanLifecycleTransport<Request>,
    callbacks: ScanLifecycleCallbacks,
    options: { cancelBeforeAcknowledgement?: boolean } = {},
  ) {
    this.transport = transport;
    this.callbacks = callbacks;
    this.options = options;
  }


  get state() { return this.disposed ? "disposed" as const : this.phase; }

  start(request: Request): boolean {
    if (this.disposed || this.job) return false;
    const job: Job = { id: request.scanId, acknowledged: false, cancelRequested: false, cancelAttempt: 0 };
    this.job = job;
    this.phase = "running";
    // Also turn synchronous transport failures into the asynchronous error contract.
    void Promise.resolve().then(() => this.transport.start(request)).then((ack) => {
      if (this.job !== job) return;
      if (ack && ack.scanId !== job.id) throw new Error("Scan acknowledgement ID mismatch");
      job.acknowledged = true;
      if (job.cancelRequested) void this.sendCancel(job);
    }).catch((error: unknown) => {
      if (this.job !== job) return;
      this.job = null;
      this.phase = "terminal";
      if (!this.disposed) this.callbacks.onStartError(error);
    });
    return true;
  }

  accepts(scanId: string): boolean { return !this.disposed && this.job?.id === scanId; }

  /** Invalidates identity before the adapter publishes its terminal result. */
  finish(scanId: string): boolean {
    if (this.job?.id !== scanId) return false;
    this.job = null;
    this.phase = "terminal";
    return !this.disposed;
  }

  cancel(): boolean {
    const job = this.job;
    if (!job) return false;
    job.cancelRequested = true;
    this.phase = "cancelling";
    if (job.acknowledged || this.options.cancelBeforeAcknowledgement) void this.sendCancel(job);
    return true;
  }

  /** Gates UI immediately; a pending ack still triggers worker cancellation. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancel();
  }

  private async sendCancel(job: Job): Promise<void> {
    const attempt = ++job.cancelAttempt;
    try { await this.transport.cancel?.(job.id); }
    catch (error) {
      if (this.job !== job || attempt !== job.cancelAttempt || !job.acknowledged) return;
      job.cancelRequested = false;
      this.phase = "running";
      if (!this.disposed) this.callbacks.onCancelError(error);
    }
  }
}
