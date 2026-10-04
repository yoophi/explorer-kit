import type { ReactNode } from "react";
import { cn } from "@yoophi/ui-base/lib/utils";

export type FacetItem = { key: string; label: string; count: number; disabled?: boolean };

export type FacetChipsProps = {
  items: readonly FacetItem[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  label: string;
  action?: ReactNode;
  empty?: ReactNode;
  className?: string;
  chipClassName?: string | ((item: FacetItem, selected: boolean) => string);
  renderChip?: (item: FacetItem, selected: boolean, chip: ReactNode) => ReactNode;
};

/** Counted, keyboard-operable filters. Aggregate keys and toggle policy stay in the app. */
export function FacetChips({ items, selectedKey, onSelect, label, action, empty, className, chipClassName, renderChip }: FacetChipsProps) {
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap items-center gap-2", className)}>
      {items.length === 0 ? empty : items.map((item) => {
        const selected = selectedKey === item.key;
        const extra = typeof chipClassName === "function" ? chipClassName(item, selected) : chipClassName;
        const chip = (
          <button
            key={item.key}
            type="button"
            disabled={item.disabled}
            aria-pressed={selected}
            onClick={() => onSelect(item.key)}
            className={cn("inline-flex min-h-7 items-center rounded-md px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50", selected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted", extra)}
          >
            {item.label} <span className="ml-1 tabular-nums">({item.count})</span>
          </button>
        );
        return <span key={item.key} className="contents">{renderChip ? renderChip(item, selected, chip) : chip}</span>;
      })}
      {action}
    </div>
  );
}

export type TagCloudProps = Omit<FacetChipsProps, "chipClassName"> & {
  /** Pass collection-core's tagCloudSizeClass to preserve an app's sizing scale. */
  sizeClassName?: (count: number, largestCount: number) => string;
  largestCount?: number;
};

export function TagCloud({ items, sizeClassName, largestCount, ...props }: TagCloudProps) {
  const maximum = largestCount ?? Math.max(0, ...items.map((item) => item.count));
  return <FacetChips {...props} items={items} chipClassName={(item) => sizeClassName?.(item.count, maximum) ?? ""} />;
}
