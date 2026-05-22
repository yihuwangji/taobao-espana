const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Co4jbBX8M1I_fJCgoceoDA_PUTyhNta';
const DEFAULT_SITE_URL = 'https://espanalife.app';
const SITE_NAME = '西班牙生活通';
const IMPORTED_MERCHANT_MARK = '平台代登记商家信息';

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

module.exports = async function handler(req, res) {
  const siteUrl = getRequestSiteUrl(req);
  const siteLogoUrl = `${siteUrl}/assets/icons/wechat-share-logo-20260521.jpg`;
  const id = compact(req.query.id);
  const numericId = id.match(/^\d+$/) ? id : '';
  let listing = null;

  if (numericId) {
    const params = new URLSearchParams({
      select: 'id,title,description,category,city,price,address,created_at,user_id',
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
<meta property="og:image" content="${escapeHTML(siteLogoUrl)}">
<meta property="og:image:secure_url" content="${escapeHTML(siteLogoUrl)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="300">
<meta property="og:image:height" content="300">
<meta property="og:url" content="${escapeHTML(shareUrl)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHTML(pageTitle)}">
<meta name="twitter:description" content="${escapeHTML(description)}">
<meta name="twitter:image" content="${escapeHTML(siteLogoUrl)}">
<link rel="image_src" href="${escapeHTML(siteLogoUrl)}">
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
  <img src="${escapeHTML(siteLogoUrl)}" alt="${escapeHTML(SITE_NAME)}">
  <h1>${escapeHTML(pageTitle)}</h1>
  <p>${escapeHTML(description)}</p>
  <a id="open-detail-btn" href="${escapeHTML(targetUrl)}" target="_self" rel="noopener">打开查看详情</a>
  <p class="hint">微信里请点上方按钮查看详情；如果没有跳转，请复制链接到浏览器打开。</p>
</main>
</body>
</html>`);
};
