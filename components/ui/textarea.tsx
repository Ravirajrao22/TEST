import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, rows = 3, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-slate-900"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          className={cn(
            "flex w-full min-h-[96px] rounded-[12px] border bg-white/85 backdrop-blur-xs px-3.5 py-2.5 text-[16px] text-slate-900 placeholder:text-slate-400 transition-all duration-150",
            "border-slate-200/80 hover:border-slate-300 shadow-2xs",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA] focus-visible:ring-offset-2 focus-visible:border-[#4338CA] focus-visible:bg-white",
            "disabled:cursor-not-allowed disabled:bg-slate-50/80 disabled:text-slate-500",
            error && "border-[#B91C1C] focus-visible:ring-[#B91C1C] focus-visible:border-[#B91C1C]",
            className
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
          }
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="text-xs text-[#B91C1C] font-medium animate-enter">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${textareaId}-helper`} className="text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
