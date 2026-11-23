import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-[8px] p-6 sm:p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
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
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div>
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            404 Not Found
          </span>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Page Not Found
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            The page you are looking for does not exist or may have been moved.
          </p>
        </div>
        <div className="pt-2 flex justify-center">
          <Link href="/">
            <Button variant="primary">Return Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
