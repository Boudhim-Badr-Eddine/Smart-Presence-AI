'use client';

import Modal from '@/components/ui/Modal';
import InputField from '@/components/form/InputField';
import SelectField from '@/components/form/SelectField';
import { FormProvider, useForm } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { getApiBase } from '@/lib/config';

type Option = { value: string; label: string };

type SessionFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
  isLoading?: boolean;
};

export default function SessionCreateEditModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading,
}: SessionFormProps) {
  const methods = useForm({
    defaultValues:
      initialData ??
      ({
        title: '',
        date: '',
        startTime: '',
        endTime: '',
        className: '',
        trainerId: '',
        moduleId: '1',
        classroomId: '1',
        sessionType: 'theory',
        notes: '',
      } as any),
  });

  const apiBase = getApiBase();
  const [trainerOptions, setTrainerOptions] = useState<Option[]>([]);
  const [classOptions, setClassOptions] = useState<Option[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const authHeaders = useMemo(() => {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('spa_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const load = async () => {
      setLoadingOptions(true);
      setLoadError(null);
      try {
        const [classesRes, trainersRes] = await Promise.all([
          axios.get(`${apiBase}/api/admin/classes`, { headers: authHeaders }),
          axios.get(`${apiBase}/api/admin/trainers?page=1&page_size=100`, { headers: authHeaders }),
        ]);

        if (cancelled) return;

        const classes: string[] = classesRes?.data?.classes ?? [];
        setClassOptions(classes.map((c) => ({ value: c, label: c })));

        const trainers: any[] = trainersRes?.data?.items ?? [];
        setTrainerOptions(
          trainers.map((t) => ({ value: String(t.id), label: t.name || t.email || `#${t.id}` })),
        );
      } catch (e: any) {
        if (cancelled) return;
        setLoadError(
          e?.response?.data?.detail || e?.message || "Impossible de charger les classes/formateurs",
        );
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [apiBase, authHeaders, isOpen]);

  const date = methods.watch('date');
  const startTime = methods.watch('startTime');
  const endTime = methods.watch('endTime');
  const className = methods.watch('className');
  const trainerId = methods.watch('trainerId');

  const durationLabel = useMemo(() => {
    if (!date || !startTime || !endTime) return null;
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    let ms = end.getTime() - start.getTime();
    if (ms < 0) ms += 24 * 60 * 60 * 1000;
    const minutes = Math.round(ms / 60000);
    if (!Number.isFinite(minutes) || minutes <= 0) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
  }, [date, startTime, endTime]);

  const handleSubmit = methods.handleSubmit((data) => {
    const trainerName = trainerOptions.find((t) => t.value === String(data.trainerId))?.label;
    const payload = {
      title: data.title,
      className: data.className,
      trainerId: data.trainerId,
      trainer_name: trainerName,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      moduleId: data.moduleId,
      classroomId: data.classroomId,
      sessionType: data.sessionType,
      notes: data.notes,
    };
    onSubmit(payload);
    methods.reset();
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Modifier session' : 'Créer une session'}
    >
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {loadError ? (
            <div className="rounded-lg border border-red-500/20 bg-red-950/20 px-3 py-2 text-sm text-red-200">
              {loadError}
            </div>
          ) : null}
          <InputField
            label="Titre de la session"
            name="title"
            required
            placeholder="Introduction à HTML/CSS"
          />
          <InputField label="Date" name="date" type="date" required />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Heure de début" name="startTime" type="time" required />
            <InputField label="Heure de fin" name="endTime" type="time" required />
          </div>
          {durationLabel ? <p className="text-xs text-zinc-400">Durée: {durationLabel}</p> : null}
          <SelectField
            label="Classe"
            name="className"
            options={loadingOptions && classOptions.length === 0 ? [{ value: '', label: 'Chargement…' }] : classOptions}
            required
          />
          <SelectField
            label="Formateur"
            name="trainerId"
            options={
              loadingOptions && trainerOptions.length === 0
                ? [{ value: '', label: 'Chargement…' }]
                : trainerOptions
            }
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Module (ID)" name="moduleId" type="number" required />
            <InputField label="Salle (ID)" name="classroomId" type="number" required />
          </div>
          <SelectField
            label="Type"
            name="sessionType"
            options={[
              { value: 'theory', label: 'Théorie' },
              { value: 'lab', label: 'Atelier' },
              { value: 'exam', label: 'Examen' },
            ]}
            required
          />
          <InputField label="Notes (optionnel)" name="notes" placeholder="Objectifs, matériel requis…" />
          <div className="rounded-lg border border-white/10 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-400">
            <div>
              <span className="text-zinc-300">Résumé:</span>{' '}
              {className || '—'} ·{' '}
              {trainerOptions.find((t) => t.value === String(trainerId))?.label || '—'}
              {date ? ` · ${date}` : ''}
              {startTime && endTime ? ` · ${startTime}-${endTime}` : ''}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {isLoading ? 'Traitement...' : 'Enregistrer'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Annuler
            </button>
          </div>
        </form>
      </FormProvider>
    </Modal>
  );
}
