"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  maxWidth = "md",
}: ModalProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-enter"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog container
          Mobile (<640px): Full-screen bottom sheet with pull handle
          Desktop (>=640px): Centered glass-strong card with 16px radius
      */}
      <div
        className={cn(
          "relative z-10 flex flex-col glass-strong text-slate-900 w-full max-h-[92vh] sm:max-h-[85vh] rounded-t-[20px] sm:rounded-[16px] overflow-hidden",
          maxWidthClass,
          className
        )}
      >
        {/* Mobile drag handle */}
        <div className="flex sm:hidden justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300/80" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-6 border-b border-white/60 shrink-0">
          <div className="space-y-1 pr-6">
            {title && (
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight font-heading">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-slate-500 leading-normal">{description}</p>
            )}
          </div>
          {/* Close button with >=44px touch target */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[10px] text-slate-400 hover:text-slate-800 hover:bg-white/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA]"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[60vh] sm:max-h-[65vh] text-left">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 p-4 sm:p-6 border-t border-white/60 bg-white/40 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
