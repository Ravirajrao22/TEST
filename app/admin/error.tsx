"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Admin section error:", error);
  }, [error]);

  return (
    <div className="rounded-[8px] border border-slate-200 bg-white p-6 sm:p-8 text-center space-y-4 max-w-lg mx-auto my-8">
      <div className="w-12 h-12 rounded-full bg-red-50 text-red-700 flex items-center justify-center mx-auto">
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Admin Portal Error
        </h2>
        <p className="mt-1.5 text-sm text-slate-600">
          An error occurred while loading this section of the admin dashboard.
        </p>
        {error?.message && (
          <div className="mt-3 p-3 rounded-[6px] bg-red-50 border border-red-200 text-left font-mono text-xs text-red-800 break-words">
            <span className="font-semibold block text-red-900 mb-0.5">Details:</span>
            {error.message}
            {error.digest && (
              <span className="block text-[10px] text-slate-500 mt-1">
                Digest: {error.digest}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="primary" onClick={() => reset()} className="w-full sm:w-auto">
          Try again
        </Button>
        <Link href="/admin" className="w-full sm:w-auto">
          <Button variant="secondary" className="w-full">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
