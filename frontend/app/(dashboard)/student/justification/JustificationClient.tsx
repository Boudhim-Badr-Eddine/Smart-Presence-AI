'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Upload, X, CheckCircle } from 'lucide-react';
import { getApiBase } from '@/lib/config';

const apiBase = getApiBase();

type Absence = {
  id: number;
  date: string;
  subject: string;
  justified: boolean;
};

export default function JustificationClient() {
  const [selectedAbsence, setSelectedAbsence] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const { data: absences = [] } = useQuery({
    queryKey: ['student-absences'],
    queryFn: async () => {
      const res = await axios.get(`${apiBase}/api/student/absences`).catch(() => ({
        data: [
          { id: 1, date: '2025-01-11', subject: 'Database', justified: false },
          { id: 2, date: '2025-01-09', subject: 'Security', justified: false },
        ],
      }));
      return res.data as Absence[];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { absence_id: number; reason: string; file?: File }) => {
      const formData = new FormData();
      formData.append('absence_id', data.absence_id.toString());
      formData.append('reason', data.reason);
      if (data.file) formData.append('file', data.file);

      return axios.post(`${apiBase}/api/student/justifications`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-absences'] });
      setSelectedAbsence(null);
      setReason('');
      setFile(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAbsence || !reason.trim()) return;

    submitMutation.mutate({ absence_id: selectedAbsence, reason, file: file || undefined });
  };

  const unjustified = absences.filter((a) => !a.justified);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
        <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">
          Absences non justifiées
        </h2>
        {unjustified.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto text-emerald-400 mb-2" />
            <p className="text-zinc-400 dark:text-zinc-400 light:text-gray-600">
              Toutes vos absences sont justifiées
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {unjustified.map((absence) => (
              <button
                key={absence.id}
                onClick={() => setSelectedAbsence(absence.id)}
                className={`w-full text-left rounded-lg border p-4 transition ${
                  selectedAbsence === absence.id
                    ? 'border-blue-600 bg-blue-600/10'
                    : 'border-white/10 bg-white/2 hover:bg-white/5 dark:border-white/10 dark:bg-white/2 dark:hover:bg-white/5 light:border-gray-200 light:bg-gray-50 light:hover:bg-gray-100'
                }`}
              >
                <p className="font-medium text-white dark:text-white light:text-gray-900">
                  {absence.subject}
                </p>
                <p className="text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                  {absence.date}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedAbsence && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
          <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">
            Soumettre une justification
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 dark:text-zinc-300 light:text-gray-700 mb-2">
                Motif
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
                rows={4}
                placeholder="Expliquez le motif de votre absence..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 dark:text-zinc-300 light:text-gray-700 mb-2">
                Document justificatif (optionnel)
              </label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10 light:border-gray-300 light:bg-gray-50 light:text-gray-700 light:hover:bg-gray-100">
                  <Upload className="h-4 w-4" />
                  Choisir un fichier
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                {file && (
                  <div className="flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-400 light:text-gray-600">
                    <span>{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitMutation.isPending}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {submitMutation.isPending ? 'Envoi...' : 'Soumettre'}
            </button>

            {submitMutation.isSuccess && (
              <div className="rounded-lg bg-emerald-600/20 border border-emerald-600/30 p-3 text-emerald-300 text-sm">
                Justification soumise avec succès !
              </div>
            )}
            {submitMutation.isError && (
              <div className="rounded-lg bg-red-600/20 border border-red-600/30 p-3 text-red-300 text-sm">
                Erreur lors de la soumission
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
