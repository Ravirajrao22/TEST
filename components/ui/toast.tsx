"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = React.useCallback(
    (toast: Omit<ToastMessage, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { ...toast, id };
      setToasts((prev) => [...prev, newToast]);

      const duration = toast.duration ?? 4000;
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toastHelpers = React.useMemo(
    () => ({
      success: (message: string, title?: string) =>
        addToast({ type: "success", message, title }),
      error: (message: string, title?: string) =>
        addToast({ type: "error", message, title }),
      warning: (message: string, title?: string) =>
        addToast({ type: "warning", message, title }),
      info: (message: string, title?: string) =>
        addToast({ type: "info", message, title }),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, toast: toastHelpers }}
    >
      {children}
      {/* Toast viewport */}
      <div
        aria-live="assertive"
        className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: () => void;
}) {
  const statusMeta = {
    success: {
      icon: (
        <svg className="w-5 h-5 text-[#15803D] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
        </svg>
      ),
      badgeClass: "bg-[#DCFCE7] text-[#15803D] border-green-200",
    },
    error: {
      icon: (
        <svg className="w-5 h-5 text-[#B91C1C] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      badgeClass: "bg-[#FEE2E2] text-[#B91C1C] border-red-200",
    },
    warning: {
      icon: (
        <svg className="w-5 h-5 text-[#B45309] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      badgeClass: "bg-[#FEF3C7] text-[#B45309] border-amber-200",
    },
    info: {
      icon: (
        <svg className="w-5 h-5 text-[#4338CA] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      badgeClass: "bg-indigo-50 text-[#4338CA] border-indigo-200",
    },
  }[toast.type];

  return (
    <div
      role="alert"
      className={cn(
        "pointer-events-auto flex items-start gap-3 p-4 rounded-[12px] glass-strong text-slate-900",
        "shadow-[0_12px_40px_rgba(31,41,90,0.12)] border border-white/80 animate-enter"
      )}
    >
      <div className="mt-0.5">{statusMeta.icon}</div>
      <div className="flex-1 space-y-0.5 text-left">
        {toast.title && (
          <h4 className="text-sm font-semibold text-slate-900 font-heading">{toast.title}</h4>
        )}
        <p className="text-xs sm:text-sm text-slate-600 leading-snug">
          {toast.message}
        </p>
      </div>
      {/* Dismiss button (min 44px touch area) */}
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center -mr-2 -mt-2 rounded-[8px] text-slate-400 hover:text-slate-800 hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA]"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
