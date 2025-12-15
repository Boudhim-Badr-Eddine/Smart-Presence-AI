'use client';

import { Loader } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12'
};

export default function LoadingSpinner({ message = 'Loading...', size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <Loader className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      {message && <p className="text-gray-600 text-sm font-medium">{message}</p>}
    </div>
  );
}
