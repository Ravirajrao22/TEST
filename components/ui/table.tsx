import * as React from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  mobileLabel?: string;
}

export interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (item: T) => void;
}

/**
 * ResponsiveTable:
 * - Built on `glass-solid` surface so text contrast is never compromised
 * - On desktop (>= 640px): renders a semantic HTML table
 * - On mobile (< 640px): transforms into stacked cards with no horizontal scroll
 */
export function ResponsiveTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No records found.",
  className,
  onRowClick,
}: ResponsiveTableProps<T>) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full glass-solid rounded-[16px] p-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile Stacked Cards View (< 640px) */}
      <div className="block sm:hidden space-y-3">
        {data.map((item, index) => {
          const rowKey = keyExtractor(item, index);
          return (
            <div
              key={rowKey}
              onClick={() => onRowClick && onRowClick(item)}
              className={cn(
                "glass-solid rounded-[16px] p-4 space-y-2 text-left",
                onRowClick && "active:bg-indigo-50/40 cursor-pointer"
              )}
            >
              {columns.map((col) => {
                const label = col.mobileLabel || col.header;
                const value = col.render ? col.render(item, index) : item[col.key];
                return (
                  <div
                    key={col.key}
                    className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100/80 last:border-b-0 text-sm"
                  >
                    <span className="text-slate-500 font-medium shrink-0">
                      {label}
                    </span>
                    <div className="text-slate-900 text-right font-normal break-words max-w-[65%]">
                      {value}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Desktop / Tablet Semantic Table View (>= 640px) */}
      <div className="hidden sm:block w-full overflow-hidden rounded-[16px] glass-solid">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200/70 bg-slate-50/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3.5 font-semibold text-slate-700 text-xs uppercase tracking-wider",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80">
            {data.map((item, index) => {
              const rowKey = keyExtractor(item, index);
              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={cn(
                    "transition-colors duration-150",
                    onRowClick
                      ? "cursor-pointer hover:bg-indigo-50/30 active:bg-indigo-50/50"
                      : "hover:bg-slate-50/40"
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3.5 text-slate-800 align-middle",
                        col.className
                      )}
                    >
                      {col.render ? col.render(item, index) : item[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
