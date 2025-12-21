'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'high-contrast';
export type FontSize = 'small' | 'medium' | 'large' | 'x-large';

interface AccessibilitySettings {
  theme: Theme;
  fontSize: FontSize;
  reduceMotion: boolean;
  screenReaderOptimized: boolean;
  highContrast: boolean;
}

interface AccessibilityContextType extends AccessibilitySettings {
  setTheme: (theme: Theme) => void;
  setFontSize: (size: FontSize) => void;
  setReduceMotion: (reduce: boolean) => void;
  setScreenReaderOptimized: (optimized: boolean) => void;
  toggleHighContrast: () => void;
}

const defaultSettings: AccessibilitySettings = {
  theme: 'light',
  fontSize: 'medium',
  reduceMotion: false,
  screenReaderOptimized: false,
  highContrast: false,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('accessibility');
    if (saved) {
      setSettings({ ...defaultSettings, ...JSON.parse(saved) });
    }

    // Detect system preferences
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSettings((prev) => ({ ...prev, reduceMotion: true }));
    }
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      setSettings((prev) => ({ ...prev, highContrast: true }));
    }
  }, []);

  useEffect(() => {
    // Apply settings to document
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.setAttribute('data-font-size', settings.fontSize);
    document.documentElement.setAttribute('data-reduce-motion', settings.reduceMotion.toString());
    document.documentElement.setAttribute('data-high-contrast', settings.highContrast.toString());

    // Save to localStorage
    localStorage.setItem('accessibility', JSON.stringify(settings));
  }, [settings]);

  const setTheme = (theme: Theme) => {
    setSettings((prev) => ({ ...prev, theme, highContrast: theme === 'high-contrast' }));
  };

  const setFontSize = (fontSize: FontSize) => {
    setSettings((prev) => ({ ...prev, fontSize }));
  };

  const setReduceMotion = (reduceMotion: boolean) => {
    setSettings((prev) => ({ ...prev, reduceMotion }));
  };

  const setScreenReaderOptimized = (screenReaderOptimized: boolean) => {
    setSettings((prev) => ({ ...prev, screenReaderOptimized }));
  };

  const toggleHighContrast = () => {
    setSettings((prev) => ({
      ...prev,
      highContrast: !prev.highContrast,
      theme: !prev.highContrast ? 'high-contrast' : 'light',
    }));
  };

  return (
    <AccessibilityContext.Provider
      value={{
        ...settings,
        setTheme,
        setFontSize,
        setReduceMotion,
        setScreenReaderOptimized,
        toggleHighContrast,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}
