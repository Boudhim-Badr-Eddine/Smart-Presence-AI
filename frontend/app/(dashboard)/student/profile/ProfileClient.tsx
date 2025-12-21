'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { User, Mail, Phone, MapPin, Shield, Save, Lock, Globe, Palette } from 'lucide-react';
import { useUI } from '@/contexts/UIContext';
import AvatarUpload from '@/components/common/AvatarUpload';
import { apiClient } from '@/lib/api-client';

type Profile = {
  full_name: string;
  email: string;
  phone?: string;
  city?: string;
  track?: string;
  cohort?: string;
  language: 'fr' | 'en';
  theme: 'system' | 'light' | 'dark';
};

export default function ProfileClient() {
  const { dir, palette, locale, setDir, setPalette, setLocale } = useUI();

  const { data: profile } = useQuery({
    queryKey: ['student-profile'],
    queryFn: async () => {
      const data = await apiClient<{
        first_name: string;
        last_name: string;
        email: string;
        phone?: string;
        class_name?: string;
      }>('/api/student/profile', { method: 'GET', useCache: false });

      return {
        full_name: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim(),
        email: data.email,
        phone: data.phone,
        city: '',
        track: data.class_name || '',
        cohort: '',
        language: locale,
        theme: 'system',
      } as Profile;
    },
  });

  const [form, setForm] = useState<Profile | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Profile) => {
      return apiClient('/api/student/profile', {
        method: 'PUT',
        data: {
          full_name: data.full_name,
          email: data.email,
          phone: data.phone,
        },
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { current_password: string; new_password: string }) => {
      return apiClient('/api/student/profile/password', { method: 'POST', data });
    },
  });

  const handleAvatarUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    await apiClient('/api/student/profile/avatar', { method: 'POST', data: formData });
  };

  const handleSaveProfile = () => {
    if (!form) return;
    updateProfileMutation.mutate(form);
  };

  const handleSavePassword = () => {
    if (passwordForm.next !== passwordForm.confirm) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }
    updatePasswordMutation.mutate({
      current_password: passwordForm.current,
      new_password: passwordForm.next,
    });
    setPasswordForm({ current: '', next: '', confirm: '' });
  };

  if (!form) return <div>Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
        <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">
          Photo de profil
        </h2>
        <AvatarUpload onUpload={handleAvatarUpload} />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
        <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">
          Informations personnelles
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-300 dark:text-zinc-300 light:text-gray-700 mb-2">
              <User className="inline h-4 w-4 mr-1" />
              Nom complet
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              aria-label="Nom complet"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 dark:text-zinc-300 light:text-gray-700 mb-2">
              <Mail className="inline h-4 w-4 mr-1" />
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              aria-label="Email"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 dark:text-zinc-300 light:text-gray-700 mb-2">
              <Phone className="inline h-4 w-4 mr-1" />
              Téléphone
            </label>
            <input
              type="tel"
              value={form.phone || ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              aria-label="Téléphone"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 dark:text-zinc-300 light:text-gray-700 mb-2">
              <MapPin className="inline h-4 w-4 mr-1" />
              Ville
            </label>
            <input
              type="text"
              value={form.city || ''}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              aria-label="Ville"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 dark:text-zinc-300 light:text-gray-700 mb-2">
              Filière
            </label>
            <input
              type="text"
              value={form.track || ''}
              disabled
              aria-label="Filière"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-500 light:border-gray-300 light:bg-gray-100 light:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 dark:text-zinc-300 light:text-gray-700 mb-2">
              Promotion
            </label>
            <input
              type="text"
              value={form.cohort || ''}
              disabled
              aria-label="Promotion"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-zinc-500 light:border-gray-300 light:bg-gray-100 light:text-gray-500"
            />
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={updateProfileMutation.isPending}
          className="mt-4 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          <Save className="h-4 w-4" />
          {updateProfileMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>

        {updateProfileMutation.isSuccess && (
          <div className="mt-4 rounded-lg bg-emerald-600/20 border border-emerald-600/30 p-3 text-emerald-300 text-sm">
            Profil mis à jour avec succès !
          </div>
        )}
        {updateProfileMutation.isError && (
          <div className="mt-4 rounded-lg bg-red-600/20 border border-red-600/30 p-3 text-red-300 text-sm">
            Erreur lors de la mise à jour
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
        <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">
          Préférences
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-300 dark:text-zinc-300 light:text-gray-700 mb-2">
              <Globe className="inline h-4 w-4 mr-1" />
              Langue
            </label>
            <select
              value={locale}
              onChange={(e) => {
                const newLocale = e.target.value as 'fr' | 'en';
                setLocale(newLocale);
                setForm({ ...form, language: newLocale });
              }}
              aria-label="Langue"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 dark:text-zinc-300 light:text-gray-700 mb-2">
              Direction
            </label>
            <select
              value={dir}
              onChange={(e) => setDir(e.target.value as 'ltr' | 'rtl')}
              aria-label="Direction"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
            >
              <option value="ltr">LTR (Gauche à droite)</option>
              <option value="rtl">RTL (Droite à gauche)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 dark:text-zinc-300 light:text-gray-700 mb-2">
              <Palette className="inline h-4 w-4 mr-1" />
              Palette de couleurs
            </label>
            <select
              value={palette}
              onChange={(e) =>
                setPalette(e.target.value as 'blue' | 'emerald' | 'amber' | 'purple')
              }
              aria-label="Palette de couleurs"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
            >
              <option value="blue">Bleu</option>
              <option value="emerald">Émeraude</option>
              <option value="amber">Ambre</option>
              <option value="purple">Violet</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 dark:border-white/10 dark:bg-white/5 light:border-gray-200 light:bg-white">
        <h2 className="text-lg font-semibold text-white dark:text-white light:text-gray-900 mb-4">
          <Lock className="inline h-5 w-5 mr-1" />
          Changer le mot de passe
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 dark:text-zinc-300 light:text-gray-700 mb-2">
              Mot de passe actuel
            </label>
            <input
              type="password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
              aria-label="Mot de passe actuel"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 dark:text-zinc-300 light:text-gray-700 mb-2">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={passwordForm.next}
              onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
              aria-label="Nouveau mot de passe"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 dark:text-zinc-300 light:text-gray-700 mb-2">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
              aria-label="Confirmer le mot de passe"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white dark:border-white/10 dark:bg-white/5 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900"
            />
          </div>

          <button
            onClick={handleSavePassword}
            disabled={updatePasswordMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-white font-medium hover:bg-amber-700 disabled:opacity-50 transition"
          >
            <Shield className="h-4 w-4" />
            {updatePasswordMutation.isPending ? 'Mise à jour...' : 'Mettre à jour'}
          </button>

          {updatePasswordMutation.isSuccess && (
            <div className="rounded-lg bg-emerald-600/20 border border-emerald-600/30 p-3 text-emerald-300 text-sm">
              Mot de passe mis à jour avec succès !
            </div>
          )}
          {updatePasswordMutation.isError && (
            <div className="rounded-lg bg-red-600/20 border border-red-600/30 p-3 text-red-300 text-sm">
              Erreur lors de la mise à jour du mot de passe
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
