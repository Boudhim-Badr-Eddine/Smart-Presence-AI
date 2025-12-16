'use client';

import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

type AlertType = 'error' | 'success' | 'info' | 'warning';

interface AlertProps {
  type: AlertType;
  title: string;
  message: string;
  onDismiss?: () => void;
  dismissible?: boolean;
}

const iconMap = {
  error: XCircle,
  success: CheckCircle,
  info: Info,
  warning: AlertCircle,
};

const colorMap = {
  error: 'bg-red-50 text-red-700 border-red-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

const iconColorMap = {
  error: 'text-red-600',
  success: 'text-green-600',
  info: 'text-blue-600',
  warning: 'text-yellow-600',
};

export default function Alert({ type, title, message, onDismiss, dismissible = true }: AlertProps) {
  const Icon = iconMap[type];

  return (
    <div className={`border rounded-lg p-4 flex gap-4 ${colorMap[type]}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${iconColorMap[type]}`} />
      <div className="flex-1">
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-sm mt-1 opacity-90">{message}</p>
      </div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-current opacity-70 hover:opacity-100"
        >
          <XCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
