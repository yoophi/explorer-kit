import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@yoophi/ui-base/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@yoophi/ui-base/components/dialog";
import { cn } from "@yoophi/ui-base/lib/utils";

export type AsyncFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  onSubmit: () => boolean | void | Promise<boolean | void>;
  pending?: boolean;
  error?: string | null;
  submitLabel?: ReactNode;
  pendingLabel?: ReactNode;
  cancelLabel?: string;
  closeOnSuccess?: boolean;
  disabled?: boolean;
  footer?: ReactNode;
  className?: string;
  formClassName?: string;
  submitClassName?: string;
};

/** Keeps dismiss and duplicate submit disabled during a pending form operation. */
export function AsyncFormDialog({
  open, onOpenChange, title, description, children, onSubmit, pending = false, error,
  submitLabel = "저장", pendingLabel = "저장 중…", cancelLabel = "취소",
  closeOnSuccess = false, disabled = false, footer, className, formClassName, submitClassName,
}: AsyncFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const busy = pending || submitting;

  useEffect(() => {
    if (!open) setSubmitError(null);
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || disabled) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await onSubmit();
      if (closeOnSuccess && result !== false) onOpenChange(false);
    } catch (failure) {
      setSubmitError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (busy) return;
    if (nextOpen) setSubmitError(null);
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={className} showCloseButton={!busy}>
        <form onSubmit={(event) => void handleSubmit(event)} className={cn("grid gap-4", formClassName)} aria-busy={busy}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          {children}
          {error || submitError ? <p role="alert" className="text-sm text-destructive">{error ?? submitError}</p> : null}
          <DialogFooter>
            {footer}
            <Button type="button" variant="outline" disabled={busy} onClick={() => handleOpenChange(false)}>{cancelLabel}</Button>
            <Button type="submit" className={submitClassName} disabled={busy || disabled}>{busy ? pendingLabel : submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
