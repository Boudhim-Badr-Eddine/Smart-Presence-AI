'use client';

export const dynamic = 'force-dynamic';

import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { useQuery } from '@tanstack/react-query';
import RoleGuard from '@/components/auth/RoleGuard';
import nextDynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';

const ScheduleClient = nextDynamic(() => import('./ScheduleClient'), {
  loading: () => (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  ),
  ssr: false,
});

type ScheduleSession = {
  id: number;
  subject: string;
  trainer: string;
  time_start: string;
  time_end: string;
  classroom: string;
  day: string;
  day_of_week: number;
};

type ScheduleData = {
  sessions: ScheduleSession[];
};

export default function StudentSchedulePage() {
  const { data: schedule, isLoading, isError } = useQuery({
    queryKey: ['student-schedule'],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const rows = await apiClient<
        Array<{
          id: number;
          subject: string;
          trainer?: string | null;
          classroom?: string | null;
          start_time: string;
          end_time: string;
          day: string;
          day_of_week?: number | null;
        }>
      >('/api/student/schedule', { method: 'GET', useCache: false });

      return {
        sessions: rows.map((s) => ({
          id: s.id,
          subject: s.subject,
          trainer: s.trainer || '—',
          time_start: s.start_time,
          time_end: s.end_time,
          classroom: s.classroom || '—',
          day: s.day,
          day_of_week: s.day_of_week || 0,
        })),
      } as ScheduleData;
    },
  });

  return (
    <RoleGuard allow={['student']}>
      <div className="mx-auto max-w-7xl p-6">
        <Breadcrumbs
          items={[{ label: 'Mon espace étudiant', href: '/student' }, { label: 'Emploi du temps' }]}
        />
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">
            Emploi du temps
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
            Consultez vos cours et horaires
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Impossible de charger votre emploi du temps. Vérifiez votre connexion et réessayez.
          </div>
        ) : (
          <ScheduleClient sessions={schedule?.sessions || []} />
        )}
      </div>
    </RoleGuard>
  );
}
