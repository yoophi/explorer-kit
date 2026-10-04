import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@yoophi/ui-radix/lib/utils";

// Preserves the Movie/Repo button contract while the current Radix Button
// keeps its own variants and geometry.
const compatibleButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-md border border-transparent text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/85",
        outline: "border-border bg-background hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
        ghost: "hover:bg-muted",
      },
      size: {
        default: "h-8 gap-1.5 px-2.5",
        sm: "h-7 gap-1 px-2 text-xs",
        lg: "h-9 gap-1.5 px-3",
        icon: "size-8",
        "icon-sm": "size-7",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type CompatibleButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof compatibleButtonVariants> & { asChild?: boolean };

function CompatibleButton({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: CompatibleButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(compatibleButtonVariants({ variant, size, className }))} {...props} />;
}

// Local app wrappers can re-export Button/buttonVariants without changing calls.
export { CompatibleButton, compatibleButtonVariants };
export { CompatibleButton as Button, compatibleButtonVariants as buttonVariants };
export type { CompatibleButtonProps };
