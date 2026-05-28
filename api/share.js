const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Co4jbBX8M1I_fJCgoceoDA_PUTyhNta';
const DEFAULT_SITE_URL = 'https://espanalife.app';
const SITE_NAME = '西班牙生活通';
const IMPORTED_MERCHANT_MARK = '平台代登记商家信息';

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

async function serviceFetch(path, options = {}) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

async function recordPageView(req, res) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { ok: false, error: 'missing_service_role' });
  }
  const body = parseBody(req);
  if (body.action !== 'record_page_view') {
    return json(res, 400, { ok: false, error: 'invalid_action' });
  }
  const listingId = String(body.listingId || '').trim();
  if (!/^\d+$/.test(listingId)) {
    return json(res, 400, { ok: false, error: 'invalid_listing_id' });
  }
  const viewerIp = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
    .split(',')[0]
    .trim()
    .slice(0, 80);

  const response = await serviceFetch('/rest/v1/page_views', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ listing_id: Number(listingId), viewer_ip: viewerIp || null })
  });
  if (!response.ok) {
    return json(res, 400, { ok: false, error: 'record_failed', message: await response.text() });
  }
  return json(res, 200, { ok: true });
}

function getRequestSiteUrl(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!host) return DEFAULT_SITE_URL;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim() || 'https';
  return `${proto}://${host}`.replace(/\/+$/, '');
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function compact(value, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim();
}

function displayCategory(listing) {
  return listing
    && listing.user_id === null
    && String(listing.description || '').includes(IMPORTED_MERCHANT_MARK)
    ? '商家黄页'
    : listing?.category;
}

function listingDescription(listing) {
  if (!listing) {
    return `${SITE_NAME} · 西班牙华人招工、租房、生意转让、二手和生活服务信息平台。`;
  }
  return [
    SITE_NAME,
    displayCategory(listing),
    listing.city,
    listing.price ? `${listing.price}${String(listing.price).includes('€') ? '' : ' €'}` : '面议',
    compact(listing.description).slice(0, 70)
  ].filter(Boolean).join(' · ');
}

function firstListingImage(listing) {
  const images = Array.isArray(listing?.images) ? listing.images : [];
  return images.find(url => /^https?:\/\//i.test(String(url || ''))) || '';
}

function homepagePatchMarkup() {
  return `
<style id="homeDirectPatch20260528">
.header-top{display:none!important}.header-main{background:#fff!important;border-bottom:1px solid rgba(158,28,28,.12)!important}.logo-text{color:var(--red-dark)!important}.logo-text span{color:var(--ink-light)!important}.brand-domain{background:#fff8e6!important;border:1px solid rgba(212,43,43,.22)!important;color:var(--red-dark)!important;box-shadow:none!important}.search-bar{border:1px solid rgba(158,28,28,.16);border-radius:7px;box-shadow:0 8px 22px rgba(80,34,15,.08)}.search-bar button{background:linear-gradient(180deg,#d92727 0%,#9e1c1c 100%)!important;color:#fff!important}.nav-cats{background:rgba(255,255,255,.94)!important;gap:8px!important;padding:10px 14px!important;border-top:1px solid rgba(158,28,28,.08);border-bottom:1px solid rgba(158,28,28,.1);box-shadow:0 8px 22px rgba(80,34,15,.08)}.nav-cat{min-height:40px!important;padding:0 14px!important;border:1px solid rgba(158,28,28,.1)!important;border-radius:999px!important;background:linear-gradient(180deg,#fff 0%,#fff8ee 100%)!important;color:#6f1c16!important;font-size:14px!important;font-weight:850!important;box-shadow:0 5px 14px rgba(80,34,15,.08)!important}.nav-cat.active,.nav-cat:hover{background:linear-gradient(180deg,#fff6df 0%,#ffd36a 100%)!important;color:#5a160f!important;border-color:rgba(245,166,35,.78)!important}.mobile-auth-shortcuts{display:none}.mobile-auth-link{text-decoration:none;border:1px solid rgba(212,43,43,.2);background:#fff;color:var(--red-dark);border-radius:999px;padding:8px 12px;font-size:13px;font-weight:800;line-height:1;white-space:nowrap;box-shadow:0 4px 12px rgba(26,10,0,.05)}.mobile-auth-link.primary{background:var(--red);border-color:var(--red);color:#fff}.today-hot-section{background:linear-gradient(180deg,#fffaf2 0%,#fff 100%);border-top:1px solid #f4eadc;border-bottom:1px solid #f4eadc}.paid-ad-strip{display:block;margin:-8px 0 16px}.paid-ad-card{position:relative;min-height:118px;border:1px solid rgba(212,43,43,.18);border-radius:12px;overflow:hidden;background:#fff;color:var(--ink);cursor:pointer;box-shadow:0 8px 22px rgba(26,10,0,.08)}.paid-ad-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.paid-ad-card:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.68) 0%,rgba(0,0,0,.22) 58%,rgba(0,0,0,.06) 100%)}.paid-ad-card.house-ad{background:linear-gradient(135deg,#fff7e0 0%,#ffe3b3 45%,#fff 100%)}.paid-ad-card.house-ad:after{background:linear-gradient(90deg,rgba(158,28,28,.88) 0%,rgba(212,43,43,.66) 46%,rgba(212,43,43,.08) 100%)}.paid-ad-body{position:relative;z-index:2;width:min(74%,360px);padding:14px;color:#fff}.paid-ad-label{display:inline-flex;width:fit-content;margin-bottom:8px;border-radius:999px;padding:4px 8px;background:rgba(255,255,255,.92);color:var(--red-dark);font-size:11px;font-weight:900}.paid-ad-title{font-size:16px;font-weight:900;line-height:1.35;margin-bottom:7px;text-shadow:0 2px 10px rgba(0,0,0,.34)}.paid-ad-meta{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:rgba(255,255,255,.88)}.paid-ad-cta{display:inline-flex;width:fit-content;margin-top:10px;border-radius:999px;padding:6px 10px;background:#fff;color:var(--red-dark);font-size:12px;font-weight:900}.paid-ad-dots{display:flex;justify-content:center;gap:5px;margin-top:8px}.paid-ad-dot{width:6px;height:6px;border-radius:999px;background:rgba(158,28,28,.24)}.paid-ad-dot.active{width:16px;background:var(--red)}@media(max-width:760px){.mobile-auth-shortcuts{display:flex;gap:8px;padding:0 14px 10px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;border-bottom:1px solid rgba(212,43,43,.08)}.mobile-auth-shortcuts::-webkit-scrollbar{display:none}.mobile-auth-link{flex:0 0 auto;min-height:34px;display:inline-flex;align-items:center;justify-content:center}}
</style>
<script src="/home-patch.js?v=20260528-3" defer></script>`;
}

function injectHomepagePatch(html) {
  if (html.includes('homeDirectPatch20260528')) return html;
  return html.replace('</body>', `${homepagePatchMarkup()}\n</body>`);
}

async function serveHomepage(req, res) {
  const siteUrl = getRequestSiteUrl(req);
  const response = await fetch(`${siteUrl}/index.html?raw_home=1`, { cache: 'no-store' });
  let html = await response.text();
  html = html
    .replaceAll('淘商圈', '生活圈')
    .replace('<a href="#" class="logo">', '<a href="/download" class="logo">')
    .replace('<span class="brand-domain">espanalife.app</span>', '<span class="brand-domain">下载手机 APP</span>')
    .replaceAll('老王跟小宋工作室', '欧桥开放平台')
    .replaceAll('Wang & Song Studio', 'EuroBridge Open Platform')
    .replace(/\s*<li>\s*<a[^>]*id="footerWhatsapp"[^>]*>[\s\S]*?<\/a>\s*<\/li>/g, '')
    .replace(/\s*<li>\s*📱\s*\+34\s*<\/li>/g, '')
    .replace("whatsapp: '+34 ',", "whatsapp: '',");

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).send(injectHomepagePatch(html));
}

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    return recordPageView(req, res);
  }

  const id = compact(req.query.id);
  if (id === '__home') {
    return serveHomepage(req, res);
  }

  const siteUrl = getRequestSiteUrl(req);
  const siteLogoUrl = `${siteUrl}/assets/icons/wechat-share-logo-20260521.jpg`;
  const numericId = id.match(/^\d+$/) ? id : '';
  let listing = null;

  if (numericId) {
    const params = new URLSearchParams({
      select: 'id,title,description,category,city,price,address,images,created_at,user_id',
      id: `eq.${numericId}`,
      status: 'eq.approved',
      limit: '1'
    });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/listings?${params.toString()}`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
      }
    });
    if (response.ok) {
      const rows = await response.json();
      listing = rows[0] || null;
      if (listing?.address) {
        listing.description = `${listing.address} ${listing.description || ''}`.trim();
      }
    }
  }

  const pageTitle = listing
    ? `${SITE_NAME}｜${compact(listing.title)}`
    : `${SITE_NAME}｜西班牙华人生活服务平台`;
  const description = listingDescription(listing);
  const shareImageUrl = firstListingImage(listing) || siteLogoUrl;
  const targetUrl = numericId ? `${siteUrl}/?listing=${encodeURIComponent(numericId)}` : siteUrl;
  const shareUrl = numericId ? `${siteUrl}/s/${encodeURIComponent(numericId)}` : siteUrl;
  const ogType = numericId ? 'article' : 'website';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send(`<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHTML(pageTitle)}</title>
<meta name="description" content="${escapeHTML(description)}">
<meta property="og:type" content="${escapeHTML(ogType)}">
<meta property="og:site_name" content="${escapeHTML(SITE_NAME)}">
<meta property="og:title" content="${escapeHTML(pageTitle)}">
<meta property="og:description" content="${escapeHTML(description)}">
<meta property="og:image" content="${escapeHTML(shareImageUrl)}">
<meta property="og:image:secure_url" content="${escapeHTML(shareImageUrl)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="300">
<meta property="og:image:height" content="300">
<meta property="og:url" content="${escapeHTML(shareUrl)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHTML(pageTitle)}">
<meta name="twitter:description" content="${escapeHTML(description)}">
<meta name="twitter:image" content="${escapeHTML(shareImageUrl)}">
<link rel="image_src" href="${escapeHTML(shareImageUrl)}">
<link rel="canonical" href="${escapeHTML(targetUrl)}">
<meta name="theme-color" content="#D42B2B">
<script>
window.__TARGET_URL__ = ${JSON.stringify(targetUrl)};
function openTarget() {
  window.location.href = window.__TARGET_URL__;
}
if (!/MicroMessenger/i.test(navigator.userAgent)) {
  setTimeout(openTarget, 350);
}
document.addEventListener('DOMContentLoaded', function () {
  var btn = document.getElementById('open-detail-btn');
  if (btn) btn.addEventListener('click', openTarget);
});
</script>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff8ed;color:#2b1b12;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif}
.card{width:min(92vw,420px);background:white;border:1px solid #f0d2a7;border-radius:10px;padding:22px;box-shadow:0 12px 34px rgba(116,57,20,.14)}
img{width:76px;height:76px;border-radius:18px;margin-bottom:12px;object-fit:cover}
h1{font-size:20px;line-height:1.35;margin:0 0 10px}
p{font-size:14px;color:#6f5a4b;line-height:1.65;margin:0 0 16px}
.site{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:900;color:#9e1c1c;margin-bottom:12px}
.site img{width:34px;height:34px;border-radius:8px;margin:0}
.hint{font-size:12px;color:#8a7564;margin-top:10px;text-align:center}
a,button{display:flex;align-items:center;justify-content:center;width:100%;min-height:44px;border:0;border-radius:8px;background:#d42b2b;color:white;text-decoration:none;font-weight:800;font-size:15px;font-family:inherit}
</style>
</head>
<body>
<main class="card">
  <div class="site"><img src="${escapeHTML(siteLogoUrl)}" alt="">${escapeHTML(SITE_NAME)}</div>
  <img src="${escapeHTML(shareImageUrl)}" alt="${escapeHTML(SITE_NAME)}">
  <h1>${escapeHTML(pageTitle)}</h1>
  <p>${escapeHTML(description)}</p>
  <a id="open-detail-btn" href="${escapeHTML(targetUrl)}" target="_self" rel="noopener">打开查看详情</a>
  <p class="hint">微信里可点右上角 ... 分享到朋友圈；也可点上方按钮查看详情。</p>
</main>
</body>
</html>`);
};