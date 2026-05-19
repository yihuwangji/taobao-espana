const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Co4jbBX8M1I_fJCgoceoDA_PUTyhNta';
const SITE_URL = 'https://taobao-espana.vercel.app';

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

module.exports = async function handler(req, res) {
  const id = compact(req.query.id);
  const numericId = id.match(/^\d+$/) ? id : '';
  let listing = null;

  if (numericId) {
    const params = new URLSearchParams({
      select: 'id,title,description,category,city,price,created_at',
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
    }
  }

  const title = listing ? `${compact(listing.title)} - 西班牙生活通` : '西班牙生活通 - 华人本地信息';
  const description = listing
    ? [listing.category, listing.city, listing.price ? `${listing.price} €` : '面议', compact(listing.description).slice(0, 70)].filter(Boolean).join(' · ')
    : '面向西班牙华人社区的招工、租房、生意转让、二手和生活服务信息平台。';
  const targetUrl = `${SITE_URL}/?listing=${encodeURIComponent(numericId || '')}`;
  const shareUrl = numericId ? `${SITE_URL}/s/${encodeURIComponent(numericId)}` : SITE_URL;
  const imageUrl = `${SITE_URL}/assets/icons/icon-512.png`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send(`<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHTML(title)}</title>
<meta name="description" content="${escapeHTML(description)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="西班牙生活通">
<meta property="og:title" content="${escapeHTML(title)}">
<meta property="og:description" content="${escapeHTML(description)}">
<meta property="og:image" content="${escapeHTML(imageUrl)}">
<meta property="og:url" content="${escapeHTML(shareUrl)}">
<meta name="theme-color" content="#D42B2B">
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff8ed;color:#2b1b12;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif}
.card{width:min(92vw,420px);background:white;border:1px solid #f0d2a7;border-radius:10px;padding:22px;box-shadow:0 12px 34px rgba(116,57,20,.14)}
img{width:64px;height:64px;border-radius:16px;margin-bottom:12px}
h1{font-size:20px;line-height:1.35;margin:0 0 10px}
p{font-size:14px;color:#6f5a4b;line-height:1.65;margin:0 0 16px}
a{display:flex;align-items:center;justify-content:center;min-height:44px;border-radius:8px;background:#d42b2b;color:white;text-decoration:none;font-weight:800}
</style>
</head>
<body>
<main class="card">
  <img src="${escapeHTML(imageUrl)}" alt="">
  <h1>${escapeHTML(title)}</h1>
  <p>${escapeHTML(description)}</p>
  <a href="${escapeHTML(targetUrl)}">打开查看详情</a>
</main>
<script>
setTimeout(function(){ location.replace(${JSON.stringify(targetUrl)}); }, 700);
</script>
</body>
</html>`);
};
