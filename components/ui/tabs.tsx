"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  className,
  size = "md",
}: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 p-1 rounded-full bg-white/60 backdrop-blur-md border border-white/80 shadow-xs select-none",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA]",
              size === "sm" ? "px-3 py-1.5 text-xs min-h-[36px]" : "px-4 py-2 text-sm min-h-[44px]",
              isActive
                ? "bg-white text-[#4338CA] shadow-[0_2px_8px_rgba(31,41,90,0.08)] font-semibold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "ml-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none",
                  isActive
                    ? "bg-indigo-50 text-[#4338CA]"
                    : "bg-slate-200/60 text-slate-600"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
