'use client';

import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import RoleGuard from '@/components/auth/RoleGuard';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiBase } from '@/lib/config';

const ScheduleClient = dynamic(() => import('./ScheduleClient'), {
  loading: () => (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  ),
  ssr: false,
});

const apiBase = getApiBase();

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
  const { data: schedule, isLoading } = useQuery({
    queryKey: ['student-schedule'],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/api/student/schedule`).catch(() => ({
        data: {
          sessions: [
            {
              id: 1,
              subject: 'Développement Web',
              trainer: 'Mr. Ahmed',
              time_start: '09:00',
              time_end: '12:00',
              classroom: 'A101',
              day: 'Lundi',
              day_of_week: 1,
            },
            {
              id: 2,
              subject: 'Base de Données',
              trainer: 'Mme. Fatima',
              time_start: '14:00',
              time_end: '17:00',
              classroom: 'B203',
              day: 'Mardi',
              day_of_week: 2,
            },
            {
              id: 3,
              subject: 'Réseau & Sécurité',
              trainer: 'Mr. Youssef',
              time_start: '09:00',
              time_end: '12:00',
              classroom: 'C305',
              day: 'Mercredi',
              day_of_week: 3,
            },
            {
              id: 4,
              subject: 'Développement Web',
              trainer: 'Mr. Ahmed',
              time_start: '14:00',
              time_end: '17:00',
              classroom: 'A102',
              day: 'Jeudi',
              day_of_week: 4,
            },
            {
              id: 5,
              subject: 'Base de Données',
              trainer: 'Mme. Fatima',
              time_start: '10:00',
              time_end: '13:00',
              classroom: 'B204',
              day: 'Vendredi',
              day_of_week: 5,
            },
          ],
        },
      }));
      return res.data as ScheduleData;
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
        ) : (
          <ScheduleClient sessions={schedule?.sessions || []} />
        )}
      </div>
    </RoleGuard>
  );
}
