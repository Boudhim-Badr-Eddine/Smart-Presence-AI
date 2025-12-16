const translations = {
  fr: {
    // Common
    'common.loading': 'Chargement...',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.submit': 'Soumettre',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',

    // Navigation
    'nav.dashboard': 'Tableau de bord',
    'nav.profile': 'Mon profil',
    'nav.notifications': 'Notifications',
    'nav.calendar': 'Calendrier',
    'nav.logout': 'Déconnexion',

    // Student
    'student.dashboard.title': 'Mon tableau de bord',
    'student.dashboard.subtitle': 'Suivi de votre présence et de vos classes.',
    'student.notifications.title': 'Centre de notifications',
    'student.notifications.subtitle': 'Gérez vos alertes et vos préférences.',
    'student.profile.title': 'Profil étudiant',
    'student.profile.subtitle': 'Mettre à jour vos informations personnelles et vos préférences.',
    'student.calendar.title': 'Calendrier unifié',
    'student.calendar.subtitle': 'Cours, examens, rappels et justificatifs.',
    'student.feedback.title': 'Retour sur la formation',
    'student.feedback.subtitle': "Exprimez vos retours pour améliorer l'expérience.",
  },
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.submit': 'Submit',
    'common.search': 'Search',
    'common.filter': 'Filter',

    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.profile': 'My Profile',
    'nav.notifications': 'Notifications',
    'nav.calendar': 'Calendar',
    'nav.logout': 'Logout',

    // Student
    'student.dashboard.title': 'My Dashboard',
    'student.dashboard.subtitle': 'Track your attendance and classes.',
    'student.notifications.title': 'Notification Center',
    'student.notifications.subtitle': 'Manage your alerts and preferences.',
    'student.profile.title': 'Student Profile',
    'student.profile.subtitle': 'Update your personal information and preferences.',
    'student.calendar.title': 'Unified Calendar',
    'student.calendar.subtitle': 'Classes, exams, reminders, and justifications.',
    'student.feedback.title': 'Training Feedback',
    'student.feedback.subtitle': 'Share your feedback to improve the experience.',
  },
} as const;

export type Locale = keyof typeof translations;
export type TranslationKey = keyof typeof translations.fr;

export function getTranslation(locale: Locale, key: TranslationKey): string {
  return translations[locale][key] || translations.fr[key] || key;
}

export function createTranslator(locale: Locale) {
  return (key: TranslationKey) => getTranslation(locale, key);
}
