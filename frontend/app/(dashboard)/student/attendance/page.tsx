'use client';

export const dynamic = 'force-dynamic';

import RoleGuard from '@/components/auth/RoleGuard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { useQuery } from '@tanstack/react-query';
import nextDynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';

const AttendanceClient = nextDynamic(() => import('./AttendanceClient'), {
  loading: () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  ),
  ssr: false,
});

type AttendanceRecord = {
  id: number;
  date: string;
  subject: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  justified: boolean;
};

export default function AttendancePage() {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['student-attendance'],
    queryFn: async () => {
      return apiClient<AttendanceRecord[]>('/api/student/attendance?limit=200', {
        method: 'GET',
        useCache: false,
      });
    },
  });

  return (
    <RoleGuard allow={['student']}>
      <div className="mx-auto max-w-7xl p-6">
        <Breadcrumbs
          items={[
            { label: 'Mon espace étudiant', href: '/student' },
            { label: 'Historique de présence' },
          ]}
        />
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">
            Historique de présence
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
            Consultez vos enregistrements de présence
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <AttendanceClient records={records} />
        )}
      </div>
    </RoleGuard>
  );
}
