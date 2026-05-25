const CACHE_NAME = 'espana-life-v9';
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/share-logo-20260521.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function transformHomeResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  let html = await response.text();
  const note = `
  <div class="customer-info-note">
    <strong>所有客户信息集中在首页：</strong>商家资料、招工求职、租房买房、二手物品、生意转让和生活服务都在这里查看。淘商圈只作为朋友圈式浏览和发布动态入口。
  </div>`;
  const noteStyle = `
  .customer-info-note {
    margin: -10px 0 16px;
    border: 1px solid rgba(158,28,28,0.12);
    border-radius: 12px;
    padding: 12px 14px;
    background: #fffaf3;
    color: var(--ink-light);
    font-size: 13px;
    line-height: 1.65;
  }
  .customer-info-note strong { color: var(--red-dark); }
`;

  html = html
    .replace('/* Category cards */', `${noteStyle}\n  /* Category cards */`)
    .replace('<h3 id="listingTitle">最新信息</h3>', '<h3 id="listingTitle">客户信息中心</h3>')
    .replace('<a href="#" class="see-all" data-i18n="listing.more">查看更多 →</a>', '<a href="#" class="see-all" data-i18n="listing.more">全部资料 →</a>')
    .replace('<div class="section-title">\n    <h3 id="listingTitle">客户信息中心</h3>\n    <a href="#" class="see-all" data-i18n="listing.more">全部资料 →</a>\n  </div>', `<div class="section-title">\n    <h3 id="listingTitle">客户信息中心</h3>\n    <a href="#" class="see-all" data-i18n="listing.more">全部资料 →</a>\n  </div>${note}`)
    .replace("'hero.latest': '最新信息'", "'hero.latest': '客户信息'")
    .replace("'listing.more': '查看更多 →'", "'listing.more': '全部资料 →'")
    .replace("'listing.all': '最新信息'", "'listing.all': '客户信息中心'");

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/admin')) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/s/')) return;
  if (url.hostname.includes('supabase.co')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          const transformed = (url.pathname === '/' || url.pathname === '/index.html')
            ? await transformHomeResponse(response.clone())
            : response;
          const copy = transformed.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          return transformed;
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || caches.match('/offline.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
