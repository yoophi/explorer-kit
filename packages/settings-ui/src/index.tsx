import { useId, type ReactNode } from "react";

/** Composition-only settings UI. App owns controls, state, validation and persistence. */
export function SettingsSection({ title, description, children, actions, className = "" }: {
  title: string; description?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string;
}) {
  const id = useId();
  return <section aria-labelledby={id} className={`flex flex-col gap-4 ${className}`}>
    <div className="flex items-start justify-between gap-4">
      <div><h2 id={id} className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}</div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
    {children}
  </section>;
}

export function SettingsField({ label, description, children }: {
  label: string; description?: string;
  children: (props: { id: string; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  return <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-medium">{label}</label>
    {children({ id, "aria-describedby": description ? `${id}-description` : undefined })}
    {description && <p id={`${id}-description`} className="text-xs text-muted-foreground">{description}</p>}
  </div>;
}

export function SettingsToggle({ label, description, checked, disabled, onChange }: {
  label: string; description?: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return <div className="flex items-start gap-3">
    <input id={id} type="checkbox" checked={checked} disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
      aria-describedby={description ? `${id}-description` : undefined}
      className="mt-1 size-4 accent-primary" />
    <div><label htmlFor={id} className="text-sm font-medium">{label}</label>
      {description && <p id={`${id}-description`} className="text-xs text-muted-foreground">{description}</p>}</div>
  </div>;
}

export function SettingsStatus({ error, saving = false }: { error?: string | null; saving?: boolean }) {
  if (error) return <p role="alert" className="text-sm text-destructive">{error}</p>;
  if (saving) return <p role="status" className="text-sm text-muted-foreground">설정을 저장하는 중입니다…</p>;
  return null;
}
