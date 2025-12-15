'use client';

import React, { ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        this.props.fallback?.(this.state.error, this.resetError) || (
          <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
            <div className="bg-dark-card border border-dark-border rounded-lg shadow-lg max-w-md w-full p-6">
              <div className="flex items-center justify-center mb-4">
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-dark-text mb-2 text-center">
                Something went wrong
              </h2>
              <p className="text-dark-muted text-sm mb-4 text-center">
                {this.state.error.message || 'An unexpected error occurred'}
              </p>
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-dark-muted hover:text-dark-text mb-2">
                  Error details
                </summary>
                <pre className="bg-dark-bg p-3 rounded text-xs text-red-400 overflow-auto max-h-32">
                  {this.state.error.stack}
                </pre>
              </details>
              <button
                onClick={this.resetError}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
