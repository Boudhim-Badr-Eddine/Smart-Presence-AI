"use client";

import Modal from "@/components/ui/Modal";
import InputField from "@/components/form/InputField";
import SelectField from "@/components/form/SelectField";
import { FormProvider, useForm } from "react-hook-form";

type TrainerFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
  isLoading?: boolean;
};

export default function TrainerCreateEditModal({ isOpen, onClose, onSubmit, initialData, isLoading }: TrainerFormProps) {
  const methods = useForm({
    defaultValues: initialData ?? { name: "", email: "", subjects: [] },
  });

  const handleSubmit = methods.handleSubmit((data) => {
    onSubmit(data);
    methods.reset();
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Modifier formateur" : "Créer un formateur"}>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField label="Nom complet" name="name" required placeholder="Marie Martin" />
          <InputField label="Email" name="email" type="email" required placeholder="marie@example.com" />
          <SelectField
            label="Matière principale"
            name="subjects"
            options={[
              { value: "Math", label: "Mathématiques" },
              { value: "Science", label: "Sciences" },
              { value: "English", label: "Anglais" },
              { value: "French", label: "Français" },
            ]}
            required
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {isLoading ? "Traitement..." : "Enregistrer"}
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
