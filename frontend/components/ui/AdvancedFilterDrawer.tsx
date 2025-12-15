/**
 * Advanced filter drawer with date ranges, multi-select, and saved filters.
 */
"use client";

import { useState } from "react";
import { X, Filter, Calendar, Search, Save, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type FilterField = {
  name: string;
  label: string;
  type: "text" | "select" | "multi-select" | "date-range" | "number-range";
  options?: { id: string; label: string }[];
  placeholder?: string;
};

export type FilterValues = Record<string, any>;

type AdvancedFilterDrawerProps = {
  fields: FilterField[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onApply: () => void;
  onReset: () => void;
  isOpen: boolean;
  onClose: () => void;
};

export default function AdvancedFilterDrawer({
  fields,
  values,
  onChange,
  onApply,
  onReset,
  isOpen,
  onClose,
}: AdvancedFilterDrawerProps) {
  const [savedFilters, setSavedFilters] = useState<{ name: string; values: FilterValues }[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [filterName, setFilterName] = useState("");

  const handleChange = (name: string, value: any) => {
    onChange({ ...values, [name]: value });
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) return;
    setSavedFilters([...savedFilters, { name: filterName, values }]);
    setFilterName("");
    setSaveDialogOpen(false);
  };

  const handleLoadFilter = (filter: { name: string; values: FilterValues }) => {
    onChange(filter.values);
  };

  const handleDeleteSaved = (index: number) => {
    setSavedFilters(savedFilters.filter((_, i) => i !== index));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-zinc-950 shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-amber-400" />
                  <h2 className="text-lg font-semibold text-white">Filtres avancés</h2>
                </div>
                <button
                  onClick={onClose}
                  className="rounded p-1 text-zinc-400 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Saved Filters */}
            {savedFilters.length > 0 && (
              <div className="border-b border-white/10 px-6 py-4">
                <p className="mb-2 text-xs uppercase tracking-wider text-zinc-500">Filtres sauvegardés</p>
                <div className="space-y-2">
                  {savedFilters.map((filter, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <button
                        onClick={() => handleLoadFilter(filter)}
                        className="flex-1 text-left text-sm text-white hover:text-amber-300"
                      >
                        {filter.name}
                      </button>
                      <button
                        onClick={() => handleDeleteSaved(idx)}
                        className="text-zinc-400 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Fields */}
            <div className="space-y-4 px-6 py-6">
              {fields.map((field) => (
                <div key={field.name}>
                  <label className="mb-2 block text-sm font-medium text-white">{field.label}</label>
                  
                  {field.type === "text" && (
                    <input
                      type="text"
                      value={values[field.name] || ""}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                    />
                  )}

                  {field.type === "select" && (
                    <select
                      value={values[field.name] || ""}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                    >
                      <option value="">Tous</option>
                      {field.options?.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {field.type === "multi-select" && (
                    <div className="space-y-2">
                      {field.options?.map((opt) => (
                        <label key={opt.id} className="flex items-center gap-2 text-sm text-white">
                          <input
                            type="checkbox"
                            checked={(values[field.name] || []).includes(opt.id)}
                            onChange={(e) => {
                              const current = values[field.name] || [];
                              const updated = e.target.checked
                                ? [...current, opt.id]
                                : current.filter((v: string) => v !== opt.id);
                              handleChange(field.name, updated);
                            }}
                            className="rounded border-white/20 bg-white/10 text-amber-500 focus:ring-amber-500"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  )}

                  {field.type === "date-range" && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={values[`${field.name}_start`] || ""}
                        onChange={(e) => handleChange(`${field.name}_start`, e.target.value)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                      />
                      <input
                        type="date"
                        value={values[`${field.name}_end`] || ""}
                        onChange={(e) => handleChange(`${field.name}_end`, e.target.value)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                      />
                    </div>
                  )}

                  {field.type === "number-range" && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={values[`${field.name}_min`] || ""}
                        onChange={(e) => handleChange(`${field.name}_min`, e.target.value)}
                        placeholder="Min"
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                      />
                      <input
                        type="number"
                        value={values[`${field.name}_max`] || ""}
                        onChange={(e) => handleChange(`${field.name}_max`, e.target.value)}
                        placeholder="Max"
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 border-t border-white/10 bg-zinc-950 px-6 py-4">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setSaveDialogOpen(!saveDialogOpen)}
                  className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5"
                >
                  <Save className="h-4 w-4" />
                  Sauvegarder ce filtre
                </button>

                {saveDialogOpen && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      placeholder="Nom du filtre"
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={handleSaveFilter}
                      className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
                    >
                      OK
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onReset}
                    className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5"
                  >
                    Réinitialiser
                  </button>
                  <button
                    onClick={() => {
                      onApply();
                      onClose();
                    }}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
