'use client';

import React from 'react';
import { format } from 'date-fns';
import { User, Edit2, Trash2, Plus } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/Skeletons';

interface AuditEntry {
  id: number;
  action: 'create' | 'update' | 'delete';
  entity_type: string;
  entity_id: number;
  user_id: number;
  user_name: string;
  changes: Record<string, any>;
  timestamp: string;
}

interface AuditTrailProps {
  entries: AuditEntry[];
  isLoading?: boolean;
  title?: string;
}

const actionColors: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  create: {
    bg: 'bg-emerald-600/20 text-emerald-300',
    icon: <Plus className="h-4 w-4" />,
    label: 'Créé',
  },
  update: {
    bg: 'bg-blue-600/20 text-blue-300',
    icon: <Edit2 className="h-4 w-4" />,
    label: 'Modifié',
  },
  delete: {
    bg: 'bg-red-600/20 text-red-300',
    icon: <Trash2 className="h-4 w-4" />,
    label: 'Supprimé',
  },
};

export default function AuditTrail({ entries, isLoading, title = 'Historique des modifications' }: AuditTrailProps) {
  if (isLoading) {
    return <TableSkeleton rows={5} columns={4} />;
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
      <h3 className="mb-4 font-semibold text-white dark:text-white light:text-gray-900">{title}</h3>

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">Aucune modification enregistrée</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const action = actionColors[entry.action];
            return (
              <div key={entry.id} className="flex items-start gap-3 rounded-lg border border-white/5 bg-white/2 p-3 dark:border-white/5 dark:bg-white/2 light:border-gray-200 light:bg-gray-50">
                <div className={`mt-1 rounded p-1.5 ${action.bg}`}>{action.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-white dark:text-white light:text-gray-900">
                        {action.label} {entry.entity_type}
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                        <User className="inline h-3 w-3 mr-1" />
                        {entry.user_name}
                      </p>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-500 light:text-gray-500 whitespace-nowrap">
                      {format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                  {entry.changes && Object.keys(entry.changes).length > 0 && (
                    <div className="mt-2 text-xs text-zinc-300 dark:text-zinc-300 light:text-gray-700 space-y-1">
                      {Object.entries(entry.changes).map(([key, value]) => (
                        <p key={key}>
                          <span className="font-mono">{key}</span>:{' '}
                          {Array.isArray(value) ? `${value[0]} → ${value[1]}` : String(value)}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
