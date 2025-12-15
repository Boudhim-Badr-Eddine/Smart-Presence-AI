"use client";

import { useFormContext } from "react-hook-form";

type SelectFieldProps = {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
};

export default function SelectField({ label, name, options, required }: SelectFieldProps) {
  const { register, formState: { errors } } = useFormContext();
  const error = errors[name]?.message as string | undefined;

  return (
    <div>
      <label className="block text-xs font-medium text-zinc-300 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <select
        {...register(name)}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-white bg-zinc-900 focus:outline-none focus:ring-2 ${
          error ? "border-red-500 focus:ring-red-600" : "border-white/10 focus:ring-amber-600"
        }`}
        aria-label={label}
      >
        <option value="">-- Sélectionner --</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
