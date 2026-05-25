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

async function transformFeedScriptResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('javascript')) return response;

  let js = await response.text();
  if (js.includes('taoMerchantMixPatch')) {
    return new Response(js, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  }

  js += `

;(() => {
  const taoMerchantMixPatch = true;
  const merchantFallbackImage = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80';

  function merchantImages(raw) {
    if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
    if (!raw) return [];
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
      } catch (error) {
        return raw.split(/[\\n,]+/).map(item => item.trim()).filter(Boolean);
      }
    }
    return [];
  }

  function appendTaoMerchants() {
    const grid = document.getElementById('feedGrid');
    if (!grid || typeof filteredMerchants !== 'function') return;
    grid.querySelectorAll('.merchant-card').forEach(card => card.remove());
    const merchants = filteredMerchants();
    merchants.forEach(merchant => {
      const card = document.createElement('article');
      const photos = merchantImages(merchant.images);
      const photo = photos[0] || merchantFallbackImage;
      const phone = typeof extractPhone === 'function' ? extractPhone(merchant.contact) : '';
      const contactHref = phone ? 'https://wa.me/' + phone.replace(/^\\+/, '') : '/?listing=' + encodeURIComponent(merchant.id);
      const mapUrl = merchant.address
        ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((merchant.address || '') + ' ' + (merchant.city || ''))
        : '';
      card.className = 'feed-card merchant-card';
      card.innerHTML = \`
        <button class="media-button" type="button" aria-label="查看大图">
          <img src="\${escapeHTML(photo)}" alt="\${escapeHTML(merchant.title || '商家资料')}" loading="lazy">
          <span class="burst-heart">♥</span>
        </button>
        <div class="card-body">
          <h2 class="merchant-title">\${escapeHTML(merchant.title || '商家资料')}</h2>
          <p class="card-desc">\${escapeHTML(merchant.description || '西班牙生活通商家资料')}</p>
          <div class="tag-list">
            <span>#商家</span>
            <span>#\${escapeHTML(merchant.category || '黄页')}</span>
            <span>#\${escapeHTML(merchant.city || '西班牙')}</span>
          </div>
          <div class="card-meta">
            <span class="author">西班牙生活通</span>
            <span class="city">📍 \${escapeHTML(merchant.city || '西班牙')}</span>
            <span class="time">\${typeof timeAgo === 'function' ? timeAgo(merchant.created_at) : ''}</span>
          </div>
          <div class="merchant-actions">
            <button class="merchant-action save-merchant" type="button" aria-label="收藏">☆</button>
            <button class="merchant-action share-merchant" type="button" aria-label="分享">↗</button>
            \${mapUrl ? \`<a class="merchant-action" href="\${escapeHTML(mapUrl)}" target="_blank" rel="noopener" aria-label="地图">⌖</a>\` : ''}
          </div>
          <a class="merchant-contact-btn" href="\${escapeHTML(contactHref)}" target="_blank" rel="noopener">联系</a>
          <a class="merchant-detail-btn" href="/?listing=\${encodeURIComponent(merchant.id)}" aria-label="详情">详情</a>
        </div>
      \`;
      card.querySelector('.media-button')?.addEventListener('click', () => {
        if (typeof openImageViewer === 'function') openImageViewer(photo, merchant.title || '商家资料');
      });
      card.querySelector('.share-merchant')?.addEventListener('click', async () => {
        const url = location.origin + '/?listing=' + merchant.id;
        if (navigator.share) await navigator.share({ title: '西班牙生活通商家资料', text: merchant.title || '商家资料', url }).catch(() => {});
        else {
          await navigator.clipboard?.writeText(url).catch(() => {});
          if (typeof showToast === 'function') showToast('商家链接已复制');
        }
      });
      grid.appendChild(card);
    });
  }

  const originalRenderPosts = typeof renderPosts === 'function' ? renderPosts : null;
  if (originalRenderPosts) {
    renderPosts = function patchedRenderPosts() {
      originalRenderPosts();
      appendTaoMerchants();
    };
  }

  const originalLoadMerchants = typeof loadMerchants === 'function' ? loadMerchants : null;
  if (originalLoadMerchants) {
    loadMerchants = async function patchedLoadMerchants() {
      const result = await originalLoadMerchants();
      if (activeMode !== 'merchants') appendTaoMerchants();
      return result;
    };
  }
})();
`;

  return new Response(js, {
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

  if (url.pathname === '/feed/feed.js') {
    event.respondWith(
      fetch(request)
        .then((response) => transformFeedScriptResponse(response.clone()))
        .catch(() => caches.match(request))
    );
    return;
  }

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
