(() => {
  const ROTATE_MS = 180000;
  let slides = [];
  let index = 0;
  let timer = null;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();

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

  function ensureHotSection() {
    let section = $('#todayHotDealsSection');
    if (section) return section;
    const target = $('#merchantFilterSection') || $('.merchant-filter-section') || $('#listingsGrid')?.closest('.section');
    if (!target) return null;
    target.insertAdjacentHTML('beforebegin', `
      <div class="section today-hot-section" id="todayHotDealsSection">
        <div class="section-title">
          <h3>今日热卖推荐</h3>
          <a href="#" class="see-all" onclick="openModal('post');return false;">商家入口 →</a>
        </div>
        <div class="paid-ad-strip" id="paidAdStrip"></div>
      </div>
    `);
    return $('#todayHotDealsSection');
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

  function addHotOption() {
    ['postCat', 'editCat'].forEach((id) => {
      const select = document.getElementById(id);
      if (!select || [...select.options].some((option) => option.value === '今日热卖')) return;
      const option = document.createElement('option');
      option.value = '今日热卖';
      option.textContent = id === 'postCat' ? '🔥 今日热卖' : '今日热卖';
      const business = [...select.options].find((item) => item.value === '生意');
      business ? business.after(option) : select.append(option);
    });
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
        <img src="${slide.img}" loading="lazy" alt="">
        <div class="paid-ad-body">
          <div class="paid-ad-label">广告 · 今日热卖</div>
          <div class="paid-ad-title">${slide.title}</div>
          <div class="paid-ad-meta"><span>${slide.city}</span><span>${slide.price}</span></div>
        </div>
      </article>${dotsHtml()}
    `;
    $('#paidAdStrip .paid-ad-card').onclick = () => slide.card?.click();
  }

  function startAds() {
    if (!ensureHotSection()) return;
    slides = [...collectAds(), { type: 'house' }];
    showAd();
    if (timer) clearInterval(timer);
    if (slides.length > 1) {
      timer = setInterval(() => {
        index = (index + 1) % slides.length;
        showAd();
      }, ROTATE_MS);
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
    patchHeader();
    addMobileAuth();
    addHotNav();
    addLifeCircleNav();
    addHotOption();
    patchLabels();
    startAds();
  }

  run();
  document.addEventListener('DOMContentLoaded', run);
  setTimeout(run, 300);
  setTimeout(run, 1200);
  setTimeout(run, 3500);
})();