'use client';

import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  title?: string;
  description?: string;
}

const variantStyles = {
  default: {
    container: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-900 dark:text-blue-100',
    description: 'text-blue-700 dark:text-blue-300',
    Icon: Info,
  },
  destructive: {
    container: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900',
    icon: 'text-red-600 dark:text-red-400',
    title: 'text-red-900 dark:text-red-100',
    description: 'text-red-700 dark:text-red-300',
    Icon: XCircle,
  },
  success: {
    container: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-900',
    icon: 'text-green-600 dark:text-green-400',
    title: 'text-green-900 dark:text-green-100',
    description: 'text-green-700 dark:text-green-300',
    Icon: CheckCircle2,
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-900',
    icon: 'text-yellow-600 dark:text-yellow-400',
    title: 'text-yellow-900 dark:text-yellow-100',
    description: 'text-yellow-700 dark:text-yellow-300',
    Icon: AlertCircle,
  },
};

export function Alert({
  variant = 'default',
  title,
  description,
  className,
  children,
  ...props
}: AlertProps) {
  const styles = variantStyles[variant];
  const Icon = styles.Icon;

  return (
    <div
      role="alert"
      className={cn('relative w-full rounded-lg border p-4', styles.container, className)}
      {...props}
    >
      <div className="flex gap-3">
        <Icon className={cn('h-5 w-5 flex-shrink-0', styles.icon)} />
        <div className="flex-1 space-y-1">
          {title && (
            <h5 className={cn('font-medium leading-none tracking-tight', styles.title)}>{title}</h5>
          )}
          {description && <div className={cn('text-sm', styles.description)}>{description}</div>}
          {children && <div className={cn('text-sm', styles.description)}>{children}</div>}
        </div>
      </div>
    </div>
  );
}
