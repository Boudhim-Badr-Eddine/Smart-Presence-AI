"use client";

import { Globe2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { localeNames, locales } from "@/lib/i18n/config";

export default function LanguageSwitcher() {
  const { locale, setLocale, direction } = useI18n();

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-300 light:text-gray-700" role="group" aria-label="Language selector">
      <Globe2 className="h-4 w-4" aria-hidden="true" />
      <label htmlFor="language-select" className="sr-only">
        Choose language
      </label>
      <select
        id="language-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as typeof locale)}
        className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white light:border-gray-300 light:bg-white light:text-gray-900 contrast:focus:ring-cyan-400 contrast:focus:ring-offset-black"
        dir={direction}
        aria-label={`Current language: ${localeNames[locale]}`}
      >
        {locales.map((loc) => (
          <option key={loc} value={loc} dir={loc === "ar" ? "rtl" : "ltr"}>
            {localeNames[loc]}
          </option>
        ))}
      </select>
    </div>
  );
}