'use client';

export const dynamic = 'force-dynamic';
import { motion } from 'framer-motion';
import { FileText, Send, CheckCircle, Clock, XCircle, Upload } from 'lucide-react';
import { useState } from 'react';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import RoleGuard from '@/components/auth/RoleGuard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { getApiBase } from '@/lib/config';

const apiBase = getApiBase();

type Justification = {
  id: number;
  absence_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  response_at?: string;
  admin_comment?: string;
};

type JustificationForm = {
  start_date: string;
  end_date: string;
  reason: string;
  document?: File;
};

export default function StudentJustificationPage() {
  const [form, setForm] = useState<JustificationForm>({
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: justifications } = useQuery({
    queryKey: ['student-justifications'],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/api/student/justifications`).catch(() => ({
        data: {
          items: [
            {
              id: 1,
              absence_date: '2025-01-10',
              reason: 'Maladie',
              status: 'approved',
              submitted_at: '2025-01-10',
              response_at: '2025-01-11',
              admin_comment: 'Justification valide',
            },
            {
              id: 2,
              absence_date: '2025-01-08',
              reason: 'Rendez-vous médical',
              status: 'pending',
              submitted_at: '2025-01-08',
            },
          ],
        },
      }));
      return res.data.items as Justification[];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: JustificationForm) => {
      return axios.post(`${apiBase}/api/student/justifications`, {
        start_date: data.start_date,
        end_date: data.end_date,
        reason: data.reason,
      });
    },
    onSuccess: () => {
      setForm({ start_date: '', end_date: '', reason: '' });
      queryClient.invalidateQueries({ queryKey: ['student-justifications'] });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await submitMutation.mutateAsync(form);
    setSubmitting(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-emerald-300" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-300" />;
      default:
        return <Clock className="h-5 w-5 text-amber-300" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approuvé';
      case 'rejected':
        return 'Rejeté';
      default:
        return 'En attente';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-600/20 text-emerald-300 border-emerald-600/20';
      case 'rejected':
        return 'bg-red-600/20 text-red-300 border-red-600/20';
      default:
        return 'bg-amber-600/20 text-amber-300 border-amber-600/20';
    }
  };

  return (
    <RoleGuard allow={['student']}>
      <div className="mx-auto max-w-7xl p-6">
        <Breadcrumbs
          items={[{ label: 'Espace Étudiant', href: '/student' }, { label: 'Justificatifs' }]}
        />

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white dark:text-white light:text-gray-900">
            Justifier une Absence
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
            Soumettez vos justificatifs d'absence pour validation
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Submission Form */}
          <div className="md:col-span-2">
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit}
              className="rounded-lg border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-white dark:text-white light:text-gray-900 mb-2">
                    Date de Début *
                  </label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-200 light:bg-gray-50 light:text-gray-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white dark:text-white light:text-gray-900 mb-2">
                    Date de Fin *
                  </label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-200 light:bg-gray-50 light:text-gray-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white dark:text-white light:text-gray-900 mb-2">
                  Motif de l'Absence *
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Décrivez le motif de votre absence (maladie, rendez-vous médical, situation familiale, etc.)..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-200 light:bg-gray-50 light:text-gray-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-32 resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Envoi...' : 'Soumettre le Justificatif'}
              </button>
            </motion.form>
          </div>

          {/* Statistics Card */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white h-fit">
            <h3 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">
              Statistiques
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                  Approuvés
                </span>
                <span className="text-2xl font-bold text-emerald-300">
                  {justifications?.filter((j) => j.status === 'approved').length ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                  En attente
                </span>
                <span className="text-2xl font-bold text-amber-300">
                  {justifications?.filter((j) => j.status === 'pending').length ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                  Rejetés
                </span>
                <span className="text-2xl font-bold text-red-300">
                  {justifications?.filter((j) => j.status === 'rejected').length ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Justifications History */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">
            Historique des Justificatifs
          </h2>
          <div className="space-y-3">
            {justifications && justifications.length > 0 ? (
              justifications.map((justification, idx) => (
                <motion.div
                  key={justification.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-lg border border-white/10 bg-white/5 p-4 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(justification.status)}
                        <span className="font-medium text-white dark:text-white light:text-gray-900">
                          {justification.reason}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                        {new Date(justification.absence_date).toLocaleDateString('fr-FR')}
                      </p>
                      {justification.admin_comment && (
                        <p className="text-xs text-zinc-300 dark:text-zinc-300 light:text-gray-700 mt-2 italic">
                          Commentaire: {justification.admin_comment}
                        </p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium border ${getStatusColor(justification.status)}`}
                    >
                      {getStatusLabel(justification.status)}
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-center">
                <FileText className="h-8 w-8 mx-auto text-zinc-400 mb-2" />
                <p className="text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                  Aucun justificatif soumis
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
