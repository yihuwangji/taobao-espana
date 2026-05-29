const CACHE_NAME = 'espana-life-v30-listings';

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
          url.searchParams.set('fresh', '30');
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

async function withUiPatch(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  let html = await response.text();
  if (!html.includes('langVisibilityFix20260529')) {
    html = html.replace('</head>', `
<style id="langVisibilityFix20260529">
  .header-main .header-lang.lang-switch {
    background: #fff8ec !important;
    border: 1px solid rgba(158,28,28,0.24) !important;
    box-shadow: 0 4px 12px rgba(80,34,15,0.08) !important;
  }

  .header-main .header-lang .lang-btn {
    color: #9e1c1c !important;
    font-weight: 900 !important;
    opacity: 1 !important;
  }

  .header-main .header-lang .lang-btn.active {
    background: #d92727 !important;
    color: #fff !important;
  }
</style>
<script id="listingCountRecovery20260529">
(() => {
  const MIN_EXPECTED_LISTINGS = 3;

  function countVisibleListings() {
    const grid = document.getElementById('listingsGrid');
    if (!grid) return null;
    return {
      grid,
      cards: grid.querySelectorAll('.listing-card').length,
      text: grid.textContent || ''
    };
  }

  function resetFilters() {
    try { if (typeof currentCat !== 'undefined') currentCat = 'all'; } catch (error) {}
    try { if (typeof currentCity !== 'undefined') currentCity = '全部'; } catch (error) {}
    try { if (typeof currentMerchant !== 'undefined') currentMerchant = ''; } catch (error) {}
    try { if (typeof currentSearch !== 'undefined') currentSearch = ''; } catch (error) {}
    try {
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.value = '';
    } catch (error) {}
  }

  function recoverListings() {
    const state = countVisibleListings();
    if (!state) return;

    const looksStuck = state.text.includes('加载中') || state.text.includes('Cargando');
    const tooFewListings = state.cards > 0 && state.cards < MIN_EXPECTED_LISTINGS;
    if (!looksStuck && !tooFewListings) return;

    resetFilters();
    try { if (typeof updateMerchantFilterUI === 'function') updateMerchantFilterUI(); } catch (error) {}
    try { if (typeof syncListingTitle === 'function') syncListingTitle(); } catch (error) {}
    try { if (typeof loadListings === 'function') loadListings(); } catch (error) {}
  }

  window.addEventListener('load', () => {
    setTimeout(recoverListings, 1800);
    setTimeout(recoverListings, 4200);
  });
})();
</script>
</head>`);
  }

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

  event.respondWith(
    fetch(request, { cache: 'no-store' })
      .then((response) => (request.mode === 'navigate' ? withUiPatch(response) : response))
      .catch(() => {
        if (request.mode === 'navigate') {
          return fetch('/index.html?offline_fallback=1', { cache: 'no-store' }).then(withUiPatch);
        }
        return caches.match(request);
      })
  );
});