import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-xs font-semibold transition-colors select-none",
  {
    variants: {
      variant: {
        primary: "bg-indigo-50 text-[#4338CA] border border-indigo-200/60",
        secondary: "bg-white/80 backdrop-blur-sm text-slate-700 border border-slate-200/70",
        success: "bg-[#DCFCE7] text-[#15803D] border border-green-200",
        error: "bg-[#FEE2E2] text-[#B91C1C] border border-red-200",
        warning: "bg-[#FEF3C7] text-[#B45309] border border-amber-200",
        outline: "bg-transparent text-slate-700 border border-slate-300",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
