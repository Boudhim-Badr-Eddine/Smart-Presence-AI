'use client';

import RoleGuard from '@/components/auth/RoleGuard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const NotificationsClient = dynamic(() => import('./NotificationsClient'), {
  loading: () => (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  ),
  ssr: false,
});

export default function NotificationsPage() {
  return (
    <RoleGuard allow={['student']}>
      <div className="mx-auto max-w-7xl p-6">
        <Breadcrumbs
          items={[{ label: 'Mon espace étudiant', href: '/student' }, { label: 'Notifications' }]}
        />
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">
            Notifications & alertes
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
            Consultez vos alertes et ajustez vos préférences
          </p>
        </div>

        <NotificationsClient />
      </div>
    </RoleGuard>
  );
}
