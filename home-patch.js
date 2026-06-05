(() => {
  const ROTATE_MS = 5000;
  let slides = [];
  let index = 0;
  let timer = null;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  function ensureUniformAdCardStyle() {
    if ($('#uniformAdCardPatch20260605')) return;
    document.head.insertAdjacentHTML('beforeend', `
      <style id="uniformAdCardPatch20260605">
      @media(max-width:760px){
        .paid-ad-strip{margin:0 0 10px!important}
        .paid-ad-card{display:grid!important;grid-template-columns:96px minmax(0,1fr)!important;height:112px!important;min-height:112px!important;border:1.5px solid #eadfce!important;border-radius:8px!important;background:#fff!important;box-shadow:0 10px 26px rgba(80,34,15,.1)!important;overflow:hidden!important}
        .paid-ad-card:after{display:none!important}
        .paid-ad-card>img{position:relative!important;inset:auto!important;grid-column:1!important;width:96px!important;height:112px!important;object-fit:cover!important}
        .paid-ad-card.house-ad:before{content:'广告';grid-column:1;width:96px;height:112px;display:flex;align-items:center;justify-content:center;background:linear-gradient(145deg,#fff4d7 0%,#ffd36a 44%,#d42b2b 100%);color:#fff;font-weight:900;font-size:18px}
        .paid-ad-card.house-ad{background:#fff!important}
        .paid-ad-body{grid-column:2!important;width:auto!important;height:112px!important;box-sizing:border-box!important;padding:11px 12px!important;color:var(--ink)!important;display:flex!important;flex-direction:column!important;justify-content:center!important;overflow:hidden!important}
        .paid-ad-label{margin-bottom:5px!important;padding:2px 7px!important;background:#fff4df!important;color:var(--red-dark)!important;border:1px solid rgba(212,43,43,.14)!important;font-size:10px!important}
        .paid-ad-title{margin-bottom:5px!important;color:var(--ink)!important;font-size:13px!important;line-height:1.35!important;text-shadow:none!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
        .paid-ad-meta{gap:6px!important;color:var(--ink-light)!important;font-size:11px!important;white-space:nowrap!important;overflow:hidden!important}
        .paid-ad-cta{margin-top:6px!important;padding:4px 8px!important;background:#fff4df!important;color:var(--red-dark)!important;font-size:11px!important}
      }
      </style>
    `);
  }

  function patchHeader() {
    const badge = $('.brand-domain');
    if (badge) {
      const logo = badge.closest('a.logo');
      if (logo) logo.href = '/download';
      badge.textContent = '下载手机 APP';
      badge.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        location.href = '/download';
        return false;
      };
    }
  }

  function addMobileAuth() {
    if ($('.mobile-auth-shortcuts')) return;
    const header = $('.header-main');
    if (!header) return;
    header.insertAdjacentHTML('afterend', `
      <div class="mobile-auth-shortcuts">
        <a href="#" class="mobile-auth-link primary" onclick="openModal('login');return false;">登录</a>
        <a href="#" class="mobile-auth-link" onclick="openModal('register');return false;">注册</a>
        <a href="/feed/" class="mobile-auth-link primary">生活圈</a>
        <a href="#" class="mobile-auth-link primary" onclick="openModal('profile');return false;">我的信息</a>
        <a href="#" class="mobile-auth-link" onclick="openModal('post');return false;">＋ 发布信息</a>
      </div>
    `);
  }

  function removePublicAdminLinks(scope = document) {
    scope.querySelectorAll('a[href*="admin-hotads"], #todayHotDealsSection .section-title .see-all').forEach((link) => {
      if (/商家入口|admin-hotads/i.test(link.textContent || link.href || '')) link.remove();
    });
  }

  function ensureHotSection() {
    let section = $('#todayHotDealsSection');
    if (section) {
      removePublicAdminLinks(section);
      return section;
    }
    const target = $('#merchantFilterSection') || $('.merchant-filter-section') || $('#listingsGrid')?.closest('.section');
    if (!target) return null;
    target.insertAdjacentHTML('beforebegin', `
      <div class="section today-hot-section" id="todayHotDealsSection">
        <div class="section-title">
          <h3>今日热卖推荐</h3>
        </div>
        <div class="paid-ad-strip" id="paidAdStrip"></div>
      </div>
    `);
    section = $('#todayHotDealsSection');
    removePublicAdminLinks(section || document);
    return section;
  }

  function addHotNav() {
    const nav = $('.nav-cats');
    if (!nav || $('[href="#todayHotDealsSection"]')) return;
    const link = document.createElement('a');
    link.href = '#todayHotDealsSection';
    link.className = 'nav-cat';
    link.textContent = '🔥 今日热卖';
    link.onclick = (event) => {
      event.preventDefault();
      ensureHotSection()?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const first = nav.querySelector('.nav-cat');
    first ? first.after(link) : nav.prepend(link);
  }

  function addLifeCircleNav() {
    const nav = $('.nav-cats');
    if (!nav || nav.querySelector('a[href="/feed/"]')) return;
    const link = document.createElement('a');
    link.href = '/feed/';
    link.className = 'nav-cat';
    link.textContent = '生活圈🔥';
    const hot = nav.querySelector('a[href="#todayHotDealsSection"]');
    hot ? hot.after(link) : nav.prepend(link);
  }

  function patchMerchantAdCategory() {
    const select = $('#postCat');
    if (select && ![...select.options].some(option => option.value === '商家广告')) {
      const option = document.createElement('option');
      option.value = '商家广告';
      option.textContent = '🔥 商家广告/今日热卖';
      option.dataset.i18n = 'nav.merchantAd';
      const service = [...select.options].find(item => item.value === '服务');
      service ? service.before(option) : select.appendChild(option);
    }

    const editSelect = $('#editCat');
    if (editSelect && ![...editSelect.options].some(option => option.value === '商家广告')) {
      const option = document.createElement('option');
      option.value = '商家广告';
      option.textContent = '商家广告/今日热卖';
      const service = [...editSelect.options].find(item => item.value === '服务');
      service ? service.before(option) : editSelect.appendChild(option);
    }

    if (!window.__merchantAdCategoryPatched) {
      const oldIsMapCategory = window.isMapCategory;
      window.isMapCategory = (category) => clean(category) === '商家广告' || (typeof oldIsMapCategory === 'function' && oldIsMapCategory(category));
      window.__merchantAdCategoryPatched = true;
    }

    const applyMerchantPlaceholders = () => {
      const category = $('#postCat')?.value;
      if (category !== '商家广告') return;
      const title = $('#postTitle');
      const desc = $('#postDesc');
      const price = $('#postPrice');
      if (title) title.placeholder = '例如：Madrid 餐馆用品今日特价 / 新店开业优惠';
      if (desc) desc.placeholder = '写清楚优惠内容、适合客户、活动时间、地址和联系方式。';
      if (price) price.placeholder = '例如：面议 / 今日特价 / €99起';
    };
    if (select && !select.dataset.merchantAdBound) {
      select.addEventListener('change', () => setTimeout(applyMerchantPlaceholders, 0));
      select.dataset.merchantAdBound = '1';
    }
    applyMerchantPlaceholders();
  }

  function collectAds() {
    return $$('.listing-card').slice(0, 3).map((card) => ({
      type: 'customer',
      card,
      img: card.querySelector('img')?.src || '/assets/icons/wechat-share-logo-20260521.jpg',
      title: clean(card.querySelector('.listing-title')?.textContent) || '商家广告',
      city: clean(card.querySelector('.listing-loc')?.textContent) || '西班牙',
      price: clean(card.querySelector('.listing-price')?.textContent) || '面议'
    }));
  }

  async function loadConfiguredAds() {
    try {
      const response = await fetch('/api/share?id=__hot_ads', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.ok || result.value?.enabled === false) return [];
      const rows = Array.isArray(result.listings) ? result.listings : [];
      return rows.map(row => ({
        type: 'configured',
        id: row.id,
        img: (Array.isArray(row.images) && row.images[0]) || '/assets/icons/wechat-share-logo-20260521.jpg',
        title: row.title || '商家广告',
        city: row.city || '西班牙',
        price: row.price || '面议',
        rotateSeconds: Number(result.value?.rotateSeconds || 5)
      }));
    } catch (error) {
      return [];
    }
  }

  function dotsHtml() {
    if (slides.length < 2) return '';
    return '<div class="paid-ad-dots">' + slides.map((_, i) => `<span class="paid-ad-dot ${i === index ? 'active' : ''}"></span>`).join('') + '</div>';
  }

  function showAd() {
    const strip = $('#paidAdStrip');
    if (!strip || !slides.length) return;
    index %= slides.length;
    const slide = slides[index];
    if (slide.type === 'house') {
      strip.innerHTML = `
        <article class="paid-ad-card house-ad" onclick="openModal('post')">
          <div class="paid-ad-body">
            <div class="paid-ad-label">招商广告 · 广告位</div>
            <div class="paid-ad-title">今日热卖广告位招商</div>
            <div class="paid-ad-meta"><span>📍 全西班牙</span><span>商家可投放</span></div>
            <div class="paid-ad-cta">发布商家广告 →</div>
          </div>
        </article>${dotsHtml()}
      `;
      return;
    }
    strip.innerHTML = `
      <article class="paid-ad-card">
        <img src="${esc(slide.img)}" loading="lazy" alt="">
        <div class="paid-ad-body">
          <div class="paid-ad-label">广告 · 今日热卖</div>
          <div class="paid-ad-title">${esc(slide.title)}</div>
          <div class="paid-ad-meta"><span>${esc(slide.city)}</span><span>${esc(slide.price)}</span></div>
        </div>
      </article>${dotsHtml()}
    `;
    $('#paidAdStrip .paid-ad-card').onclick = () => {
      if (slide.type === 'configured' && slide.id) location.href = '/?listing=' + encodeURIComponent(slide.id);
      else slide.card?.click();
    };
  }

  async function startAds() {
    if (!ensureHotSection()) return;
    const configured = await loadConfiguredAds();
    slides = configured.length ? [...configured, { type: 'house' }] : [...collectAds(), { type: 'house' }];
    showAd();
    if (timer) clearInterval(timer);
    if (slides.length > 1) {
      const seconds = Number(slides[0]?.rotateSeconds || ROTATE_MS / 1000);
      const interval = ([3, 5, 10].includes(seconds) ? seconds : 5) * 1000;
      timer = setInterval(() => {
        index = (index + 1) % slides.length;
        showAd();
      }, interval);
    }
  }

  function patchLabels() {
    $$('[data-i18n="merchant.title"], .merchant-filter-section h3').forEach((item) => {
      if (/商家服务筛选|Servicios/.test(item.textContent || '')) item.textContent = '今日热卖';
    });
    $$('h3').forEach((item) => {
      if ((item.textContent || '').trim() === '今日热卖') item.textContent = '今日热卖推荐';
    });
  }

  function run() {
    ensureUniformAdCardStyle();
    patchHeader();
    addMobileAuth();
    addHotNav();
    addLifeCircleNav();
    patchMerchantAdCategory();
    patchLabels();
    removePublicAdminLinks();
    startAds();
  }

  run();
  document.addEventListener('DOMContentLoaded', run);
  setTimeout(run, 300);
  setTimeout(run, 1200);
  setTimeout(run, 3500);
})();
