import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  description?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  description,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("p-5 sm:p-6 space-y-3 relative overflow-hidden", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div className="w-9 h-9 rounded-[10px] bg-indigo-50/70 border border-indigo-100/60 flex items-center justify-center text-[#4338CA] shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-heading">
          {value}
        </div>

        {trend && (
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "font-semibold flex items-center gap-0.5",
                trend.isPositive !== false ? "text-[#15803D]" : "text-[#B91C1C]"
              )}
            >
              {trend.isPositive !== false ? "↑" : "↓"} {trend.value}
            </span>
            {trend.label && (
              <span className="text-slate-400">{trend.label}</span>
            )}
          </div>
        )}

        {description && !trend && (
          <p className="text-xs text-slate-500">{description}</p>
        )}
      </div>
    </Card>
  );
}
