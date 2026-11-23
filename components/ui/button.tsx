import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium transition-all duration-150 ease-out cursor-pointer select-none disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA] focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-[#4338CA] text-white hover:bg-[#3730A3] active:bg-[#312E81] shadow-[0_4px_14px_rgba(67,56,202,0.30)] hover:shadow-[0_6px_20px_rgba(67,56,202,0.38)] active:scale-[0.99]",
        secondary:
          "bg-white/65 backdrop-blur-md border border-white/80 text-slate-800 hover:bg-white/85 active:bg-white/95 shadow-xs hover:shadow-sm active:scale-[0.99]",
        ghost:
          "bg-transparent text-slate-700 hover:bg-indigo-50/60 hover:text-[#4338CA] active:bg-indigo-100/60",
        destructive:
          "bg-[#B91C1C] text-white hover:bg-red-800 active:bg-red-900 shadow-xs active:scale-[0.99]",
      },
      size: {
        sm: "min-h-[44px] px-3.5 py-2 text-sm",
        md: "min-h-[44px] px-4 py-2.5 text-base",
        lg: "min-h-[48px] px-5 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading = false, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
