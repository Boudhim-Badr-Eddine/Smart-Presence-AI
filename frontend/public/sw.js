/* eslint-disable no-restricted-globals */
const CACHE_NAME = 'smart-presence-v3';
// Only cache stable assets.
// Avoid caching Next.js HTML and chunk assets to prevent stale builds
// (blank screen due to missing /_next/static/* files after rebuilds).
const STATIC_ASSETS = ['/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        }),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin and API requests
  if (url.origin !== location.origin || url.pathname.startsWith('/api')) {
    return;
  }

  // Network-first for navigations to avoid serving stale HTML.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        new Response('Offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }),
      ),
    );
    return;
  }

  // For everything else: always go to network.
  // (Keeps runtime chunk loading consistent across rebuilds.)
  event.respondWith(fetch(request));
});

// Background sync for offline check-ins
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-checkins') {
    event.waitUntil(
      syncOfflineCheckins()
        .then(() => {
          console.log('✅ Background sync completed');
          return self.registration.showNotification('SmartPresence', {
            body: 'Offline check-ins have been synced',
            icon: '/icon-192.png',
          });
        })
        .catch((error) => {
          console.error('❌ Background sync failed:', error);
        })
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'SmartPresence';
  const options = {
    body: data.body || 'New notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.url,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data) {
    event.waitUntil(clients.openWindow(event.notification.data));
  }
});

// Sync helper (actual sync done by frontend)
async function syncOfflineCheckins() {
  return Promise.resolve();
}
