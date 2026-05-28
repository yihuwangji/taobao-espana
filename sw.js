const CACHE_NAME = 'espana-life-v24';
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
  if (html.includes('headerBrandScale20260528')) return html;

  const footerPatch = `
<style id="headerBrandScale20260528">
  .header-top {
    display: none !important;
  }

  .header-main .logo-text h1 {
    font-size: clamp(24px, 5vw, 32px) !important;
    line-height: 1.02 !important;
    letter-spacing: 0 !important;
  }

  .header-main .logo-text span {
    font-size: 12px !important;
    line-height: 1.35 !important;
  }

  .header-main .logo {
    min-width: min(100%, 300px);
  }

  .header-main .logo-icon {
    width: 62px !important;
    height: 62px !important;
    border-radius: 15px !important;
    box-shadow: 0 8px 22px rgba(80,34,15,0.18) !important;
  }

  .header-main .logo-icon img {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
  }

  .header-main .logo-title-row {
    flex-direction: column !important;
    flex-wrap: nowrap !important;
    gap: 4px !important;
    align-items: flex-start !important;
  }

  .header-main .logo-text .brand-domain {
    flex: 0 0 auto !important;
    margin-top: 0 !important;
    white-space: nowrap !important;
    transform: none !important;
    cursor: pointer !important;
  }

  .header-main .search-bar button {
    min-width: 56px !important;
    background: linear-gradient(180deg, #d92727 0%, #9e1c1c 100%) !important;
    color: #fff !important;
    border: 1px solid rgba(128,20,20,0.34) !important;
    border-radius: 0 7px 7px 0 !important;
    box-shadow: 0 8px 18px rgba(158,28,28,0.26) !important;
    font-weight: 900 !important;
  }

  .header-main .search-bar button:hover,
  .header-main .search-bar button:focus-visible {
    background: linear-gradient(180deg, #ef3b3b 0%, #b32020 100%) !important;
    box-shadow: 0 10px 24px rgba(158,28,28,0.32) !important;
  }

  @media (max-width: 430px) {
    .header-main {
      gap: 10px 14px !important;
    }

    .header-main .logo-text h1 {
      font-size: 25px !important;
    }

    .header-main .logo-icon {
      width: 58px !important;
      height: 58px !important;
    }

    .header-main .logo-text .brand-domain {
      font-size: 11px !important;
      padding: 3px 8px !important;
    }
  }

  .hero {
    background: #fff !important;
    padding: 22px 16px !important;
    border-bottom: 1px solid rgba(158,28,28,0.1);
  }

  .hero::before,
  .hero::after {
    display: none !important;
  }

  .hero-activity {
    color: var(--ink) !important;
    max-width: none !important;
  }

  .hero-index {
    border-color: var(--gold) !important;
    box-shadow: 0 8px 22px rgba(80,34,15,0.1) !important;
  }

  .nav-cats {
    background: rgba(255,255,255,0.92) !important;
    gap: 8px !important;
    padding: 10px 14px !important;
    border-top: 1px solid rgba(158,28,28,0.08);
    border-bottom: 1px solid rgba(158,28,28,0.1);
    box-shadow: 0 8px 22px rgba(80,34,15,0.08);
    -webkit-backdrop-filter: blur(18px);
    backdrop-filter: blur(18px);
  }

  .nav-cat {
    min-height: 40px !important;
    padding: 0 14px !important;
    border: 1px solid rgba(158,28,28,0.1) !important;
    border-radius: 999px !important;
    background: linear-gradient(180deg, #fff 0%, #fff8ee 100%) !important;
    color: #6f1c16 !important;
    font-size: 14px !important;
    font-weight: 850 !important;
    box-shadow: 0 5px 14px rgba(80,34,15,0.08) !important;
  }

  .nav-cat:hover,
  .nav-cat.active {
    background: linear-gradient(180deg, #fff6df 0%, #ffd36a 100%) !important;
    color: #5a160f !important;
    border-color: rgba(245,166,35,0.78) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.7), 0 8px 18px rgba(245,166,35,0.2) !important;
  }

  @media (max-width: 430px) {
    .hero {
      padding: 18px 16px 12px !important;
    }

    .nav-cats {
      padding: 9px 12px !important;
      gap: 7px !important;
    }

    .nav-cat {
      min-height: 38px !important;
      padding: 0 13px !important;
      font-size: 14px !important;
    }
  }
</style>
<script id="footerBrandPatch20260528">
(() => {
  function patchFooter() {
    const appBadge = document.querySelector('.header-main .brand-domain');
    if (appBadge) {
      appBadge.textContent = '下载手机 APP';
      appBadge.setAttribute('role', 'button');
      appBadge.setAttribute('tabindex', '0');
      appBadge.setAttribute('aria-label', '下载手机 APP');
      appBadge.setAttribute('onclick', "event.preventDefault(); event.stopPropagation(); window.location.href='/download'; return false;");
      if (!appBadge.dataset.downloadBound) {
        appBadge.dataset.downloadBound = '1';
        appBadge.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          window.location.href = '/download';
        });
        appBadge.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            window.location.href = '/download';
          }
        });
      }
    }
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
    .replace('<span class="brand-domain">espanalife.app</span>', `<span class="brand-domain" role="button" tabindex="0" aria-label="下载手机 APP" onclick="event.preventDefault(); event.stopPropagation(); window.location.href='/download'; return false;">下载手机 APP</span>`)
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