import { ReactNode } from 'react';
import { FileQuestion, Inbox, Database } from 'lucide-react';

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Shared empty state component for lists/tables with no data.
 * Use across admin pages when API returns zero results.
 */
export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-12 text-center">
      <div className="mb-4 rounded-full bg-white/5 p-4 text-white/40">
        {icon || <Inbox className="h-12 w-12" />}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      {description && <p className="mb-6 max-w-md text-sm text-white/60">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="rounded-lg bg-amber-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
