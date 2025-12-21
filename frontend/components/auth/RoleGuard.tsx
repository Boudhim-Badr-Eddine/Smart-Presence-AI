'use client';

import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

type Props = {
  allow: Array<'admin' | 'trainer' | 'student'>;
  children: React.ReactNode;
};

export default function RoleGuard({ allow, children }: Props) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/auth/login');
      return;
    }

    if (!allow.includes(user.role)) {
      // Always send the user to their own dashboard.
      router.replace(`/${user.role}`);
    }
  }, [allow, isLoading, router, user]);

  if (isLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  if (!allow.includes(user.role)) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-xl font-semibold text-white">Redirection…</h1>
          <p className="mt-2 text-sm text-zinc-400">Vous êtes connecté comme {user.role}.</p>
          <p className="mt-2 text-xs text-zinc-500">Route: {pathname}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
