'use client';
export const dynamic = 'force-dynamic';

import RoleGuard from '@/components/auth/RoleGuard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import {
  Bell,
  Check,
  Trash2,
  AlertCircle,
  Info,
  CheckCircle,
  BookOpen,
  Calendar,
  MessageCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getApiBase } from '@/lib/config';

type Notification = {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
};

export default function TrainerNotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const queryClient = useQueryClient();
  const apiBase = getApiBase();
  const { data, isLoading } = useQuery({
    queryKey: ['trainer-notifications', filter],
    queryFn: async () => {
      const res = await axios
        .get(`${apiBase}/api/trainer/notifications`, {
          params: { unread_only: filter === 'unread' },
        })
        .catch(() => ({
          data: {
            items: [
              {
                id: 1,
                title: 'Justification en attente',
                message: 'Sara Bennani a soumis une justification pour Dev Web',
                type: 'warning',
                read: false,
                created_at: new Date().toISOString(),
              },
              {
                id: 2,
                title: 'Nouveau message étudiant',
                message: 'Karim El Khabazi a ajouté un commentaire sur la séance du 15/12',
                type: 'info',
                read: false,
                created_at: new Date().toISOString(),
              },
              {
                id: 3,
                title: 'Session modifiée',
                message: 'La session Base de Données est décalée à 14h00',
                type: 'success',
                read: true,
                created_at: new Date().toISOString(),
              },
            ],
          },
        }));
      return res.data as { items: Notification[] };
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) =>
      axios.patch(`${apiBase}/api/trainer/notifications/${id}`, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trainer-notifications'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => axios.delete(`${apiBase}/api/trainer/notifications/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trainer-notifications'] }),
  });

  const bulkMarkRead = async () => {
    const unreadIds = data?.items.filter((n) => !n.read).map((n) => n.id) ?? [];
    await Promise.all(unreadIds.map((id) => markReadMutation.mutateAsync(id)));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-emerald-300" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-300" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-300" />;
      default:
        return <Info className="h-5 w-5 text-blue-300" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-700/20 text-emerald-300 border-emerald-600/20';
      case 'warning':
        return 'bg-amber-700/20 text-amber-300 border-amber-600/20';
      case 'error':
        return 'bg-red-700/20 text-red-300 border-red-600/20';
      default:
        return 'bg-blue-700/20 text-blue-300 border-blue-600/20';
    }
  };

  return (
    <RoleGuard allow={['trainer']}>
      <div className="mx-auto max-w-5xl p-6">
        <Breadcrumbs
          items={[
            { label: 'Tableau de bord formateur', href: '/trainer' },
            { label: 'Notifications' },
          ]}
        />

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">
              Notifications
            </h1>
            <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
              Suivez les alertes liées à vos sessions et étudiants
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={bulkMarkRead}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition"
            >
              Marquer tout comme lu
            </button>
          </div>
        </div>

        <div className="mb-4 flex gap-2">
          {['all', 'unread'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as 'all' | 'unread')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              {f === 'all' ? 'Tous' : 'Non lus'}
            </button>
          ))}
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
            <Bell className="h-5 w-5 text-blue-300" />
            <div>
              <p className="text-sm text-zinc-300 dark:text-zinc-300 light:text-gray-700">Total</p>
              <p className="text-xl font-semibold text-white dark:text-white light:text-gray-900">
                {data?.items.length ?? 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
            <BookOpen className="h-5 w-5 text-amber-300" />
            <div>
              <p className="text-sm text-zinc-300 dark:text-zinc-300 light:text-gray-700">
                Justifications
              </p>
              <p className="text-xl font-semibold text-white dark:text-white light:text-gray-900">
                {data?.items.filter((n) => n.title.toLowerCase().includes('justification'))
                  .length ?? 0}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
            <MessageCircle className="h-5 w-5 text-emerald-300" />
            <div>
              <p className="text-sm text-zinc-300 dark:text-zinc-300 light:text-gray-700">
                Messages étudiants
              </p>
              <p className="text-xl font-semibold text-white dark:text-white light:text-gray-900">
                {data?.items.filter((n) => n.title.toLowerCase().includes('message')).length ?? 0}
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-zinc-400">Chargement...</div>
        ) : data?.items && data.items.length > 0 ? (
          <div className="space-y-3">
            {data.items.map((notification, idx) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`rounded-lg border p-4 transition ${
                  notification.read
                    ? 'border-white/10 bg-white/5 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-gray-50'
                    : `${getTypeColor(notification.type)}`
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">{getTypeIcon(notification.type)}</div>
                  <div className="flex-1">
                    <h3 className="font-medium text-white dark:text-white light:text-gray-900">
                      {notification.title}
                    </h3>
                    <p className="text-sm text-zinc-300 dark:text-zinc-300 light:text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400 dark:text-zinc-400 light:text-gray-500">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(notification.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      {notification.read ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/20 px-3 py-1 text-emerald-200">
                          Lu
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-600/20 px-3 py-1 text-blue-200">
                          Non lu
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!notification.read && (
                      <button
                        onClick={() => markReadMutation.mutate(notification.id)}
                        className="rounded p-2 hover:bg-white/10 transition"
                        title="Marquer comme lu"
                      >
                        <Check className="h-4 w-4 text-zinc-400 hover:text-white" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(notification.id)}
                      className="rounded p-2 hover:bg-red-500/10 transition"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
            <Bell className="h-8 w-8 mx-auto text-zinc-400 mb-2" />
            <p className="text-zinc-400">Aucune notification</p>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
