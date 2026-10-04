
export type ScanEvent<T> = { scanId: string } & (
  | { status: "item"; item: T }
  | { status: "completed" }
  | { status: "cancelled" }
  | { status: "failed"; error: string }
);

export type ScanTransport<T> = {
  listen: (receive: (event: ScanEvent<T>) => void) => Promise<() => void>;
  start: () => Promise<void>;
  cancel?: () => Promise<void>;
};

// Subscribe before starting work, and keep the listener until the terminal
// event has been received (the command response is not an event-delivery barrier).
export async function consumeScan<T>(
  transport: ScanTransport<T>,
  scanId: string,
  onItem: (item: T) => void,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  let unlisten: (() => void) | undefined;
  let rejectScan: (error: unknown) => void = () => {};
  let acknowledged = false;
  let settled = false;
  const cancelWorker = () => { void transport.cancel?.().catch(console.error); };
  const abort = () => {
    settled = true;
    if (acknowledged) cancelWorker();
    rejectScan(signal?.reason ?? new DOMException("Aborted", "AbortError"));
  };
  try {
    await new Promise<void>((resolve, reject) => {
      rejectScan = reject;
      signal?.addEventListener("abort", abort, { once: true });
      void transport.listen((event) => {
        if (settled || signal?.aborted || event.scanId !== scanId) return;
        if (event.status === "completed") { settled = true; resolve(); }
        else if (event.status === "cancelled") { settled = true; reject(new DOMException("검색을 중지했습니다.", "AbortError")); }
        else if (event.status === "failed") { settled = true; reject(new Error(event.error)); }
        else {
          try { onItem(event.item); } catch (error) { settled = true; cancelWorker(); reject(error); }
        }
      }).then((cleanup) => {
        // An abort can occur while Tauri is still installing the listener.
        if (signal?.aborted) {
          cleanup();
          return;
        }
        unlisten = cleanup;
        return transport.start().then(() => {
          acknowledged = true;
          // Abort may arrive while the backend is registering the scan.
          if (signal?.aborted) cancelWorker();
        });
      }).catch(reject);
    });
  } finally {
    settled = true;
    signal?.removeEventListener("abort", abort);
    unlisten?.();
  }
}
