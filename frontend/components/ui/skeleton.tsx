import React from "react";

/**
 * Generic skeleton component for single elements.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/5 dark:bg-white/5 light:bg-gray-200 ${className}`}
    />
  );
}

/**
 * Skeleton loader for table rows.
 * Use when fetching data to provide visual feedback.
 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-white/5">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 animate-pulse rounded bg-white/10" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/**
 * Skeleton loader for stat cards.
 * Use in hero sections with metrics.
 */
export function StatCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
          <div className="h-8 w-16 animate-pulse rounded bg-white/10" />
        </div>
      ))}
    </>
  );
}
