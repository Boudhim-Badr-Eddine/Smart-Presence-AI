'use client';

export const dynamic = 'force-dynamic';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import RoleGuard from '@/components/auth/RoleGuard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import LiveAttendanceMonitor from '@/components/dashboard/LiveAttendanceMonitor';

export default function TrainerSmartAttendancePage() {
  const searchParams = useSearchParams();

  const sessionId = useMemo(() => {
    const raw = searchParams.get('sessionId');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  }, [searchParams]);

  const mode = useMemo(() => {
    const m = searchParams.get('mode');
    if (m === 'teams_auto' || m === 'hybrid' || m === 'self_checkin') return m;
    return 'self_checkin' as const;
  }, [searchParams]);

  return (
    <RoleGuard allow={['trainer']}>
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <Breadcrumbs
          items={[{ label: 'Formateur', href: '/trainer' }, { label: 'Smart Attendance' }]}
        />

        {!sessionId ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            Ouvrez cette page avec un identifiant de session: <code>?sessionId=1</code>
          </div>
        ) : (
          <LiveAttendanceMonitor sessionId={sessionId} mode={mode} />
        )}
      </div>
    </RoleGuard>
  );
}
