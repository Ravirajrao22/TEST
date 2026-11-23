import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-[12px] bg-slate-200/70", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5 w-full", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4 rounded-[8px]",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[16px] glass p-4 sm:p-6 space-y-4",
        className
      )}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-5 w-16 rounded-[8px]" />
      </div>
      <SkeletonText lines={2} />
      <div className="pt-2 flex justify-end gap-2">
        <Skeleton className="h-11 w-24 rounded-[10px]" />
      </div>
    </div>
  );
}
