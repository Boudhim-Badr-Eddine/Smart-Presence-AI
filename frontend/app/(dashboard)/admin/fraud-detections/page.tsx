'use client';

export const dynamic = 'force-dynamic';

import RoleGuard from '@/components/auth/RoleGuard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import FraudDetectionPanel from '@/components/admin/FraudDetectionPanel';

export default function AdminFraudDetectionsPage() {
  return (
    <RoleGuard allow={['admin']}>
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <Breadcrumbs
          items={[{ label: 'Administration', href: '/admin' }, { label: 'Fraude (Smart Attendance)' }]}
        />
        <FraudDetectionPanel />
      </div>
    </RoleGuard>
  );
}
