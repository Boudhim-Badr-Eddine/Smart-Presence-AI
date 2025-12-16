'use client';
import RoleGuard from '@/components/auth/RoleGuard';
import nextDynamic from 'next/dynamic';
import { ColumnDef } from '@tanstack/react-table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useMemo, useState, useEffect } from 'react';
import { Edit2, Trash2, RefreshCw, Plus, Sparkles, Users as UsersIcon, Filter } from 'lucide-react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import ErrorBanner from '@/components/ui/ErrorBanner';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/skeleton';
import { getApiBase } from '@/lib/config';
import { getWebSocketManager } from '@/lib/websocket';
import OnboardingTour, { TourStep } from '@/components/OnboardingTour';
import AdvancedFilterDrawer, {
  FilterField,
  FilterValues,
} from '@/components/ui/AdvancedFilterDrawer';

const DataTable = nextDynamic(() => import('@/components/table/DataTable'), {
  ssr: false,
  loading: () => <TableSkeleton />,
});

const TrainerCreateEditModal = nextDynamic(
  () => import('@/components/modals/TrainerCreateEditModal'),
  {
    ssr: false,
  },
);

type Trainer = {
  id: number;
  name: string;
  email: string;
  subjects?: string;
};

export default function AdminTrainersPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({});
  const queryClient = useQueryClient();

  const apiBase = getApiBase();
  const authHeaders = useMemo(() => {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('spa_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const updateCachedLists = (updater: (items: Trainer[]) => Trainer[]) => {
    const queries = queryClient.getQueriesData<{ items: Trainer[]; total_pages: number }>({
      queryKey: ['admin-trainers'],
    });
    queries.forEach(([key, value]) => {
      if (!value) return;
      queryClient.setQueryData(key, {
        ...value,
        items: updater(value.items || []),
      });
    });
  };

  // WebSocket real-time updates
  useEffect(() => {
    const ws = getWebSocketManager();
    ws.connect();

    const unsubscribe = ws.subscribe('trainer_created', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainers'] });
    });

    const unsubscribeUpdate = ws.subscribe('trainer_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainers'] });
    });

    const unsubscribeDelete = ws.subscribe('trainer_deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainers'] });
    });

    return () => {
      unsubscribe();
      unsubscribeUpdate();
      unsubscribeDelete();
    };
  }, [queryClient]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-trainers', page, search, filters],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/api/admin/trainers`, {
        params: { page: page + 1, page_size: 10, search, ...filters },
        headers: authHeaders,
      });
      return res.data as { items: Trainer[]; total_pages: number };
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: (newTrainer: any) =>
      axios.post(`${apiBase}/api/admin/trainers`, newTrainer, { headers: authHeaders }),
    onMutate: async (newTrainer) => {
      await queryClient.cancelQueries({ queryKey: ['admin-trainers'] });
      updateCachedLists((items) => [
        {
          id: Date.now(),
          name: newTrainer.name,
          email: newTrainer.email,
          subjects: newTrainer.subjects,
        },
        ...items,
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainers'] });
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      axios.delete(`${apiBase}/api/admin/trainers/${id}`, { headers: authHeaders }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['admin-trainers'] });
      updateCachedLists((items) => items.filter((t) => t.id !== id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-trainers'] });
    },
  });

  const columns: ColumnDef<any>[] = [
    { header: 'Nom', accessorKey: 'name' },
    { header: 'Email', accessorKey: 'email' },
    { header: 'Matière', accessorKey: 'subjects' },
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

  const filterFields: FilterField[] = [
    { name: 'subject', label: 'Matière', type: 'text', placeholder: 'Ex: Mathématiques' },
    {
      name: 'status',
      label: 'Statut',
      type: 'select',
      options: [
        { id: 'active', label: 'Actif' },
        { id: 'inactive', label: 'Inactif' },
      ],
    },
  ];

  const tourSteps: TourStep[] = [
    {
      target: "[data-tour='create-trainer']",
      title: 'Créer un formateur',
      content: 'Cliquez ici pour ajouter un nouveau formateur à votre équipe pédagogique.',
      placement: 'bottom',
    },
    {
      target: "[data-tour='search']",
      title: 'Recherche rapide',
      content:
        'Utilisez la barre de recherche pour filtrer les formateurs par nom, email ou matière.',
      placement: 'bottom',
    },
    {
      target: "[data-tour='filters']",
      title: 'Filtres avancés',
      content:
        'Accédez aux filtres avancés pour des recherches plus précises et sauvegardez vos filtres favoris.',
      placement: 'left',
    },
  ];

  return (
    <RoleGuard allow={['admin']}>
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <OnboardingTour tourId="admin-trainers" steps={tourSteps} autoStart />

        <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Formateurs' }]} />

        <div className="relative overflow-hidden rounded-2xl border border-blue-500/15 bg-gradient-to-br from-blue-500/10 via-zinc-950 to-black p-6">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_30%,rgba(59,130,246,0.15),transparent_35%),radial-gradient(circle_at_85%_15%,rgba(14,165,233,0.1),transparent_30%)]" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-blue-200">
                <Sparkles className="h-4 w-4" /> Équipe pédagogique
              </p>
              <h1 className="text-3xl font-semibold text-white">Formateurs</h1>
              <p className="max-w-2xl text-sm text-white/70">
                Pilotez la disponibilité des formateurs, leurs matières et la capacité de sessions.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 shadow-lg">
              <UsersIcon className="h-5 w-5 text-blue-300" />
              <div>
                <p className="font-semibold text-white">{data?.items?.length ?? 0} formateurs</p>
                <p className="text-xs text-white/70">Page {page + 1}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              label: 'Formateurs actifs',
              value: data?.items?.length ?? 0,
              tone: 'text-blue-200',
              bg: 'bg-blue-500/15',
            },
            {
              label: 'Avec matière',
              value: data?.items?.filter((t) => t.subjects)?.length ?? 0,
              tone: 'text-emerald-200',
              bg: 'bg-emerald-500/15',
            },
            {
              label: 'Capacité page',
              value: `${data?.items?.length ?? 0}/10`,
              tone: 'text-amber-200',
              bg: 'bg-amber-500/15',
            },
          ].map((card) => (
            <div
              key={card.label}
              className={`rounded-xl border border-white/10 ${card.bg} px-4 py-3 shadow-sm`}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">{card.label}</p>
              <p className={`text-2xl font-semibold ${card.tone}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-sm">
          {error && (
            <ErrorBanner
              type="error"
              title="Erreur de chargement"
              message="Impossible de charger les formateurs. Vérifiez votre connexion."
              actionLabel="Réessayer"
              onAction={() => refetch()}
            />
          )}

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div
              data-tour="search"
              className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2"
            >
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Rechercher par nom, matière ou email"
                className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                data-tour="filters"
                onClick={() => setIsFilterOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/5"
              >
                <Filter className="h-4 w-4" /> Filtres
              </button>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/5"
              >
                <RefreshCw className="h-4 w-4" /> Rafraîchir
              </button>
              <button
                data-tour="create-trainer"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" /> Créer
              </button>
            </div>
          </div>
          {isLoading ? (
            <div className="overflow-hidden rounded-lg border border-white/10">
              <table className="w-full">
                <thead className="border-b border-white/10 bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-white/60">
                      Nom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-white/60">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-white/60">
                      Matière
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-white/60">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <TableSkeleton rows={5} cols={4} />
                </tbody>
              </table>
            </div>
          ) : data?.items && data.items.length > 0 ? (
            <DataTable
              data={data.items}
              columns={columns}
              pageCount={data.total_pages}
              onPageChange={setPage}
              statePageIndex={page}
              isLoading={false}
            />
          ) : (
            <EmptyState
              title="Aucun formateur"
              description="Commencez par créer un formateur pour gérer l'équipe pédagogique."
              actionLabel="Créer un formateur"
              onAction={() => setIsModalOpen(true)}
            />
          )}
        </div>

        <TrainerCreateEditModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />

        <AdvancedFilterDrawer
          fields={filterFields}
          values={filters}
          onChange={setFilters}
          onApply={() => setPage(0)}
          onReset={() => {
            setFilters({});
            setPage(0);
          }}
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
        />
      </div>
    </RoleGuard>
  );
}
