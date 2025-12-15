'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Home, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-red-500">500</h1>
          <div className="mt-4 text-2xl font-semibold text-white dark:text-white light:text-gray-900">
            Une erreur s'est produite
          </div>
          <p className="mt-2 text-zinc-400 dark:text-zinc-400 light:text-gray-600">
            Désolé, quelque chose s'est mal passé. Veuillez réessayer.
          </p>
          {error.digest && (
            <p className="mt-1 text-xs text-zinc-500">Digest: {error.digest}</p>
          )}
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:scale-105"
          >
            <RefreshCw className="h-5 w-5" />
            Réessayer
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-300 light:bg-white light:text-gray-900 light:hover:bg-gray-50"
          >
            <Home className="h-5 w-5" />
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
