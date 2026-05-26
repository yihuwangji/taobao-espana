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

  if (!html.includes('manualLifeListingsPatch')) {
    html = html.replace('</body>', `
<script>
(() => {
  const manualLifeListingsPatch = true;
  const manualListing = {
    id: 900001,
    cat: 'merchant',
    city: 'Valencia',
    icon: '🏪',
    badge: '商家',
    badgeType: 'gold',
    title: '方圆货架',
    price: '面议',
    address: 'Avinguda de la Cova, 67D, 46940 Manises, Valencia',
    description: 'Cuadrada, redonda y triangular S.L.，Manises 店铺设备与货架商家，Google 公开资料显示评分 4.8，主营货架和店铺装备。网站：equipatutienda.es。',
    isMerchant: true,
    images: ['https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=900&q=82'],
    unit: '',
    tags: ['商家黄页', 'Valencia'],
    time: '刚刚',
    contact: '961 54 60 19'
  };
  const mapUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(manualListing.address);
  function safe(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }
  function injectListing() {
    try {
      if (typeof allListings !== 'undefined' && Array.isArray(allListings) && !allListings.some(item => String(item.id) === String(manualListing.id) || item.title === manualListing.title)) {
        allListings.unshift(manualListing);
      }
    } catch (error) {}
  }
  function openManualDetail(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const detail = document.getElementById('detailContent');
    if (!detail || typeof openModal !== 'function') {
      location.href = '/feed/';
      return;
    }
    detail.innerHTML = '<div><div style="display:flex;align-items:center;gap:10px;margin-bottom:16px"><span style="font-size:36px">🏪</span><div><span style="background:#c0392b;color:#fff;font-size:11px;padding:2px 8px;border-radius:4px">商家黄页</span><h3 style="margin:6px 0 0;font-size:18px;color:#1a1a1a">方圆货架</h3></div></div><div class="detail-photo-grid"><img src="' + safe(manualListing.images[0]) + '" alt="方圆货架" loading="lazy"></div><div class="detail-map-card"><a class="detail-map-preview" href="' + safe(mapUrl) + '" target="_blank" rel="noopener"><div class="detail-map-body"><div class="detail-map-pin">📍</div><div><div class="detail-map-title">地图位置 / 导航</div><div class="detail-map-address">' + safe(manualListing.address) + '</div></div></div></a></div><div style="background:#fafafa;border-radius:8px;padding:14px;margin-bottom:14px"><div style="font-size:12px;color:#999;margin-bottom:6px;font-weight:600">详细描述</div><div style="font-size:14px;line-height:1.7;color:#333">' + safe(manualListing.description) + '</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px"><div style="background:#fef3f2;border-radius:8px;padding:12px 14px"><div style="font-size:11px;color:#999;margin-bottom:4px">价格</div><div style="font-size:16px;font-weight:700;color:#c0392b">面议</div></div><div style="background:#f0fdf4;border-radius:8px;padding:12px 14px"><div style="font-size:11px;color:#999;margin-bottom:4px">省份/地区</div><div style="font-size:15px;font-weight:600;color:#166534">Valencia</div></div></div><div style="background:#fffbeb;border:1.5px solid #fbbf24;border-radius:8px;padding:16px;margin-bottom:14px"><div style="font-size:12px;color:#92400e;margin-bottom:8px;font-weight:700">联系方式</div><div style="font-size:17px;font-weight:700;color:#1a1a1a;letter-spacing:1px">961 54 60 19</div><div style="font-size:11px;color:#999;margin-top:6px">联系时请说明来自西班牙生活通</div></div><div class="detail-actions"><a class="detail-action" href="' + safe(mapUrl) + '" target="_blank" rel="noopener" style="text-align:center;text-decoration:none">地图</a><button class="detail-action" onclick="copyText && copyText(\\'961 54 60 19\\').then(()=>showToast && showToast(\\'已复制\\'))">复制电话</button><a class="detail-action primary" href="http://equipatutienda.es/" target="_blank" rel="noopener" style="text-align:center;text-decoration:none">网站</a></div></div>';
    openModal('detail');
  }
  function patchDetail() {
    if (typeof viewListing === 'function' && !viewListing.manualLifeListingsPatch) {
      const originalViewListing = viewListing;
      viewListing = function patchedViewListing(id) {
        if (String(id) === String(manualListing.id)) return openManualDetail();
        return originalViewListing.apply(this, arguments);
      };
      viewListing.manualLifeListingsPatch = true;
      window.viewListing = viewListing;
    }
  }
  function patchRender() {
    injectListing();
    patchDetail();
    if (typeof renderListings === 'function' && !renderListings.manualLifeListingsPatch) {
      const originalRenderListings = renderListings;
      renderListings = function patchedRenderListings() {
        injectListing();
        return originalRenderListings.apply(this, arguments);
      };
      renderListings.manualLifeListingsPatch = true;
      window.renderListings = renderListings;
    }
    if (typeof renderListings === 'function') renderListings();
  }
  window.openManualFangyuanListing = openManualDetail;
  setTimeout(patchRender, 300);
  setTimeout(patchRender, 1500);
  setTimeout(patchRender, 3500);
})();
</script>
</body>`);
  }

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

async function transformFeedScriptResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('javascript')) return response;

  let js = await response.text();
  js = js
    .replaceAll('淘商圈', '生活圈')
    .replaceAll("title: 'Cuadrada, redonda y triangular S.L.'", "title: '方圆货架'")
    .replaceAll('Manises 店铺设备与货架商家，Google 公开资料显示评分 4.8，主营货架和店铺装备。网站：equipatutienda.es。', 'Cuadrada, redonda y triangular S.L.，Manises 店铺设备与货架商家，Google 公开资料显示评分 4.8，主营货架和店铺装备。网站：equipatutienda.es。')
    .replace("const MAX_VIDEO_SECONDS = 30;\n", '')
    .replace(`    const duration = await getVideoDuration(videos[0]).catch(() => 999);
    if (duration > MAX_VIDEO_SECONDS) {
      showToast('视频不能超过30秒');
      event.target.value = '';
      selectedMedia = [];
      renderMediaPreview();
      return;
    }
`, "    showToast('暂不支持视频，请上传图片');\n    event.target.value = '';\n    selectedMedia = [];\n    renderMediaPreview();\n    return;\n")
    .replace(`  if (videos.length) {
    const duration = await getVideoDuration(videos[0]).catch(() => 0);
    selectedMedia = [{ file: videos[0], media_type: 'video', duration_seconds: Math.round(duration) }];
  } else {
    selectedMedia = images.slice(0, MAX_IMAGES).map(file => ({ file, media_type: 'image', duration_seconds: null }));
  }
`, "  selectedMedia = images.slice(0, MAX_IMAGES).map(file => ({ file, media_type: 'image', duration_seconds: null }));\n")
    .replace(`  if (videos.length && images.length) {
    showToast('一次动态请选择图片或视频，不要混传');
    event.target.value = '';
    selectedMedia = [];
    renderMediaPreview();
    return;
  }
`, '')
    .replace(`  if (videos.length > 1) {
    showToast('视频最多上传1个');
    event.target.value = '';
    selectedMedia = [];
    renderMediaPreview();
    return;
  }
`, `  if (videos.length) {
    showToast('暂不支持视频，请上传图片');
    event.target.value = '';
    selectedMedia = [];
    renderMediaPreview();
    return;
  }
`)
    .replace("  if (!selectedMedia.length) return showToast('请至少上传1张图片或1个视频');", "  if (!selectedMedia.length) return showToast('请至少上传1张图片');");

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
  const manualTaoMerchants = [
    {
      id: '900001',
      title: '方圆货架',
      category: '商家黄页',
      city: 'Manises, Valencia',
      contact: '961 54 60 19',
      address: 'Avinguda de la Cova, 67D, 46940 Manises, Valencia',
      description: 'Cuadrada, redonda y triangular S.L.，Manises 店铺设备与货架商家，Google 公开资料显示评分 4.8，主营货架和店铺装备。网站：equipatutienda.es。',
      images: ['https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=900&q=82'],
      created_at: new Date().toISOString()
    }
  ];

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
    const seenTitles = new Set();
    const merchants = [...manualTaoMerchants, ...filteredMerchants()].filter(merchant => {
      const key = String(merchant.title || merchant.id || '').trim().toLowerCase();
      if (!key || seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });
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
