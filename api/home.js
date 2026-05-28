function cssPatch() {
  return `
<style id="homeDirectPatch20260528">
.header-top{display:none!important}.header-main{background:#fff!important;border-bottom:1px solid rgba(158,28,28,.12)!important}.logo-text{color:var(--red-dark)!important}.logo-text span{color:var(--ink-light)!important}.brand-domain{background:#fff8e6!important;border:1px solid rgba(212,43,43,.22)!important;color:var(--red-dark)!important;box-shadow:none!important}.search-bar{border:1px solid rgba(158,28,28,.16);border-radius:7px;box-shadow:0 8px 22px rgba(80,34,15,.08)}.search-bar button{background:linear-gradient(180deg,#d92727 0%,#9e1c1c 100%)!important;color:#fff!important}.hero{background:#fff!important;padding:22px 16px!important;border-bottom:1px solid rgba(158,28,28,.1)}.hero:before,.hero:after{display:none!important}.nav-cats{background:rgba(255,255,255,.94)!important;gap:8px!important;padding:10px 14px!important;border-top:1px solid rgba(158,28,28,.08);border-bottom:1px solid rgba(158,28,28,.1);box-shadow:0 8px 22px rgba(80,34,15,.08)}.nav-cat{min-height:40px!important;padding:0 14px!important;border:1px solid rgba(158,28,28,.1)!important;border-radius:999px!important;background:linear-gradient(180deg,#fff 0%,#fff8ee 100%)!important;color:#6f1c16!important;font-size:14px!important;font-weight:850!important;box-shadow:0 5px 14px rgba(80,34,15,.08)!important}.nav-cat.active,.nav-cat:hover{background:linear-gradient(180deg,#fff6df 0%,#ffd36a 100%)!important;color:#5a160f!important;border-color:rgba(245,166,35,.78)!important}.mobile-auth-shortcuts{display:none}.mobile-auth-link{text-decoration:none;border:1px solid rgba(212,43,43,.2);background:#fff;color:var(--red-dark);border-radius:999px;padding:8px 12px;font-size:13px;font-weight:800;line-height:1;white-space:nowrap;box-shadow:0 4px 12px rgba(26,10,0,.05)}.mobile-auth-link.primary{background:var(--red);border-color:var(--red);color:#fff}.today-hot-section{background:linear-gradient(180deg,#fffaf2 0%,#fff 100%);border-top:1px solid #f4eadc;border-bottom:1px solid #f4eadc}.paid-ad-strip{display:block;margin:-8px 0 16px}.paid-ad-card{position:relative;min-height:118px;border:1px solid rgba(212,43,43,.18);border-radius:12px;overflow:hidden;background:#fff;color:var(--ink);cursor:pointer;box-shadow:0 8px 22px rgba(26,10,0,.08)}.paid-ad-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.paid-ad-card:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.68) 0%,rgba(0,0,0,.22) 58%,rgba(0,0,0,.06) 100%)}.paid-ad-card.house-ad{background:linear-gradient(135deg,#fff7e0 0%,#ffe3b3 45%,#fff 100%)}.paid-ad-card.house-ad:after{background:radial-gradient(circle at 88% 18%,rgba(245,166,35,.34) 0 18%,transparent 19%),linear-gradient(90deg,rgba(158,28,28,.88) 0%,rgba(212,43,43,.66) 46%,rgba(212,43,43,.08) 100%)}.paid-ad-body{position:relative;z-index:2;width:min(74%,360px);padding:14px;color:#fff}.paid-ad-label{display:inline-flex;width:fit-content;margin-bottom:8px;border-radius:999px;padding:4px 8px;background:rgba(255,255,255,.92);color:var(--red-dark);font-size:11px;font-weight:900}.paid-ad-title{font-size:16px;font-weight:900;line-height:1.35;margin-bottom:7px;text-shadow:0 2px 10px rgba(0,0,0,.34)}.paid-ad-meta{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:rgba(255,255,255,.88)}.paid-ad-cta{display:inline-flex;width:fit-content;margin-top:10px;border-radius:999px;padding:6px 10px;background:#fff;color:var(--red-dark);font-size:12px;font-weight:900}.paid-ad-dots{display:flex;justify-content:center;gap:5px;margin-top:8px}.paid-ad-dot{width:6px;height:6px;border-radius:999px;background:rgba(158,28,28,.24)}.paid-ad-dot.active{width:16px;background:var(--red)}@media(max-width:760px){.mobile-auth-shortcuts{display:flex;gap:8px;padding:0 14px 10px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;border-bottom:1px solid rgba(212,43,43,.08)}.mobile-auth-shortcuts::-webkit-scrollbar{display:none}.mobile-auth-link{flex:0 0 auto;min-height:34px;display:inline-flex;align-items:center;justify-content:center}}
</style>
<script src="/home-patch.js?v=20260528-2" defer></script>`;
}

function injectHomePatch(html) {
  if (html.includes('homeDirectPatch20260528')) return html;
  return html.replace('</body>', cssPatch() + '\n</body>');
}

module.exports = async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'espanalife.app';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const response = await fetch(`${protocol}://${host}/index.html?raw_home=1`, { cache: 'no-store' });
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
  res.status(200).send(injectHomePatch(html));
};
