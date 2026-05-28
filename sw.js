const CACHE_NAME = 'espana-life-v28-reset';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      try {
        const url = new URL(client.url);
        if (url.origin === self.location.origin && !url.searchParams.has('fresh')) {
          url.searchParams.set('fresh', '28');
          await client.navigate(url.toString());
        }
      } catch (error) {}
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    })());
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

  event.respondWith(
    fetch(request, { cache: 'no-store' }).catch(() => {
      if (request.mode === 'navigate') {
        return fetch('/index.html?offline_fallback=1', { cache: 'no-store' });
      }
      return caches.match(request);
    })
  );
});