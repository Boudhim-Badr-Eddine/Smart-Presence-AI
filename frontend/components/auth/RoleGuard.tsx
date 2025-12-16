'use client';

import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

type Props = {
  allow: Array<'admin' | 'trainer' | 'student'>;
  children: React.ReactNode;
};

export default function RoleGuard({ allow, children }: Props) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  if (!allow.includes(user.role)) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-xl font-semibold text-white">Accès non autorisé</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Vous n'avez pas les droits pour accéder à cette page.
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href="/"
              className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700"
            >
              Accueil
            </Link>
            <Link
              href={`/${user.role}`}
              className="rounded-lg bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-500"
            >
              Aller au tableau de bord
            </Link>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Route: {pathname}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
