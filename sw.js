const CACHE_NAME = 'espana-life-v26';
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
  if (html.includes('homeHotAdsPatch20260528')) return html;

  const patch = `
<style id="homeHotAdsPatch20260528">
  .header-top { display: none !important; }
  .header-main { background: #fff !important; border-bottom: 1px solid rgba(158,28,28,0.12); }
  .header-main .logo-text h1 { font-size: clamp(24px, 5vw, 32px) !important; line-height: 1.02 !important; letter-spacing: 0 !important; color: var(--red) !important; }
  .header-main .logo-text span { font-size: 12px !important; line-height: 1.35 !important; color: var(--ink-light) !important; }
  .header-main .logo { min-width: min(100%, 300px); }
  .header-main .logo-icon { width: 62px !important; height: 62px !important; border-radius: 15px !important; box-shadow: 0 8px 22px rgba(80,34,15,0.18) !important; }
  .header-main .logo-title-row { flex-direction: column !important; flex-wrap: nowrap !important; gap: 4px !important; align-items: flex-start !important; }
  .header-main .logo-text .brand-domain { flex: 0 0 auto !important; margin-top: 0 !important; white-space: nowrap !important; cursor: pointer !important; color: var(--red-dark) !important; }
  .header-main .search-bar { border: 1px solid rgba(158,28,28,0.16); border-radius: 7px; box-shadow: 0 8px 22px rgba(80,34,15,0.08); }
  .header-main .search-bar button { min-width: 56px !important; background: linear-gradient(180deg, #d92727 0%, #9e1c1c 100%) !important; color: #fff !important; border: 1px solid rgba(128,20,20,0.34) !important; border-radius: 0 7px 7px 0 !important; box-shadow: 0 8px 18px rgba(158,28,28,0.26) !important; font-weight: 900 !important; }
  .header-lang.lang-switch { border-color: rgba(158,28,28,0.22); background: #fff8ec; }
  .hero { background: #fff !important; padding: 22px 16px !important; border-bottom: 1px solid rgba(158,28,28,0.1); }
  .hero::before, .hero::after { display: none !important; }
  .nav-cats { background: rgba(255,255,255,0.92) !important; gap: 8px !important; padding: 10px 14px !important; border-top: 1px solid rgba(158,28,28,0.08); border-bottom: 1px solid rgba(158,28,28,0.1); box-shadow: 0 8px 22px rgba(80,34,15,0.08); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); }
  .nav-cat { min-height: 40px !important; padding: 0 14px !important; border: 1px solid rgba(158,28,28,0.1) !important; border-radius: 999px !important; background: linear-gradient(180deg, #fff 0%, #fff8ee 100%) !important; color: #6f1c16 !important; font-size: 14px !important; font-weight: 850 !important; box-shadow: 0 5px 14px rgba(80,34,15,0.08) !important; }
  .nav-cat:hover, .nav-cat.active { background: linear-gradient(180deg, #fff6df 0%, #ffd36a 100%) !important; color: #5a160f !important; border-color: rgba(245,166,35,0.78) !important; }
  .mobile-auth-shortcuts { display: none; }
  .mobile-auth-link { text-decoration: none; border: 1px solid rgba(212,43,43,0.2); background: #fff; color: var(--red-dark); border-radius: 999px; padding: 8px 12px; font-size: 13px; font-weight: 800; line-height: 1; white-space: nowrap; box-shadow: 0 4px 12px rgba(26,10,0,0.05); }
  .mobile-auth-link.primary { background: var(--red); border-color: var(--red); color: #fff; }
  .today-hot-section { background: linear-gradient(180deg, #fffaf2 0%, #fff 100%); border-top: 1px solid #f4eadc; border-bottom: 1px solid #f4eadc; }
  .paid-ad-strip { display: block; margin: -8px 0 16px; }
  .paid-ad-card { position: relative; min-height: 118px; border: 1px solid rgba(212,43,43,0.18); border-radius: 12px; overflow: hidden; background: #fff; color: var(--ink); cursor: pointer; box-shadow: 0 8px 22px rgba(26,10,0,0.08); animation: paidAdFade .28s ease; }
  .paid-ad-card img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .paid-ad-card::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(0,0,0,.68) 0%, rgba(0,0,0,.22) 58%, rgba(0,0,0,.06) 100%); }
  .paid-ad-card.house-ad { background: linear-gradient(135deg, #fff7e0 0%, #ffe3b3 45%, #fff 100%); }
  .paid-ad-card.house-ad::after { background: radial-gradient(circle at 88% 18%, rgba(245,166,35,.34) 0 18%, transparent 19%), linear-gradient(90deg, rgba(158,28,28,.88) 0%, rgba(212,43,43,.66) 46%, rgba(212,43,43,.08) 100%); }
  .paid-ad-body { position: relative; z-index: 2; width: min(74%, 360px); padding: 14px; color: #fff; }
  .paid-ad-label { display: inline-flex; width: fit-content; margin-bottom: 8px; border-radius: 999px; padding: 4px 8px; background: rgba(255,255,255,0.92); color: var(--red-dark); font-size: 11px; font-weight: 900; }
  .paid-ad-title { font-size: 16px; font-weight: 900; line-height: 1.35; margin-bottom: 7px; text-shadow: 0 2px 10px rgba(0,0,0,.34); }
  .paid-ad-meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: 12px; color: rgba(255,255,255,.88); }
  .paid-ad-cta { display: inline-flex; width: fit-content; margin-top: 10px; border-radius: 999px; padding: 6px 10px; background: #fff; color: var(--red-dark); font-size: 12px; font-weight: 900; }
  .paid-ad-dots { display: flex; justify-content: center; gap: 5px; margin-top: 8px; }
  .paid-ad-dot { width: 6px; height: 6px; border-radius: 999px; background: rgba(158,28,28,.24); }
  .paid-ad-dot.active { width: 16px; background: var(--red); }
  @keyframes paidAdFade { from { opacity: .55; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }
  @media (max-width: 760px) { .mobile-auth-shortcuts { display: flex; gap: 8px; padding: 0 14px 10px; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; border-bottom: 1px solid rgba(212,43,43,0.08); } .mobile-auth-shortcuts::-webkit-scrollbar { display: none; } .mobile-auth-link { flex: 0 0 auto; min-height: 34px; display: inline-flex; align-items: center; justify-content: center; } }
</style>
<script id="homeHotAdsPatchScript20260528">
(() => {
  const ROTATE_MS = 180000;
  let slides = [];
  let index = 0;
  let timer = null;
  function patchHeader() {
    const appBadge = document.querySelector('.header-main .brand-domain');
    if (appBadge) {
      const logoLink = appBadge.closest('a.logo');
      if (logoLink) logoLink.setAttribute('href', '/download');
      appBadge.textContent = '下载手机 APP';
      appBadge.setAttribute('role', 'button');
      appBadge.setAttribute('tabindex', '0');
      appBadge.setAttribute('aria-label', '下载手机 APP');
      appBadge.onclick = (event) => { event.preventDefault(); event.stopPropagation(); location.href = '/download'; return false; };
    }
    document.querySelectorAll('footer li').forEach((item) => { const text = item.textContent || ''; if (text.includes('+34') || text.includes('WhatsApp')) item.remove(); });
    document.querySelectorAll('.studio-credit').forEach((credit) => { credit.innerHTML = credit.innerHTML.replaceAll('老王跟小宋工作室', '欧桥开放平台').replaceAll('Wang & Song Studio', 'EuroBridge Open Platform'); });
  }
  function ensureMobileAuth() {
    if (document.querySelector('.mobile-auth-shortcuts')) return;
    const headerMain = document.querySelector('.header-main');
    if (!headerMain) return;
    headerMain.insertAdjacentHTML('afterend', '<div class="mobile-auth-shortcuts" aria-label="账号快捷入口"><a href="#" class="mobile-auth-link primary" onclick="openModal(\'login\');return false;">登录</a><a href="#" class="mobile-auth-link" onclick="openModal(\'register\');return false;">注册</a><a href="#" class="mobile-auth-link primary" onclick="openModal(\'profile\');return false;">我的信息</a><a href="#" class="mobile-auth-link" onclick="openModal(\'post\');return false;">＋ 发布信息</a></div>');
  }
  function ensureHotSection() {
    let section = document.getElementById('todayHotDealsSection');
    if (section) return section;
    const target = document.getElementById('merchantFilterSection') || document.querySelector('.merchant-filter-section') || document.getElementById('listingsGrid')?.closest('.section');
    if (!target) return null;
    target.insertAdjacentHTML('beforebegin', '<div class="section today-hot-section" id="todayHotDealsSection"><div class="section-title"><h3>今日热卖推荐</h3><a href="#" class="see-all" onclick="openModal(\'post\');return false;">商家入口 →</a></div><div class="paid-ad-strip" id="paidAdStrip" aria-label="客户付费广告位"></div></div>');
    return document.getElementById('todayHotDealsSection');
  }
  function ensureNav() {
    const nav = document.querySelector('.nav-cats');
    if (!nav || nav.querySelector('[href="#todayHotDealsSection"]')) return;
    const all = nav.querySelector('.nav-cat');
    const link = document.createElement('a');
    link.href = '#todayHotDealsSection';
    link.className = 'nav-cat';
    link.textContent = '🔥 今日热卖';
    link.onclick = (event) => { event.preventDefault(); ensureHotSection()?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    all ? all.after(link) : nav.prepend(link);
  }
  function addHotOption() {
    ['postCat', 'editCat'].forEach((id) => {
      const select = document.getElementById(id);
      if (select && ![...select.options].some((o) => o.value === '今日热卖')) {
        const opt = document.createElement('option');
        opt.value = '今日热卖';
        opt.textContent = id === 'postCat' ? '🔥 今日热卖' : '今日热卖';
        const business = [...select.options].find((o) => o.value === '生意');
        business ? business.after(opt) : select.append(opt);
      }
    });
  }
  function normalize(text) { return String(text || '').replace(/\s+/g, ' ').trim(); }
  function collectCustomerAds() {
    return [...document.querySelectorAll('.listing-card')].slice(0, 3).map((card) => {
      const img = card.querySelector('img')?.src || '/assets/icons/wechat-share-logo-20260521.jpg';
      const title = normalize(card.querySelector('.listing-title')?.textContent) || '商家广告';
      const city = normalize(card.querySelector('.listing-loc')?.textContent) || '西班牙';
      const price = normalize(card.querySelector('.listing-price')?.textContent) || '面议';
      return { type: 'customer', card, img, title, city, price };
    });
  }
  function dots(total) { return total < 2 ? '' : '<div class="paid-ad-dots">' + Array.from({ length: total }, (_, i) => '<span class="paid-ad-dot ' + (i === index ? 'active' : '') + '"></span>').join('') + '</div>'; }
  function renderSlide() {
    const strip = document.getElementById('paidAdStrip');
    if (!strip || !slides.length) return;
    index = index % slides.length;
    const slide = slides[index];
    if (slide.type === 'house') {
      strip.innerHTML = '<article class="paid-ad-card house-ad" onclick="openModal(\'post\')"><div class="paid-ad-body"><div class="paid-ad-label">招商广告 · 广告位</div><div class="paid-ad-title">今日热卖广告位招商</div><div class="paid-ad-meta"><span>📍 全西班牙</span><span>商家可投放</span></div><div class="paid-ad-cta">发布商家广告 →</div></div></article>' + dots(slides.length);
      return;
    }
    strip.innerHTML = '<article class="paid-ad-card"><img src="' + slide.img + '" alt="" loading="lazy"><div class="paid-ad-body"><div class="paid-ad-label">广告 · 今日热卖</div><div class="paid-ad-title">' + slide.title + '</div><div class="paid-ad-meta"><span>' + slide.city + '</span><span>' + slide.price + '</span></div></div></article>' + dots(slides.length);
    strip.querySelector('.paid-ad-card').onclick = () => slide.card?.click();
  }
  function startAds() {
    if (!ensureHotSection()) return;
    const customer = collectCustomerAds();
    slides = [...customer, { type: 'house' }];
    renderSlide();
    if (timer) clearInterval(timer);
    if (slides.length > 1) timer = setInterval(() => { index = (index + 1) % slides.length; renderSlide(); }, ROTATE_MS);
  }
  function patchTexts() {
    document.querySelectorAll('[data-i18n="merchant.title"], .merchant-filter-section h3').forEach((el) => { if (/商家服务筛选|Servicios/.test(el.textContent || '')) el.textContent = '今日热卖'; });
    document.querySelectorAll('h3').forEach((el) => { if ((el.textContent || '').trim() === '今日热卖') el.textContent = '今日热卖推荐'; });
  }
  function run() { patchHeader(); ensureMobileAuth(); ensureNav(); addHotOption(); patchTexts(); startAds(); }
  run();
  document.addEventListener('DOMContentLoaded', run);
  setTimeout(run, 300);
  setTimeout(run, 1200);
  setTimeout(run, 3500);
})();
</script>`;

  return html.replace('</body>', `${patch}\n</body>`);
}

async function transformHomeResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  let html = await response.text();
  html = html
    .replaceAll('淘商圈', '生活圈')
    .replace('<a href="#" class="logo">', '<a href="/download" class="logo">')
    .replace('<span class="brand-domain">espanalife.app</span>', `<span class="brand-domain" role="button" tabindex="0" aria-label="下载手机 APP" onclick="event.preventDefault(); event.stopPropagation(); window.location.href='/download'; return false;">下载手机 APP</span>`)
    .replaceAll('老王跟小宋工作室', '欧桥开放平台')
    .replaceAll('Wang & Song Studio', 'EuroBridge Open Platform')
    .replace(/\s*<li>\s*<a[^>]*id="footerWhatsapp"[^>]*>[\s\S]*?<\/a>\s*<\/li>/g, '')
    .replace(/\s*<li>\s*📱\s*\+34\s*<\/li>/g, '')
    .replace("whatsapp: '+34 ',", "whatsapp: '',");

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