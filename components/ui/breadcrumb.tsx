import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-sm text-slate-500 flex-wrap gap-1 mb-3", className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-0.5" />
            )}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="inline-flex min-h-[44px] items-center text-slate-500 hover:text-[#4338CA] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA] rounded-[6px] px-1.5 -mx-1 font-medium"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-none inline-flex items-center min-h-[44px] px-1.5"
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
