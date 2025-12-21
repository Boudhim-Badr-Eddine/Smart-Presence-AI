'use client';

export const dynamic = 'force-dynamic';

import RoleGuard from '@/components/auth/RoleGuard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import nextDynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const ProfileClient = nextDynamic(() => import('./ProfileClient'), {
  loading: () => (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  ),
  ssr: false,
});

export default function ProfilePage() {
  return (
    <RoleGuard allow={['student']}>
      <div className="mx-auto max-w-4xl p-6">
        <Breadcrumbs
          items={[{ label: 'Mon espace étudiant', href: '/student' }, { label: 'Mon profil' }]}
        />
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">
            Mon profil
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
            Mettez à jour vos informations et préférences
          </p>
        </div>

        <ProfileClient />
      </div>
    </RoleGuard>
  );
}
