'use client';

import React from 'react';

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full space-y-4">
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-10 flex-1 animate-skeleton rounded-lg bg-white/10 dark:bg-white/10 light:bg-gray-200"
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className="h-12 flex-1 animate-skeleton rounded-lg bg-white/5 dark:bg-white/5 light:bg-gray-100"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
      <div className="h-6 w-1/3 animate-skeleton rounded-lg bg-white/20 dark:bg-white/20 light:bg-gray-200" />
      <div className="h-10 w-1/2 animate-skeleton rounded-lg bg-white/30 dark:bg-white/30 light:bg-gray-300" />
      <div className="h-4 w-2/3 animate-skeleton rounded-lg bg-white/10 dark:bg-white/10 light:bg-gray-100" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-4 w-20 animate-skeleton rounded bg-white/20 dark:bg-white/20 light:bg-gray-200" />
          <div className="h-8 w-16 animate-skeleton rounded bg-white/30 dark:bg-white/30 light:bg-gray-300" />
        </div>
        <div className="h-12 w-12 animate-skeleton rounded-lg bg-white/10 dark:bg-white/10 light:bg-gray-100" />
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white"
        >
          <div className="h-10 w-10 animate-skeleton rounded-full bg-white/20 dark:bg-white/20 light:bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-skeleton rounded bg-white/20 dark:bg-white/20 light:bg-gray-200" />
            <div className="h-3 w-1/2 animate-skeleton rounded bg-white/10 dark:bg-white/10 light:bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
