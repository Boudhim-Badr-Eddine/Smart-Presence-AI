'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/lib/translations';

type Direction = 'ltr' | 'rtl';

type Palette = 'blue' | 'emerald' | 'amber' | 'purple';

type UIState = {
  dir: Direction;
  palette: Palette;
  locale: Locale;
  setDir: (d: Direction) => void;
  setPalette: (p: Palette) => void;
  setLocale: (l: Locale) => void;
};

const UIContext = createContext<UIState | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  // Lazily read from localStorage only in the browser to avoid SSR failures
  const getInitial = <T extends string>(key: string, fallback: T) => {
    if (typeof window === 'undefined') return fallback;
    return ((localStorage.getItem(key) as T | null) ?? fallback) as T;
  };

  const [dir, setDirState] = useState<Direction>(() => getInitial('spa_dir', 'ltr'));
  const [palette, setPaletteState] = useState<Palette>(() => getInitial('spa_palette', 'blue'));
  const [locale, setLocaleState] = useState<Locale>(() => getInitial('spa_locale', 'fr'));

  useEffect(() => {
    // Apply html dir
    const html = document.documentElement;
    html.setAttribute('dir', dir);
    localStorage.setItem('spa_dir', dir);
  }, [dir]);

  useEffect(() => {
    // Apply palette via data attribute for Tailwind selectors
    const html = document.documentElement;
    html.setAttribute('data-palette', palette);
    localStorage.setItem('spa_palette', palette);
  }, [palette]);

  useEffect(() => {
    // Apply locale to html lang
    const html = document.documentElement;
    html.setAttribute('lang', locale);
    localStorage.setItem('spa_locale', locale);
  }, [locale]);

  const value = useMemo<UIState>(
    () => ({
      dir,
      palette,
      locale,
      setDir: (d) => setDirState(d),
      setPalette: (p) => setPaletteState(p),
      setLocale: (l) => setLocaleState(l),
    }),
    [dir, palette, locale],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
}
