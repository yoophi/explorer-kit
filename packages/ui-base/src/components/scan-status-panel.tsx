import type { ReactNode } from "react";
import { cn } from "@yoophi/ui-base/lib/utils";

export type ScanCount = { key: string; label: string; value: string | number };
export type ScanStatusPanelProps = {
  phase: string;
  status?: string;
  counts?: readonly ScanCount[];
  path?: string | null;
  message?: string | null;
  error?: string | null;
  summary?: ReactNode;
  onCancel?: () => void;
  onRetry?: () => void;
  cancelDisabled?: boolean;
  retryDisabled?: boolean;
  cancelLabel?: string;
  retryLabel?: string;
  className?: string;
};

/** Describes work without inventing a percentage for an unknown total. */
export function ScanStatusPanel({ phase, status, counts = [], path, message, error, summary, onCancel, onRetry, cancelDisabled, retryDisabled, cancelLabel = "중지", retryLabel = "다시 시도", className }: ScanStatusPanelProps) {
  return (
    <section aria-label="스캔 상태" aria-live="polite" className={cn("grid gap-2 rounded-md border bg-background p-3 text-sm", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="font-medium">{phase}</strong>
        {status ? <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-xs">{status}</span> : null}
      </div>
      {counts.length > 0 ? <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">{counts.map(({ key, label, value }) => <div key={key} className="flex gap-1"><dt>{label}:</dt><dd className="tabular-nums">{value}</dd></div>)}</dl> : null}
      {path ? <p className="break-all text-xs text-muted-foreground">{path}</p> : null}
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      {summary}
      {onCancel || onRetry ? <div className="flex flex-wrap gap-2">
        {onCancel ? <button type="button" disabled={cancelDisabled} onClick={onCancel} className="rounded-md border px-2 py-1 text-xs disabled:opacity-50">{cancelLabel}</button> : null}
        {onRetry ? <button type="button" disabled={retryDisabled} onClick={onRetry} className="rounded-md border px-2 py-1 text-xs disabled:opacity-50">{retryLabel}</button> : null}
      </div> : null}
    </section>
  );
}
