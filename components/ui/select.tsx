import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      children,
      label,
      error,
      helperText,
      options,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-slate-900"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              "flex w-full min-h-[44px] appearance-none rounded-[12px] border bg-white/85 backdrop-blur-xs px-3.5 py-2.5 pr-10 text-[16px] text-slate-900 transition-all duration-150",
              "border-slate-200/80 hover:border-slate-300 shadow-2xs",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA] focus-visible:ring-offset-2 focus-visible:border-[#4338CA] focus-visible:bg-white",
              "disabled:cursor-not-allowed disabled:bg-slate-50/80 disabled:text-slate-500",
              error && "border-[#B91C1C] focus-visible:ring-[#B91C1C]",
              className
            )}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
            }
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white text-slate-900">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        {error && (
          <p id={`${selectId}-error`} className="text-xs text-[#B91C1C] font-medium animate-enter">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${selectId}-helper`} className="text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
