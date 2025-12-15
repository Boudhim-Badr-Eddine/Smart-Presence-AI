'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ExpandableRowProps {
  isExpanded: boolean;
  onToggle: () => void;
  summary: React.ReactNode;
  details: React.ReactNode;
  className?: string;
}

export function ExpandableRow({
  isExpanded,
  onToggle,
  summary,
  details,
  className = '',
}: ExpandableRowProps) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer border-b border-white/5 transition hover:bg-white/5 dark:border-white/5 dark:hover:bg-white/5 light:border-gray-100 light:hover:bg-gray-50 ${className}`}
      >
        <td className="px-4 py-3">
          <ChevronDown
            className={`h-5 w-5 text-zinc-400 transition ${isExpanded ? 'rotate-180' : ''}`}
          />
        </td>
        {typeof summary === 'string' ? (
          <td colSpan={4} className="px-4 py-3 text-sm text-white">
            {summary}
          </td>
        ) : (
          summary
        )}
      </tr>
      {isExpanded && (
        <tr className="border-b border-white/5 bg-white/3 dark:border-white/5 dark:bg-white/3 light:border-gray-100 light:bg-gray-50">
          <td colSpan={10} className="px-4 py-4">
            <div className="space-y-3">{details}</div>
          </td>
        </tr>
      )}
    </>
  );
}
