'use client';

export const dynamic = 'force-dynamic';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import RoleGuard from '@/components/auth/RoleGuard';
import dynamicImport from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const JustificationClient = dynamicImport(() => import('./JustificationClient'), {
  loading: () => (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  ),
  ssr: false,
});

export default function StudentJustificationPage() {
  return (
    <RoleGuard allow={['student']}>
      <div className="mx-auto max-w-7xl p-6">
        <Breadcrumbs
          items={[{ label: 'Espace Étudiant', href: '/student' }, { label: 'Justificatifs' }]}
        />

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">
            Justifier une Absence
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
            Soumettez vos justificatifs d'absence pour validation
          </p>
        </div>

        <JustificationClient />
      </div>
    </RoleGuard>
  );
}
