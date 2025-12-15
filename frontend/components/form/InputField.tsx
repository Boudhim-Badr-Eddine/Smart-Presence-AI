"use client";

import { useFormContext } from "react-hook-form";

type InputFieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
};

export default function InputField({ label, name, type = "text", required, placeholder }: InputFieldProps) {
  const { register, formState: { errors } } = useFormContext();
  const error = errors[name]?.message as string | undefined;

  return (
    <div>
      <label className="block text-xs font-medium text-zinc-300 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        {...register(name)}
        type={type}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-3 py-2 text-sm text-white bg-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 ${
          error ? "border-red-500 focus:ring-red-600" : "border-white/10 focus:ring-amber-600"
        }`}
        aria-label={label}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
