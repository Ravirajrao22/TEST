"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}

export function Switch({
  id,
  checked,
  onCheckedChange,
  disabled = false,
  label,
  description,
  className,
}: SwitchProps) {
  const switchId = id || React.useId();

  const handleToggle = () => {
    if (!disabled) {
      onCheckedChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={cn("inline-flex items-center gap-3 select-none", className)}>
      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA] focus-visible:ring-offset-2",
          checked ? "bg-[#4338CA]" : "bg-slate-300/80",
          disabled && "opacity-50 cursor-not-allowed",
          // Minimum 44px touch target container
          "before:absolute before:-inset-2.5 before:content-['']"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-150 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>

      {(label || description) && (
        <label
          htmlFor={switchId}
          onClick={handleToggle}
          className={cn(
            "cursor-pointer leading-tight",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          {label && (
            <span className="block text-sm font-medium text-slate-900">
              {label}
            </span>
          )}
          {description && (
            <span className="block text-xs text-slate-500 mt-0.5">
              {description}
            </span>
          )}
        </label>
      )}
    </div>
  );
}
