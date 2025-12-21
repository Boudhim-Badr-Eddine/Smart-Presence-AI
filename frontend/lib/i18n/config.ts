/**
 * i18n Configuration for SmartPresence
 * Supports: French (default), English, Arabic
 */

export type Locale = 'fr' | 'en' | 'ar';

export const locales: Locale[] = ['fr', 'en', 'ar'];

export const defaultLocale: Locale = 'fr';

export const localeNames: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
};

export const localeDirections: Record<Locale, 'ltr' | 'rtl'> = {
  fr: 'ltr',
  en: 'ltr',
  ar: 'rtl',
};
