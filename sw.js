const CACHE_NAME = 'espana-life-v14';
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

function injectHomePatch(html) {
  if (html.includes('footerBrandPatch20260528')) return html;

  const footerPatch = `
<script id="footerBrandPatch20260528">
(() => {
  function patchFooter() {
    document.querySelectorAll('footer li').forEach((item) => {
      const text = item.textContent || '';
      if (text.includes('+34') || text.includes('WhatsApp')) item.remove();
    });
    document.querySelectorAll('.studio-credit').forEach((credit) => {
      credit.innerHTML = credit.innerHTML
        .replaceAll('老王跟小宋工作室', '欧桥开放平台')
        .replaceAll('Wang & Song Studio', 'EuroBridge Open Platform');
    });
  }
  patchFooter();
  document.addEventListener('DOMContentLoaded', patchFooter);
  setTimeout(patchFooter, 300);
  setTimeout(patchFooter, 1200);
})();
</script>`;

  return html.replace('</body>', `${footerPatch}\n</body>`);
}

async function transformHomeResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  let html = await response.text();
  html = html
    .replaceAll('淘商圈', '生活圈')
    .replaceAll('老王跟小宋工作室', '欧桥开放平台')
    .replaceAll('Wang & Song Studio', 'EuroBridge Open Platform')
    .replace(/\s*<li>\s*<a[^>]*id="footerWhatsapp"[^>]*>[\s\S]*?<\/a>\s*<\/li>/g, '')
    .replace(/\s*<li>\s*📱\s*\+34\s*<\/li>/g, '')
    .replace("whatsapp: '+34 ',", "whatsapp: '',")
    .replace('  .header-main {\n    padding: 14px 24px;', '  .header-main {\n    background: var(--white);\n    padding: 14px 24px;')
    .replace('    flex-wrap: wrap;\n  }\n\n  .logo {', '    flex-wrap: wrap;\n    border-bottom: 1px solid rgba(158,28,28,0.12);\n  }\n\n  .logo {')
    .replace('  .logo-text { color: white; }', '  .logo-text { color: var(--red); }')
    .replace('    color: var(--gold-light);', '    color: var(--red);')
    .replace('    max-width: 520px;\n  }\n\n  .search-bar input {', '    max-width: 520px;\n    border: 1px solid rgba(158,28,28,0.16);\n    border-radius: 7px;\n    box-shadow: 0 8px 22px rgba(80,34,15,0.08);\n  }\n\n  .search-bar input {')
    .replace('  .search-bar button:hover { background: var(--gold-light); }', '  .header-lang.lang-switch {\n    border-color: rgba(158,28,28,0.22);\n    background: #fff8ec;\n  }\n\n  .header-lang .lang-btn {\n    color: var(--red-dark);\n  }\n\n  .search-bar button:hover { background: var(--gold-light); }');

  html = injectHomePatch(html);

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
  html = html
    .replaceAll('淘商圈', '生活圈')
    .replace('最多9张图片，或1个30秒内视频。', '最多9张图片。')
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
