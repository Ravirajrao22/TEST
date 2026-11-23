import * as React from "react";
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/ui/skeleton";

export default function StudentLoading() {
  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="text-center space-y-2">
        <Skeleton className="h-7 w-48 mx-auto" />
        <Skeleton className="h-4 w-72 mx-auto" />
      </div>

      <div className="rounded-[8px] border border-slate-200 bg-white p-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-11 w-full rounded-[8px]" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-11 w-full rounded-[8px]" />
        <div className="pt-2">
          <Skeleton className="h-11 w-full rounded-[6px]" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
