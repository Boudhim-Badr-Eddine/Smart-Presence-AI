"use client";

import Modal from "@/components/ui/Modal";
import InputField from "@/components/form/InputField";
import SelectField from "@/components/form/SelectField";
import { FormProvider, useForm } from "react-hook-form";

type StudentFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
  isLoading?: boolean;
};

export default function StudentCreateEditModal({ isOpen, onClose, onSubmit, initialData, isLoading }: StudentFormProps) {
  const methods = useForm({
    defaultValues: initialData ?? { name: "", student_code: "", class_name: "", facial_data_encoded: false },
  });

  const handleSubmit = methods.handleSubmit((data) => {
    onSubmit(data);
    methods.reset();
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Modifier étudiant" : "Créer un étudiant"}>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField label="Nom complet" name="name" required placeholder="Jean Dupont" />
          <InputField label="Code étudiant" name="student_code" required placeholder="STU001" />
          <SelectField
            label="Classe"
            name="class_name"
            options={[
              { value: "Class 1", label: "Classe 1" },
              { value: "Class 2", label: "Classe 2" },
              { value: "Class 3", label: "Classe 3" },
            ]}
            required
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="facial"
              {...methods.register("facial_data_encoded")}
              className="rounded border-white/10 focus:ring-2 focus:ring-amber-600"
            />
            <label htmlFor="facial" className="text-xs text-zinc-300">Données faciales enrôlées</label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
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
