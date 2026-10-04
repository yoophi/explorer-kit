import type { ReactNode } from "react";
import { cn } from "@yoophi/ui-base/lib/utils";

export type ThumbnailFieldProps = {
  src?: string | null;
  alt: string;
  placeholder?: ReactNode;
  busy?: boolean;
  error?: string | null;
  actions?: ReactNode;
  className?: string;
  imageClassName?: string;
};

/** A controlled preview; callers own URL conversion, upload, and object URL cleanup. */
export function ThumbnailField({ src, alt, placeholder = "이미지 없음", busy = false, error, actions, className, imageClassName }: ThumbnailFieldProps) {
  return (
    <div className={cn("grid gap-2", className)} aria-busy={busy}>
      <div className="flex min-h-24 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
        {src ? <img src={src} alt={alt} className={cn("max-h-56 max-w-full object-contain", imageClassName)} />
          : <span className="p-3 text-sm text-muted-foreground">{placeholder}</span>}
      </div>
      {busy ? <span role="status" className="text-xs text-muted-foreground">이미지 처리 중…</span> : null}
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
