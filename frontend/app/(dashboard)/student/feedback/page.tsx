'use client';

export const dynamic = 'force-dynamic';

import RoleGuard from '@/components/auth/RoleGuard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { MessageSquare } from 'lucide-react';
import dynamicImport from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const FeedbackClient = dynamicImport(() => import('./FeedbackClient'), {
  loading: () => (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  ),
  ssr: false,
});

export default function StudentFeedbackPage() {
  return (
    <RoleGuard allow={['student']}>
      <div className="mx-auto max-w-7xl p-6">
        <Breadcrumbs
          items={[{ label: 'Espace Étudiant', href: '/student' }, { label: 'Feedback' }]}
        />

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">
              Retour sur la formation
            </h1>
            <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
              Exprimez vos retours pour améliorer l'expérience.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white light:text-gray-700">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-amber-300" />
              Vos retours sont anonymes par défaut.
            </div>
          </div>
        </div>

        <FeedbackClient />
      </div>
    </RoleGuard>
  );
}
