import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Manrope } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import ToastContainer from '@/components/common/ToastContainer';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ThemeProvider } from '@/contexts/ThemeContext';
import TopProgressBar from '@/components/common/TopProgressBar';

const manrope = Manrope({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Smart Presence AI',
  description: 'Attendance intelligence with optional facial login and multi-role dashboards.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SmartPresence',
  },
};

export const viewport: Viewport = {
  themeColor: '#0ea5e9',
};

import QueryProvider from '@/components/providers/QueryProvider';
import { UIProvider } from '@/contexts/UIContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="text-white">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={manrope.className}>
        <a href="#main" className="skip-link">Passer au contenu</a>
        <ThemeProvider>
          <ErrorBoundary>
            <AuthProvider>
              <QueryProvider>
                <UIProvider>
                  <Suspense fallback={null}>
                    <TopProgressBar />
                  </Suspense>
                  <main id="main" role="main">
                    {children}
                  </main>
                  <ToastContainer />
                </UIProvider>
              </QueryProvider>
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        ` }} />
      </body>
    </html>
  );
}
