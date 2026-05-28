const CACHE_NAME = 'espana-life-v12';
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
  html = html.replaceAll('淘商圈', '生活圈');
  html = html
    .replace('老王跟小宋工作室', '欧桥开放平台')
    .replace('Wang & Song Studio', 'EuroBridge Open Platform')
    .replace('<li>📱 +34</li>', '')
    .replace('  .header-main {\n    padding: 14px 24px;', '  .header-main {\n    background: var(--white);\n    padding: 14px 24px;')
    .replace('    flex-wrap: wrap;\n  }\n\n  .logo {', '    flex-wrap: wrap;\n    border-bottom: 1px solid rgba(158,28,28,0.12);\n  }\n\n  .logo {')
    .replace('  .logo-text { color: white; }', '  .logo-text { color: var(--red); }')
    .replace('    color: var(--gold-light);', '    color: var(--red);')
    .replace('    max-width: 520px;\n  }\n\n  .search-bar input {', '    max-width: 520px;\n    border: 1px solid rgba(158,28,28,0.16);\n    border-radius: 7px;\n    box-shadow: 0 8px 22px rgba(80,34,15,0.08);\n  }\n\n  .search-bar input {')
    .replace('  .search-bar button:hover { background: var(--gold-light); }', '  .header-lang.lang-switch {\n    border-color: rgba(158,28,28,0.22);\n    background: #fff8ec;\n  }\n\n  .header-lang .lang-btn {\n    color: var(--red-dark);\n  }\n\n  .search-bar button:hover { background: var(--gold-light); }');
  const note = `
  <div class="customer-info-note">
    <strong>所有客户信息集中在首页：</strong>商家资料、招工求职、租房买房、二手物品、生意转让和生活服务都在这里查看。生活圈只作为朋友圈式浏览和发布动态入口。
    <a class="tao-circle-link" href="/feed/" onclick="event.stopPropagation(); location.href='/feed/'; return false;">进入生活圈</a>
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
  .tao-circle-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: 10px;
    min-height: 40px;
    padding: 0 16px;
    border-radius: 999px;
    background: var(--red);
    color: #fff;
    font-weight: 900;
    text-decoration: none;
    box-shadow: 0 8px 20px rgba(193,39,45,0.22);
  }
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

async function transformFeedPageResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  let html = await response.text();
  html = html.replaceAll('淘商圈', '生活圈');
  html = html
    .replace('最多9张图片，或1个30秒内视频。', '最多9张图片，或1个视频。')
    .replace('最多9张图片，或1个视频。', '最多9张图片。')
    .replace('图片 / 视频', '图片')
    .replace('accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"', 'accept="image/jpeg,image/png,image/webp,image/gif"')
    .replace('图片最多9张；视频最多1个，不能超过30秒。', '图片最多9张。')
    .replace('图片最多9张；视频最多1个。', '图片最多9张。');

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
            : (url.pathname === '/feed/' || url.pathname === '/feed/index.html')
              ? await transformFeedPageResponse(response.clone())
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
