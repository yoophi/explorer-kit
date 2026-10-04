import { useId, useState, type FormEvent, type ReactNode } from "react";
import { cn } from "@yoophi/ui-base/lib/utils";

export type GroupOption = { key: string; label: string; count?: number; disabled?: boolean };

export function GroupSelector({ options, selectedKey, onSelect, label, disabled = false, actions, className, renderControl }: {
  options: readonly GroupOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
  label: string;
  disabled?: boolean;
  actions?: ReactNode;
  className?: string;
  /** Preserve an app's existing select primitive while sharing the option contract. */
  renderControl?: (props: { options: readonly GroupOption[]; selectedKey: string; onSelect: (key: string) => void; label: string; disabled: boolean }) => ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {renderControl ? renderControl({ options, selectedKey, onSelect, label, disabled: disabled || options.length === 0 }) : <select
        aria-label={label}
        value={selectedKey}
        disabled={disabled || options.length === 0}
        onChange={(event) => onSelect(event.target.value)}
        className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        {options.length === 0 ? <option value="">그룹 없음</option> : options.map((option) => (
          <option key={option.key} value={option.key} disabled={option.disabled}>
            {option.label}{option.count === undefined ? "" : ` (${option.count})`}
          </option>
        ))}
      </select>}
      {actions}
    </div>
  );
}

export function GroupCreateRow({ value, onChange, onCreate, label, createLabel = "추가", pending = false, disabled = false, error, fields, className }: {
  value: string;
  onChange: (value: string) => void;
  onCreate: () => void | boolean | Promise<void | boolean>;
  label: string;
  createLabel?: string;
  pending?: boolean;
  disabled?: boolean;
  error?: string | null;
  fields?: ReactNode;
  className?: string;
}) {
  const inputId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const busy = pending || submitting;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || disabled) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onCreate();
    } catch (failure) {
      setSubmitError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <form onSubmit={(event) => void submit(event)} aria-busy={busy} className={cn("grid gap-2", className)}>
      <label htmlFor={inputId} className="text-sm font-medium">{label}</label>
      <div className="flex flex-wrap items-center gap-2">
        <input id={inputId} value={value} onChange={(event) => onChange(event.target.value)} disabled={busy || disabled} className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" />
        {fields}
        <button type="submit" disabled={busy || disabled || value.trim().length === 0} className="h-8 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy ? "처리 중…" : createLabel}</button>
      </div>
      {error || submitError ? <p role="alert" className="text-xs text-destructive">{error ?? submitError}</p> : null}
    </form>
  );
}

export function GroupRowActions({ active, onActivate, onDelete, disabled = false, deleteDisabled = false, activateLabel = "사용", deleteLabel = "삭제", extra }: {
  active: boolean;
  onActivate: () => void;
  onDelete: () => void;
  disabled?: boolean;
  deleteDisabled?: boolean;
  activateLabel?: string;
  deleteLabel?: string;
  extra?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1">
      {active ? <span aria-current="true" className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground">현재</span>
        : <button type="button" disabled={disabled} onClick={onActivate} className="rounded-md border px-2 py-1 text-xs disabled:opacity-50">{activateLabel}</button>}
      {extra}
      <button type="button" disabled={disabled || deleteDisabled} onClick={onDelete} className="rounded-md px-2 py-1 text-xs text-destructive disabled:opacity-50" aria-label={deleteLabel}>{deleteLabel}</button>
    </div>
  );
}
