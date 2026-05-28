const CACHE_NAME = 'espana-life-v27';

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
        if (url.origin === self.location.origin && !url.searchParams.has('swv')) {
          url.searchParams.set('swv', '27');
          await client.navigate(url.toString());
        }
      } catch (error) {}
    }
  })());
});

function injectHomePatch(html) {
  if (html.includes('homeHotAdsPatch20260528')) return html;
  const patch = `
<style id="homeHotAdsPatch20260528">
  .header-top{display:none!important}.header-main{background:#fff!important;border-bottom:1px solid rgba(158,28,28,.12)}.logo-text{color:var(--red-dark)!important}.logo-text span{color:var(--ink-light)!important}.brand-domain{background:#fff8e6!important;border:1px solid rgba(212,43,43,.22)!important;color:var(--red-dark)!important;box-shadow:none!important}.search-bar{border:1px solid rgba(158,28,28,.16);border-radius:7px;box-shadow:0 8px 22px rgba(80,34,15,.08)}.search-bar button{background:linear-gradient(180deg,#d92727 0%,#9e1c1c 100%)!important;color:#fff!important}.hero{background:#fff!important;padding:22px 16px!important;border-bottom:1px solid rgba(158,28,28,.1)}.hero:before,.hero:after{display:none!important}.nav-cats{background:rgba(255,255,255,.94)!important;gap:8px!important;padding:10px 14px!important;border-top:1px solid rgba(158,28,28,.08);border-bottom:1px solid rgba(158,28,28,.1);box-shadow:0 8px 22px rgba(80,34,15,.08)}.nav-cat{min-height:40px!important;padding:0 14px!important;border:1px solid rgba(158,28,28,.1)!important;border-radius:999px!important;background:linear-gradient(180deg,#fff 0%,#fff8ee 100%)!important;color:#6f1c16!important;font-size:14px!important;font-weight:850!important;box-shadow:0 5px 14px rgba(80,34,15,.08)!important}.nav-cat.active,.nav-cat:hover{background:linear-gradient(180deg,#fff6df 0%,#ffd36a 100%)!important;color:#5a160f!important;border-color:rgba(245,166,35,.78)!important}.mobile-auth-shortcuts{display:none}.mobile-auth-link{text-decoration:none;border:1px solid rgba(212,43,43,.2);background:#fff;color:var(--red-dark);border-radius:999px;padding:8px 12px;font-size:13px;font-weight:800;line-height:1;white-space:nowrap;box-shadow:0 4px 12px rgba(26,10,0,.05)}.mobile-auth-link.primary{background:var(--red);border-color:var(--red);color:#fff}.today-hot-section{background:linear-gradient(180deg,#fffaf2 0%,#fff 100%);border-top:1px solid #f4eadc;border-bottom:1px solid #f4eadc}.paid-ad-strip{display:block;margin:-8px 0 16px}.paid-ad-card{position:relative;min-height:118px;border:1px solid rgba(212,43,43,.18);border-radius:12px;overflow:hidden;background:#fff;color:var(--ink);cursor:pointer;box-shadow:0 8px 22px rgba(26,10,0,.08);animation:paidAdFade .28s ease}.paid-ad-card img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.paid-ad-card:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.68) 0%,rgba(0,0,0,.22) 58%,rgba(0,0,0,.06) 100%)}.paid-ad-card.house-ad{background:linear-gradient(135deg,#fff7e0 0%,#ffe3b3 45%,#fff 100%)}.paid-ad-card.house-ad:after{background:radial-gradient(circle at 88% 18%,rgba(245,166,35,.34) 0 18%,transparent 19%),linear-gradient(90deg,rgba(158,28,28,.88) 0%,rgba(212,43,43,.66) 46%,rgba(212,43,43,.08) 100%)}.paid-ad-body{position:relative;z-index:2;width:min(74%,360px);padding:14px;color:#fff}.paid-ad-label{display:inline-flex;width:fit-content;margin-bottom:8px;border-radius:999px;padding:4px 8px;background:rgba(255,255,255,.92);color:var(--red-dark);font-size:11px;font-weight:900}.paid-ad-title{font-size:16px;font-weight:900;line-height:1.35;margin-bottom:7px;text-shadow:0 2px 10px rgba(0,0,0,.34)}.paid-ad-meta{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:rgba(255,255,255,.88)}.paid-ad-cta{display:inline-flex;width:fit-content;margin-top:10px;border-radius:999px;padding:6px 10px;background:#fff;color:var(--red-dark);font-size:12px;font-weight:900}.paid-ad-dots{display:flex;justify-content:center;gap:5px;margin-top:8px}.paid-ad-dot{width:6px;height:6px;border-radius:999px;background:rgba(158,28,28,.24)}.paid-ad-dot.active{width:16px;background:var(--red)}@keyframes paidAdFade{from{opacity:.55;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}@media(max-width:760px){.mobile-auth-shortcuts{display:flex;gap:8px;padding:0 14px 10px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;border-bottom:1px solid rgba(212,43,43,.08)}.mobile-auth-shortcuts::-webkit-scrollbar{display:none}.mobile-auth-link{flex:0 0 auto;min-height:34px;display:inline-flex;align-items:center;justify-content:center}}
</style>
<script id="homeHotAdsPatchScript20260528">
(()=>{const R=180000;let slides=[],idx=0,timer=null;function q(s){return document.querySelector(s)}function qa(s){return[...document.querySelectorAll(s)]}function txt(v){return String(v||'').replace(/\s+/g,' ').trim()}function patchHeader(){const b=q('.brand-domain');if(b){const a=b.closest('a.logo');if(a)a.href='/download';b.textContent='下载手机 APP';b.onclick=e=>{e.preventDefault();e.stopPropagation();location.href='/download';return false}}qa('footer li').forEach(i=>{const t=i.textContent||'';if(t.includes('+34')||t.includes('WhatsApp'))i.remove()})}function mobileAuth(){if(q('.mobile-auth-shortcuts'))return;const h=q('.header-main');if(!h)return;h.insertAdjacentHTML('afterend','<div class="mobile-auth-shortcuts"><a href="#" class="mobile-auth-link primary" onclick="openModal(\'login\');return false;">登录</a><a href="#" class="mobile-auth-link" onclick="openModal(\'register\');return false;">注册</a><a href="#" class="mobile-auth-link primary" onclick="openModal(\'profile\');return false;">我的信息</a><a href="#" class="mobile-auth-link" onclick="openModal(\'post\');return false;">＋ 发布信息</a></div>')}function hotSection(){let s=q('#todayHotDealsSection');if(s)return s;const target=q('#merchantFilterSection')||q('.merchant-filter-section')||q('#listingsGrid')?.closest('.section');if(!target)return null;target.insertAdjacentHTML('beforebegin','<div class="section today-hot-section" id="todayHotDealsSection"><div class="section-title"><h3>今日热卖推荐</h3><a href="#" class="see-all" onclick="openModal(\'post\');return false;">商家入口 →</a></div><div class="paid-ad-strip" id="paidAdStrip"></div></div>');return q('#todayHotDealsSection')}function nav(){const n=q('.nav-cats');if(!n||q('[href="#todayHotDealsSection"]'))return;const a=document.createElement('a');a.href='#todayHotDealsSection';a.className='nav-cat';a.textContent='🔥 今日热卖';a.onclick=e=>{e.preventDefault();hotSection()?.scrollIntoView({behavior:'smooth',block:'start'})};(n.querySelector('.nav-cat')||n).after(a)}function hotOption(){['postCat','editCat'].forEach(id=>{const s=document.getElementById(id);if(s&&![...s.options].some(o=>o.value==='今日热卖')){const o=document.createElement('option');o.value='今日热卖';o.textContent=id==='postCat'?'🔥 今日热卖':'今日热卖';const b=[...s.options].find(x=>x.value==='生意');b?b.after(o):s.append(o)}})}function ads(){return qa('.listing-card').slice(0,3).map(card=>({type:'customer',card,img:card.querySelector('img')?.src||'/assets/icons/wechat-share-logo-20260521.jpg',title:txt(card.querySelector('.listing-title')?.textContent)||'商家广告',city:txt(card.querySelector('.listing-loc')?.textContent)||'西班牙',price:txt(card.querySelector('.listing-price')?.textContent)||'面议'}))}function dots(){return slides.length<2?'':'<div class="paid-ad-dots">'+slides.map((_,i)=>'<span class="paid-ad-dot '+(i===idx?'active':'')+'"></span>').join('')+'</div>'}function show(){const s=q('#paidAdStrip');if(!s||!slides.length)return;idx%=slides.length;const x=slides[idx];if(x.type==='house'){s.innerHTML='<article class="paid-ad-card house-ad" onclick="openModal(\'post\')"><div class="paid-ad-body"><div class="paid-ad-label">招商广告 · 广告位</div><div class="paid-ad-title">今日热卖广告位招商</div><div class="paid-ad-meta"><span>📍 全西班牙</span><span>商家可投放</span></div><div class="paid-ad-cta">发布商家广告 →</div></div></article>'+dots();return}s.innerHTML='<article class="paid-ad-card"><img src="'+x.img+'" loading="lazy"><div class="paid-ad-body"><div class="paid-ad-label">广告 · 今日热卖</div><div class="paid-ad-title">'+x.title+'</div><div class="paid-ad-meta"><span>'+x.city+'</span><span>'+x.price+'</span></div></div></article>'+dots();q('#paidAdStrip .paid-ad-card').onclick=()=>x.card?.click()}function start(){if(!hotSection())return;slides=[...ads(),{type:'house'}];show();if(timer)clearInterval(timer);if(slides.length>1)timer=setInterval(()=>{idx=(idx+1)%slides.length;show()},R)}function labels(){qa('[data-i18n="merchant.title"],.merchant-filter-section h3').forEach(e=>{if(/商家服务筛选|Servicios/.test(e.textContent||''))e.textContent='今日热卖'});qa('h3').forEach(e=>{if((e.textContent||'').trim()==='今日热卖')e.textContent='今日热卖推荐'})}function run(){patchHeader();mobileAuth();nav();hotOption();labels();start()}run();document.addEventListener('DOMContentLoaded',run);setTimeout(run,300);setTimeout(run,1200);setTimeout(run,3500)})();
</script>`;
  return html.replace('</body>', patch + '\n</body>');
}

async function transformHomeResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;
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
  return new Response(injectHomePatch(html), { status: response.status, statusText: response.statusText, headers: response.headers });
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
  return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/') || url.pathname.startsWith('/s/') || url.hostname.includes('supabase.co')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request, { cache: 'no-store' }).then(async (response) => {
      if (url.pathname === '/' || url.pathname === '/index.html') return transformHomeResponse(response.clone());
      if (url.pathname === '/feed/' || url.pathname === '/feed/index.html') return transformFeedPageResponse(response.clone());
      return response;
    }).catch(() => fetch('/index.html', { cache: 'no-store' }).then((response) => transformHomeResponse(response))));
    return;
  }
  event.respondWith(fetch(request, { cache: 'no-store' }).catch(() => caches.match(request)));
});