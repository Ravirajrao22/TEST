import * as React from "react";
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-28 rounded-[6px]" />
          <Skeleton className="h-11 w-32 rounded-[6px]" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <div className="rounded-[8px] border border-slate-200 bg-white p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <SkeletonText lines={4} />
      </div>
    </div>
  );
}
