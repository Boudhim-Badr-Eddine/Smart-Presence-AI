import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Manrope } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import ToastContainer from '@/components/common/ToastContainer';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ThemeProvider } from '@/contexts/ThemeContext';
import TopProgressBar from '@/components/common/TopProgressBar';
import { I18nProvider } from '@/lib/i18n/provider';

const manrope = Manrope({ subsets: ['latin'] });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Smart Presence AI',
  description: 'Attendance intelligence with optional facial login and multi-role dashboards.',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
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
      <body className={manrope.className}>
        <a href="#main" className="skip-link">
          Passer au contenu
        </a>
        <I18nProvider>
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
        </I18nProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              try {
                const host = window.location.hostname;
                const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';

                // Local development safety: cached SW + Next chunks frequently cause blank screens.
                if (isLocalhost) {
                  navigator.serviceWorker.getRegistrations().then((regs) => {
                    regs.forEach((reg) => reg.unregister());
                  });
                  if (window.caches && caches.keys) {
                    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
                  }
                  return;
                }

                navigator.serviceWorker.register('/sw.js').catch(() => {});
              } catch (_) {
                // ignore
              }
            });
          }
        `,
          }}
        />
      </body>
    </html>
  );
}
