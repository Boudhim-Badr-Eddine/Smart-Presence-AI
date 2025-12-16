import { AlertCircle, XCircle, RefreshCw, WifiOff } from 'lucide-react';
import { ReactNode } from 'react';

type ErrorBannerProps = {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  type?: 'error' | 'warning' | 'info';
  icon?: ReactNode;
};

/**
 * Shared error banner component with consistent styling and optional action button.
 * Use across admin pages for API errors, missing config, network issues, etc.
 */
export default function ErrorBanner({
  title = 'Erreur',
  message,
  actionLabel,
  onAction,
  type = 'error',
  icon,
}: ErrorBannerProps) {
  const colors = {
    error: 'border-red-500/30 bg-red-500/10 text-red-200',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    info: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  };

  const defaultIcons = {
    error: <XCircle className="h-5 w-5" />,
    warning: <AlertCircle className="h-5 w-5" />,
    info: <WifiOff className="h-5 w-5" />,
  };

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 ${colors[type]}`}>
      <div className="mt-0.5">{icon || defaultIcons[type]}</div>
      <div className="flex-1 space-y-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm opacity-90">{message}</p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 rounded bg-white/10 px-3 py-1.5 text-sm font-medium hover:bg-white/20"
        >
          <RefreshCw className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
