import { useId } from "react";
import { Star } from "lucide-react";
import { cn } from "@yoophi/ui-base/lib/utils";

export const RATING_VALUES = Array.from({ length: 11 }, (_, index) => index / 2);

export function RatingStars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`평점 ${value}점 / 5점`}>
      <span className="flex" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className="relative size-4 text-muted-foreground">
            <Star className="size-4" />
            <span className="absolute inset-y-0 left-0 overflow-hidden text-primary" style={{ width: `${Math.max(0, Math.min(1, value - star + 1)) * 100}%` }}>
              <Star className="size-4 fill-current" />
            </span>
          </span>
        ))}
      </span>
      <span className="text-xs tabular-nums" aria-hidden="true">{value}</span>
    </span>
  );
}

export function RatingInput({ value, onChange, disabled }: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2 disabled:opacity-50">
      <legend className="mb-2 text-sm font-medium">평점</legend>
      <div className="flex items-center">
        {RATING_VALUES.map((rating, index) => (
          <label key={rating} className={cn("relative cursor-pointer", index === 0 ? "mr-3" : "h-9 w-4")} title={`${rating}점`}>
            <input
              type="radio"
              name={name}
              value={rating}
              checked={value === rating}
              onChange={() => onChange(rating)}
              aria-label={`${rating}점`}
              className="peer sr-only"
            />
            {index === 0 ? (
              <span className="flex h-8 items-center rounded-md border px-2 text-sm peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-ring">0점</span>
            ) : (
              <span className="flex h-9 w-4 items-center overflow-hidden peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                <Star aria-hidden="true" className={cn("size-8 shrink-0", index % 2 === 0 && "-translate-x-1/2", value >= rating ? "fill-primary text-primary" : "text-muted-foreground")} />
              </span>
            )}
          </label>
        ))}
        <span className="ml-3 text-sm tabular-nums" aria-live="polite">{value} / 5</span>
      </div>
      <p className="text-xs text-muted-foreground">별의 절반씩 선택하거나 방향키로 0.5점씩 조절하세요.</p>
    </fieldset>
  );
}
