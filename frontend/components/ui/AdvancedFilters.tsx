'use client';

import React, { useState } from 'react';
import { X, Filter } from 'lucide-react';

interface FilterOption {
  id: string;
  label: string;
}

interface AdvancedFiltersProps {
  filters: {
    name: string;
    type: 'select' | 'multiselect' | 'text' | 'date' | 'daterange';
    label: string;
    options?: FilterOption[];
  }[];
  onApply: (filters: Record<string, any>) => void;
  onReset: () => void;
  presetKey?: string; // optional localStorage key to save/restore presets
}

export default function AdvancedFilters({
  filters,
  onApply,
  onReset,
  presetKey,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<Record<string, any>>(() => {
    if (typeof window === 'undefined' || !presetKey) return {};
    try {
      const saved = localStorage.getItem(`filters:${presetKey}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const activeCount = Object.values(values).filter(
    (v) => v && (Array.isArray(v) ? v.length > 0 : true),
  ).length;

  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleApply = () => {
    onApply(values);
    if (presetKey && typeof window !== 'undefined') {
      localStorage.setItem(`filters:${presetKey}`, JSON.stringify(values));
    }
    setIsOpen(false);
  };

  const handleReset = () => {
    setValues({});
    if (presetKey && typeof window !== 'undefined') {
      localStorage.removeItem(`filters:${presetKey}`);
    }
    onReset();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-300 light:bg-white light:text-gray-900 light:hover:bg-gray-50"
      >
        <Filter className="h-4 w-4" />
        Filtres
        {activeCount > 0 && (
          <span className="ml-1 rounded-full bg-amber-600 px-2 py-0.5 text-xs font-semibold">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-white/10 bg-zinc-900 shadow-xl dark:border-white/10 dark:bg-zinc-900 light:border-gray-200 light:bg-white light:shadow-lg">
          <div className="flex items-center justify-between border-b border-white/10 p-4 dark:border-white/10 light:border-gray-200">
            <h3 className="font-semibold text-white dark:text-white light:text-gray-900">
              Filtres avancés
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded p-1 hover:bg-white/10 dark:hover:bg-white/10 light:hover:bg-gray-100"
              aria-label="Fermer"
            >
              <X className="h-4 w-4 text-zinc-400" />
            </button>
          </div>

          <div className="space-y-4 p-4">
            {filters.map((filter) => (
              <div key={filter.name}>
                <label className="block text-xs font-medium text-zinc-300 dark:text-zinc-300 light:text-gray-700 mb-1">
                  {filter.label}
                </label>

                {filter.type === 'text' && (
                  <input
                    type="text"
                    value={values[filter.name] || ''}
                    onChange={(e) => handleChange(filter.name, e.target.value)}
                    placeholder="Entrez du texte..."
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:ring-2 focus:ring-amber-600 dark:border-white/20 dark:bg-white/5 light:border-gray-300 light:bg-white light:text-gray-900 light:placeholder-gray-500"
                  />
                )}

                {filter.type === 'select' && (
                  <select
                    value={values[filter.name] || ''}
                    onChange={(e) => handleChange(filter.name, e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-600 dark:border-white/20 dark:bg-white/5 light:border-gray-300 light:bg-white light:text-gray-900"
                  >
                    <option value="">Tous</option>
                    {filter.options?.map((opt) => (
                      <option
                        key={opt.id}
                        value={opt.id}
                        className="bg-zinc-800 text-white dark:bg-zinc-800"
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {filter.type === 'multiselect' && (
                  <div className="space-y-2">
                    {filter.options?.map((opt) => (
                      <label key={opt.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={values[filter.name]?.includes(opt.id) || false}
                          onChange={(e) => {
                            const current = values[filter.name] || [];
                            if (e.target.checked) {
                              handleChange(filter.name, [...current, opt.id]);
                            } else {
                              handleChange(
                                filter.name,
                                current.filter((id: string) => id !== opt.id),
                              );
                            }
                          }}
                          className="h-4 w-4 rounded border-white/20 bg-white/5 text-amber-600 focus:ring-2 focus:ring-amber-600"
                        />
                        <span className="text-zinc-300 dark:text-zinc-300 light:text-gray-700">
                          {opt.label}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {filter.type === 'date' && (
                  <input
                    type="date"
                    value={values[filter.name] || ''}
                    onChange={(e) => handleChange(filter.name, e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-600 dark:border-white/20 dark:bg-white/5 light:border-gray-300 light:bg-white light:text-gray-900"
                  />
                )}

                {filter.type === 'daterange' && (
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={values[`${filter.name}_from`] || ''}
                      onChange={(e) => handleChange(`${filter.name}_from`, e.target.value)}
                      placeholder="De"
                      className="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-600 dark:border-white/20 dark:bg-white/5 light:border-gray-300 light:bg-white light:text-gray-900"
                    />
                    <input
                      type="date"
                      value={values[`${filter.name}_to`] || ''}
                      onChange={(e) => handleChange(`${filter.name}_to`, e.target.value)}
                      placeholder="À"
                      className="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-600 dark:border-white/20 dark:bg-white/5 light:border-gray-300 light:bg-white light:text-gray-900"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 border-t border-white/10 p-4 dark:border-white/10 light:border-gray-200">
            <button
              onClick={handleReset}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 light:border-gray-300 light:bg-white light:text-gray-900 light:hover:bg-gray-50"
            >
              Réinitialiser
            </button>
            <button
              onClick={handleApply}
              className="flex-1 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
            >
              Appliquer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
