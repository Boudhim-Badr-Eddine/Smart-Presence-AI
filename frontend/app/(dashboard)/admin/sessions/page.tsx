'use client';
import RoleGuard from '@/components/auth/RoleGuard';
import nextDynamic from 'next/dynamic';
import { ColumnDef } from '@tanstack/react-table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { Edit2, Trash2, Download } from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { TableSkeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/lib/api-client';
import { getApiBase } from '@/lib/config';
import { getWebSocketManager } from '@/lib/websocket';
import AdvancedFilters from '@/components/ui/AdvancedFilters';
import { exportCSV, exportExcelLike } from '@/lib/export';
import { useSearchParams, useRouter } from 'next/navigation';
import OnboardingTour from '@/components/OnboardingTour';

const DataTable = nextDynamic(() => import('@/components/table/DataTable'), {
  ssr: false,
  loading: () => (
    <div className="py-6">
      <TableSkeleton />
    </div>
  ),
});

const SessionCreateEditModal = nextDynamic(
  () => import('@/components/modals/SessionCreateEditModal'),
  {
    ssr: false,
  },
);

type Session = {
  id: number;
  title: string;
  date: string;
  time: string;
  class_name: string;
  trainer_name: string;
};

export default function AdminSessionsPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const apiBase = getApiBase();
  const authHeaders = useMemo(() => {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('spa_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const updateCachedLists = (updater: (items: Session[]) => Session[]) => {
    const queries = queryClient.getQueriesData<{ items: Session[]; total_pages: number }>({
      queryKey: ['admin-sessions'],
    });
    queries.forEach(([key, value]) => {
      if (!value) return;
      queryClient.setQueryData(key, {
        ...value,
        items: updater(value.items || []),
      });
    });
  };

  const sessionsQuery = useApiQuery<{ items: Session[]; total_pages: number }>(
    ['admin-sessions', String(page), search, JSON.stringify(dateRange)],
    `/api/admin/sessions?page=${page + 1}&page_size=10&search=${encodeURIComponent(search)}${dateRange.from ? `&from=${encodeURIComponent(dateRange.from)}` : ''}${dateRange.to ? `&to=${encodeURIComponent(dateRange.to)}` : ''}`,
    { method: 'GET', headers: authHeaders },
  );

  const { data, isLoading } = sessionsQuery as any;

  // Hydrate filters from URL on mount
  useEffect(() => {
    const urlPage = Number(searchParams.get('page') || 1) - 1;
    const urlSearch = searchParams.get('q') || '';
    const urlFrom = searchParams.get('from') || undefined;
    const urlTo = searchParams.get('to') || undefined;
    if (!Number.isNaN(urlPage)) setPage(urlPage);
    setSearch(urlSearch);
    setDateRange({ from: urlFrom, to: urlTo });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 0) params.set('page', String(page + 1));
    if (search) params.set('q', search);
    if (dateRange.from) params.set('from', dateRange.from);
    if (dateRange.to) params.set('to', dateRange.to);
    const qs = params.toString();
    router.replace(`/admin/sessions${qs ? `?${qs}` : ''}`);
  }, [page, search, dateRange, router]);

  const createMutation = useMutation({
    mutationFn: (newSession: any) =>
      axios.post(`${apiBase}/api/admin/sessions`, newSession, { headers: authHeaders }),
    onMutate: async (newSession) => {
      await queryClient.cancelQueries({ queryKey: ['admin-sessions'] });
      updateCachedLists((items) => [
        {
          id: Date.now(),
          title: newSession.title,
          date: newSession.date,
          time: newSession.time,
          class_name: newSession.class_name,
          trainer_name: newSession.trainer_name,
        },
        ...items,
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      axios.delete(`${apiBase}/api/admin/sessions/${id}`, { headers: authHeaders }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['admin-sessions'] });
      updateCachedLists((items) => items.filter((s) => s.id !== id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
    },
  });

  // WebSocket real-time updates
  useEffect(() => {
    const ws = getWebSocketManager();
    ws.connect();
    const unsubCreate = ws.subscribe('session_created', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
    });
    const unsubUpdate = ws.subscribe('session_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
    });
    const unsubDelete = ws.subscribe('session_deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
    });
    return () => {
      unsubCreate();
      unsubUpdate();
      unsubDelete();
    };
  }, [queryClient]);

  const handleExport = () => {
    const rows = [
      ['Titre', 'Date', 'Heure', 'Classe', 'Formateur'],
      ...(data?.items.map((s: Session) => [
        s.title,
        s.date,
        s.time,
        s.class_name,
        s.trainer_name,
      ]) ?? []),
    ];
    exportCSV(rows, 'sessions');
    exportExcelLike(rows, 'sessions');
  };

  const columns: ColumnDef<any>[] = [
    { header: 'Titre', accessorKey: 'title' },
    { header: 'Date', accessorKey: 'date' },
    { header: 'Heure', accessorKey: 'time' },
    { header: 'Classe', accessorKey: 'class_name' },
    { header: 'Formateur', accessorKey: 'trainer_name' },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <button
            className="rounded p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            aria-label="Modifier"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => deleteMutation.mutate(row.original.id)}
            className="rounded p-1 hover:bg-red-900/30 text-zinc-400 hover:text-red-400"
            aria-label="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <RoleGuard allow={['admin']}>
      <div className="mx-auto max-w-7xl p-6">
        <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Sessions' }]} />
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">Sessions</h1>
          <p className="text-sm text-zinc-400">
            Planification et gestion des sessions: calendrier, affectations, présences.
          </p>
        </div>
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Rechercher par titre ou classe"
              className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <input
              type="date"
              value={dateRange.from ?? ''}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <input
              type="date"
              value={dateRange.to ?? ''}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <AdvancedFilters
              filters={[
                { name: 'class_name', type: 'text', label: 'Classe' },
                { name: 'trainer_name', type: 'text', label: 'Formateur' },
                {
                  name: 'status',
                  type: 'select',
                  label: 'Statut',
                  options: [
                    { id: 'scheduled', label: 'Planifiée' },
                    { id: 'completed', label: 'Terminée' },
                    { id: 'cancelled', label: 'Annulée' },
                  ],
                },
                {
                  name: 'session_type',
                  type: 'multiselect',
                  label: 'Type',
                  options: [
                    { id: 'theory', label: 'Théorie' },
                    { id: 'lab', label: 'Atelier' },
                    { id: 'exam', label: 'Examen' },
                  ],
                },
              ]}
              onApply={(f) => {
                setSearch(f.search ?? search);
                setDateRange({ from: f.from ?? dateRange.from, to: f.to ?? dateRange.to });
                setPage(0);
              }}
              onReset={() => {
                setSearch('');
                setDateRange({});
                setPage(0);
              }}
              presetKey="admin-sessions"
              data-tour-id="sessions-filters"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              Créer
            </button>
            <button
              onClick={handleExport}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
        <DataTable
          data={data?.items ?? []}
          columns={columns}
          pageCount={data?.total_pages}
          onPageChange={setPage}
          statePageIndex={page}
          isLoading={isLoading}
        />
        {/* Onboarding tour */}
        <OnboardingTour
          tourId="sessions"
          steps={[
            {
              target: "[data-tour-id='sessions-filters']",
              title: 'Filtres avancés',
              content: 'Filtrez par classe et formateur pour retrouver vos sessions.',
              placement: 'bottom',
            },
            {
              target: 'button:has(svg.lucide-download)',
              title: 'Export CSV',
              content: 'Téléchargez la liste des sessions en un clic.',
              placement: 'right',
            },
            {
              target: 'button:has(svg.lucide-edit-2)',
              title: 'Actions rapides',
              content: 'Modifiez ou supprimez les sessions depuis le tableau.',
              placement: 'right',
            },
          ]}
          autoStart
        />
        <SessionCreateEditModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      </div>
    </RoleGuard>
  );
}
