import { ScanLifecycle } from "./scan-lifecycle.ts";

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
  const lifecycle = new ScanLifecycle(
    { start: () => transport.start(), cancel: transport.cancel },
    { onStartError: (error) => rejectScan(error), onCancelError: console.error },
  );
  const abort = () => {
    lifecycle.dispose();
    rejectScan(signal?.reason ?? new DOMException("Aborted", "AbortError"));
  };
  try {
    await new Promise<void>((resolve, reject) => {
      rejectScan = reject;
      signal?.addEventListener("abort", abort, { once: true });
      void transport.listen((event) => {
        if (signal?.aborted || !lifecycle.accepts(event.scanId)) return;
        if (event.status === "completed") { lifecycle.finish(event.scanId); resolve(); }
        else if (event.status === "cancelled") { lifecycle.finish(event.scanId); reject(new DOMException("검색을 중지했습니다.", "AbortError")); }
        else if (event.status === "failed") { lifecycle.finish(event.scanId); reject(new Error(event.error)); }
        else {
          try { onItem(event.item); } catch (error) { lifecycle.dispose(); reject(error); }
        }
      }).then((cleanup) => {
        // An abort can occur while Tauri is still installing the listener.
        if (signal?.aborted || lifecycle.state === "disposed") {
          cleanup();
          return;
        }
        unlisten = cleanup;
        lifecycle.start({ scanId });
      }).catch(reject);
    });
  } finally {
    lifecycle.dispose();
    signal?.removeEventListener("abort", abort);
    unlisten?.();
  }
}
