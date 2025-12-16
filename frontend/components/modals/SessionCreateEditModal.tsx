'use client';

import Modal from '@/components/ui/Modal';
import InputField from '@/components/form/InputField';
import SelectField from '@/components/form/SelectField';
import { FormProvider, useForm } from 'react-hook-form';

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
    defaultValues: initialData ?? { title: '', date: '', time: '', class_name: '', trainer_id: '' },
  });

  const handleSubmit = methods.handleSubmit((data) => {
    onSubmit(data);
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
          <InputField
            label="Titre de la session"
            name="title"
            required
            placeholder="Introduction à HTML/CSS"
          />
          <InputField label="Date" name="date" type="date" required />
          <InputField label="Heure de début" name="time" type="time" required />
          <SelectField
            label="Classe"
            name="class_name"
            options={[
              { value: 'Class 1', label: 'Classe 1' },
              { value: 'Class 2', label: 'Classe 2' },
              { value: 'Class 3', label: 'Classe 3' },
            ]}
            required
          />
          <SelectField
            label="Formateur"
            name="trainer_id"
            options={[
              { value: '1', label: 'Marie Martin' },
              { value: '2', label: 'Jean Dupont' },
            ]}
            required
          />
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
