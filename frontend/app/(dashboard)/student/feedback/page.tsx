'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import RoleGuard from '@/components/auth/RoleGuard';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Tag,
  ChevronRight,
} from 'lucide-react';
import { getApiBase } from '@/lib/config';

type FeedbackItem = {
  id: number;
  title: string;
  category: 'contenu' | 'rythme' | 'logistique' | 'autre';
  sentiment: 'positif' | 'neutre' | 'negatif';
  status: 'ouvert' | 'en_cours' | 'resolu';
  submitted_at: string;
  trainer_name?: string;
  response?: string;
};

type FeedbackForm = {
  title: string;
  category: FeedbackItem['category'];
  sentiment: FeedbackItem['sentiment'];
  message: string;
};

export default function StudentFeedbackPage() {
  const apiBase = getApiBase();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FeedbackForm>({
    title: '',
    category: 'contenu',
    sentiment: 'positif',
    message: '',
  });

  const { data: feedback } = useQuery({
    queryKey: ['student-feedback'],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/api/student/feedback`).catch(() => ({
        data: {
          items: [
            {
              id: 1,
              title: 'Rythme du module React',
              category: 'rythme',
              sentiment: 'negatif',
              status: 'en_cours',
              submitted_at: '2025-01-12',
              trainer_name: 'M. Alaoui',
              response: 'Nous allons ajouter une session de révision vendredi.',
            },
            {
              id: 2,
              title: 'Qualité des supports',
              category: 'contenu',
              sentiment: 'positif',
              status: 'resolu',
              submitted_at: '2025-01-09',
              trainer_name: 'Mme Bennani',
              response: 'Les slides ont été mises à jour et partagées sur Teams.',
            },
            {
              id: 3,
              title: 'Changement de salle récurrent',
              category: 'logistique',
              sentiment: 'neutre',
              status: 'ouvert',
              submitted_at: '2025-01-13',
              trainer_name: 'Administration',
            },
          ],
        },
      }));
      return res.data.items as FeedbackItem[];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (payload: FeedbackForm) => {
      return axios.post(`${apiBase}/api/student/feedback`, payload);
    },
    onSuccess: () => {
      setForm({ title: '', category: 'contenu', sentiment: 'positif', message: '' });
      queryClient.invalidateQueries({ queryKey: ['student-feedback'] });
    },
  });

  const stats = useMemo(() => {
    const base = { ouvert: 0, en_cours: 0, resolu: 0 };
    feedback?.forEach((f) => {
      base[f.status] += 1;
    });
    return base;
  }, [feedback]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitMutation.mutateAsync(form);
  };

  const badgeStyles: Record<FeedbackItem['status'], string> = {
    ouvert: 'bg-amber-600/20 text-amber-200 border-amber-500/30',
    en_cours: 'bg-blue-600/20 text-blue-200 border-blue-500/30',
    resolu: 'bg-emerald-600/20 text-emerald-200 border-emerald-500/30',
  };

  const sentimentIcon = (sentiment: FeedbackItem['sentiment']) => {
    if (sentiment === 'positif') return <ThumbsUp className="h-4 w-4 text-emerald-300" />;
    if (sentiment === 'negatif') return <ThumbsDown className="h-4 w-4 text-red-300" />;
    return <MessageSquare className="h-4 w-4 text-zinc-300" />;
  };

  return (
    <RoleGuard allow={['student']}>
      <div className="mx-auto max-w-7xl p-6">
        <Breadcrumbs
          items={[{ label: 'Espace Étudiant', href: '/student' }, { label: 'Feedback' }]}
        />

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">
              Retour sur la formation
            </h1>
            <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
              Exprimez vos retours pour améliorer l'expérience.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white light:text-gray-700">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-amber-300" />
              Vos retours sont anonymes par défaut.
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {[
            { label: 'Nouveaux', value: stats.ouvert, color: 'bg-amber-600/20 text-amber-200' },
            { label: 'En cours', value: stats.en_cours, color: 'bg-blue-600/20 text-blue-200' },
            { label: 'Résolus', value: stats.resolu, color: 'bg-emerald-600/20 text-emerald-200' },
          ].map((card) => (
            <div
              key={card.label}
              className={`rounded-lg border border-white/10 p-4 ${card.color} dark:border-white/10 light:border-gray-200 light:bg-gray-50`}
            >
              <p className="text-xs uppercase tracking-wide opacity-70">{card.label}</p>
              <p className="text-2xl font-bold mt-1">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="lg:col-span-1 space-y-4 rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900">
                  Partager un retour
                </h2>
                <p className="text-xs text-zinc-400">Traitement sous 48h maximum.</p>
              </div>
              <AlertCircle className="h-5 w-5 text-amber-300" />
            </div>

            <label className="space-y-2 text-sm font-medium text-white dark:text-white light:text-gray-900 block">
              Sujet
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="Ex: Rythme du cours de React"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-200 light:bg-gray-50 light:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-white dark:text-white light:text-gray-900 block">
                Catégorie
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value as FeedbackItem['category'] })
                  }
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-200 light:bg-gray-50 light:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="contenu">Contenu</option>
                  <option value="rythme">Rythme</option>
                  <option value="logistique">Logistique</option>
                  <option value="autre">Autre</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-white dark:text-white light:text-gray-900 block">
                Ressenti
                <select
                  value={form.sentiment}
                  onChange={(e) =>
                    setForm({ ...form, sentiment: e.target.value as FeedbackItem['sentiment'] })
                  }
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-200 light:bg-gray-50 light:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="positif">Positif</option>
                  <option value="neutre">Neutre</option>
                  <option value="negatif">Négatif</option>
                </select>
              </label>
            </div>

            <label className="space-y-2 text-sm font-medium text-white dark:text-white light:text-gray-900 block">
              Détail du feedback
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                required
                placeholder="Expliquez votre retour ou proposez une amélioration concrète."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-200 light:bg-gray-50 light:text-gray-900 min-h-32 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </label>

            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <Send className="h-4 w-4" />
              {submitMutation.isPending ? 'Envoi...' : 'Envoyer le feedback'}
            </button>
          </motion.form>

          {/* Timeline */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900">
                  Suivi des retours
                </h2>
                <p className="text-xs text-zinc-400">
                  Historique des échanges avec l'équipe pédagogique.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Clock className="h-4 w-4" />
                Mis à jour en temps réel
              </div>
            </div>

            <div className="space-y-3">
              {feedback?.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-xl border border-white/10 bg-white/5 p-5 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-1">{sentimentIcon(item.sentiment)}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-white dark:text-white light:text-gray-900">
                            {item.title}
                          </h3>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs ${badgeStyles[item.status]}`}
                          >
                            {item.status === 'ouvert' && 'Nouveau'}
                            {item.status === 'en_cours' && 'En cours'}
                            {item.status === 'resolu' && 'Résolu'}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-zinc-400">
                            <Tag className="h-3 w-3" />
                            {item.category}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-300 dark:text-zinc-300 light:text-gray-700 mt-1">
                          {item.response ?? 'Feedback reçu, en attente de réponse.'}
                        </p>
                        <div className="text-xs text-zinc-400 mt-2 flex items-center gap-2 flex-wrap">
                          <span>{new Date(item.submitted_at).toLocaleDateString('fr-FR')}</span>
                          {item.trainer_name && (
                            <span className="flex items-center gap-1">
                              <ChevronRight className="h-3 w-3" /> {item.trainer_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {item.status === 'resolu' && (
                      <CheckCircle className="h-5 w-5 text-emerald-300 flex-shrink-0" />
                    )}
                  </div>
                </motion.div>
              ))}

              {!feedback?.length && (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-400">
                  <MessageSquare className="h-8 w-8 mx-auto mb-3 text-amber-300" />
                  Aucun feedback soumis pour le moment.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
