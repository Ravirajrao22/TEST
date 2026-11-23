import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Back",
  action,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 pb-5 border-b border-white/70 mb-6 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="space-y-1">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#4338CA] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA] -ml-1 pr-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>{backLabel}</span>
          </Link>
        )}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-heading">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-slate-500 leading-normal max-w-2xl">{description}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 pt-2 sm:pt-0 shrink-0">{action}</div>}
    </div>
  );
}
