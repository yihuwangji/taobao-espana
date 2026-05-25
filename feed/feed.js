const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Co4jbBX8M1I_fJCgoceoDA_PUTyhNta';
const FEED_MEDIA_BUCKET = 'feed-media';
const MAX_IMAGES = 9;
const MAX_VIDEO_SECONDS = 30;
const BLOCKED_KEYWORDS = [
  '赌博', '博彩', '赌场', '色情', '约炮', '援交', '诈骗', '骗钱', '杀猪盘',
  '仇恨', '纳粹', '假货', '高仿', 'a货', '侵权', '刷屏', '傻逼', '去死'
];

const sb = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let currentUser = null;
let selectedMedia = [];
let allPosts = [];
let activeSort = 'latest';
let searchTerm = '';
let likedIds = new Set(JSON.parse(localStorage.getItem('feedLikedIds') || '[]'));
let savedIds = new Set(JSON.parse(localStorage.getItem('feedSavedIds') || '[]'));
const localComments = JSON.parse(localStorage.getItem('feedLocalComments') || '{}');
let activeCommentPost = null;
let activeCommentButton = null;

const fallbackPosts = [
  {
    id: 'demo-1',
    user_id: null,
    title: '马德里饰品新品到仓',
    description: '一批夏季发夹、手机挂绳、包包配件刚到仓，适合百元店和礼品店。整箱走货，Madrid 可自提。',
    city: 'Madrid',
    whatsapp: '+34600000001',
    category: '新品到仓',
    tags: ['新品', '饰品', '批发'],
    is_anonymous: false,
    like_count: 38,
    comment_count: 6,
    save_count: 14,
    created_at: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
    feed_media: [{ media_type: 'image', url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80', thumbnail_url: null }]
  },
  {
    id: 'demo-2',
    user_id: null,
    title: '清仓特价',
    description: 'Valencia 仓库清一批餐馆用品，托盘、收纳盒、打包袋都有，适合餐馆和外卖店。',
    city: 'Valencia',
    whatsapp: '+34600000002',
    category: '清仓特价',
    tags: ['今日热卖', '清仓', '餐馆用品'],
    is_anonymous: true,
    like_count: 21,
    comment_count: 3,
    save_count: 9,
    created_at: new Date(Date.now() - 1000 * 60 * 80).toISOString(),
    feed_media: [{ media_type: 'image', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80', thumbnail_url: null }]
  },
  {
    id: 'demo-3',
    user_id: null,
    title: '开店经验',
    description: '这两个月客流变慢，橱窗上新品不要一次铺满，分三次上架反而更容易让老客回来看看。',
    city: 'Barcelona',
    whatsapp: '+34600000003',
    category: '生意经验',
    tags: ['生意经验', '店铺运营'],
    is_anonymous: false,
    like_count: 55,
    comment_count: 12,
    save_count: 22,
    created_at: new Date(Date.now() - 1000 * 60 * 220).toISOString(),
    feed_media: [{ media_type: 'image', url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=900&q=80', thumbnail_url: null }]
  }
];

function escapeHTML(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function showToast(message) {
  const toast = document.getElementById('feedToast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function normalizeTags(raw) {
  if (Array.isArray(raw)) return raw.map(tag => String(tag).replace(/^#/, '').trim()).filter(Boolean);
  return String(raw || '')
    .split(/[\s,，#]+/)
    .map(tag => tag.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 8);
}

function hasBlockedContent(...values) {
  const text = values.join(' ').toLowerCase();
  return BLOCKED_KEYWORDS.some(word => text.includes(word.toLowerCase()));
}

function getDisplayName(post) {
  if (post.is_anonymous) return '匿名华商';
  return post.profiles?.nickname || post.author_name || '华商用户';
}

function timeAgo(iso) {
  const diff = Math.max(1, Date.now() - new Date(iso || Date.now()).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

function saveLocalSets() {
  localStorage.setItem('feedLikedIds', JSON.stringify([...likedIds]));
  localStorage.setItem('feedSavedIds', JSON.stringify([...savedIds]));
  localStorage.setItem('feedLocalComments', JSON.stringify(localComments));
}

async function initUser() {
  if (!sb) return;
  const timeout = new Promise(resolve => {
    setTimeout(() => resolve({ data: { user: null }, error: { message: 'auth timeout' } }), 1200);
  });
  const { data } = await Promise.race([sb.auth.getUser(), timeout]);
  currentUser = data?.user || null;
}

async function loadPosts() {
  if (!sb) {
    allPosts = fallbackPosts;
    renderPosts();
    return;
  }
  const feedQuery = sb
    .from('feed_posts')
    .select('*, feed_media(*)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(80);
  const timeout = new Promise(resolve => {
    setTimeout(() => resolve({ data: null, error: { message: 'feed timeout' } }), 2500);
  });
  const { data, error } = await Promise.race([feedQuery, timeout]);

  if (error) {
    allPosts = fallbackPosts;
    showToast('淘商圈数据表未就绪，先显示示例动态');
  } else {
    allPosts = data?.length ? data : fallbackPosts;
  }
  renderPosts();
}

function filteredPosts() {
  const keyword = searchTerm.trim().toLowerCase();
  let posts = allPosts.filter(post => {
    const tags = normalizeTags(post.tags);
    const inSearch = !keyword || [
      post.description, post.title, post.city, post.whatsapp, post.category, tags.join(' ')
    ].join(' ').toLowerCase().includes(keyword);
    return inSearch;
  });

  if (activeSort === 'nearby') {
    const city = localStorage.getItem('feedCityHint') || document.getElementById('feedCity')?.value || '';
    if (city.trim()) posts = posts.filter(post => String(post.city || '').toLowerCase().includes(city.trim().toLowerCase()));
  }
  if (activeSort === 'new') {
    posts = posts.filter(post => post.category === '新品到仓' || normalizeTags(post.tags).some(tag => tag.includes('新品')));
  }
  posts.sort((a, b) => {
    const heatA = (a.like_count || 0) + (a.comment_count || 0) + (a.save_count || 0);
    const heatB = (b.like_count || 0) + (b.comment_count || 0) + (b.save_count || 0);
    if (activeSort === 'hot') return heatB - heatA;
    if (activeSort === 'today') {
      const ageA = (Date.now() - new Date(a.created_at).getTime()) / 3600000;
      const ageB = (Date.now() - new Date(b.created_at).getTime()) / 3600000;
      return (heatB / Math.max(1, ageB)) - (heatA / Math.max(1, ageA));
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return posts;
}

function renderPosts() {
  const grid = document.getElementById('feedGrid');
  const template = document.getElementById('feedCardTemplate');
  const posts = filteredPosts();
  grid.innerHTML = '';
  if (!posts.length) {
    grid.innerHTML = '<div class="empty-state">暂时没有符合条件的动态，换个分类看看。</div>';
    return;
  }

  posts.forEach(post => {
    const card = template.content.firstElementChild.cloneNode(true);
    const mediaButton = card.querySelector('.media-button');
    const media = [...(post.feed_media || post.media || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))[0];
    if (media?.media_type === 'video') {
      mediaButton.innerHTML = `<video src="${escapeHTML(media.url)}" poster="${escapeHTML(media.thumbnail_url || '')}" muted playsinline preload="metadata"></video>`;
      mediaButton.addEventListener('click', () => {
        const video = mediaButton.querySelector('video');
        if (video.paused) video.play();
        else video.pause();
      });
    } else if (media?.url) {
      mediaButton.innerHTML = `<img src="${escapeHTML(media.thumbnail_url || media.url)}" alt="${escapeHTML(post.description || post.title || '淘商圈动态')}" loading="lazy">`;
    } else {
      mediaButton.innerHTML = `<div class="media-placeholder">${escapeHTML(post.category || '淘商圈')}</div>`;
    }
    const burstHeart = document.createElement('span');
    burstHeart.className = 'burst-heart';
    burstHeart.textContent = '♥';
    mediaButton.appendChild(burstHeart);

    const tags = normalizeTags(post.tags);
    card.querySelector('.card-desc').textContent = post.description || post.title || '淘商圈动态';
    card.querySelector('.tag-list').innerHTML = tags.map(tag => `<span>#${escapeHTML(tag)}</span>`).join('');
    card.querySelector('.author').textContent = getDisplayName(post);
    card.querySelector('.city').textContent = `📍 ${post.city || '西班牙'}`;
    card.querySelector('.time').textContent = timeAgo(post.created_at);

    const likeBtn = card.querySelector('[data-action="like"]');
    const commentBtn = card.querySelector('[data-action="comment"]');
    const saveBtn = card.querySelector('[data-action="save"]');
    const shareBtn = card.querySelector('[data-action="share"]');
    const reportBtn = card.querySelector('[data-action="report"]');
    const postId = String(post.id);
    const extraComments = localComments[postId] || [];
    likeBtn.querySelector('.action-count').textContent = post.like_count || 0;
    commentBtn.querySelector('.action-count').textContent = (post.comment_count || 0) + extraComments.length;
    saveBtn.querySelector('.action-count').textContent = post.save_count || 0;
    likeBtn.classList.toggle('active', likedIds.has(postId));
    likeBtn.querySelector('.action-icon').textContent = likedIds.has(postId) ? '♥' : '♡';
    saveBtn.classList.toggle('active', savedIds.has(postId));
    saveBtn.querySelector('.action-icon').textContent = savedIds.has(postId) ? '★' : '☆';

    likeBtn.onclick = () => toggleReaction(post, 'like', likeBtn);
    let lastMediaTap = 0;
    card.addEventListener('dblclick', event => {
      if (event.target.closest('button, a, input, label')) return;
      event.preventDefault();
      likeFromMedia(post, likeBtn, burstHeart);
    });
    card.addEventListener('touchend', event => {
      if (event.target.closest('button, a, input, label')) return;
      const now = Date.now();
      if (now - lastMediaTap < 320) {
        event.preventDefault();
        likeFromMedia(post, likeBtn, burstHeart);
      }
      lastMediaTap = now;
    }, { passive: false });
    saveBtn.onclick = () => toggleReaction(post, 'save', saveBtn);
    commentBtn.onclick = () => openCommentDrawer(post, commentBtn);
    shareBtn.onclick = () => sharePost(post);
    reportBtn.onclick = () => reportPost(post);

    const wa = String(post.whatsapp || '').replace(/[^\d+]/g, '');
    const whatsapp = card.querySelector('.whatsapp-btn');
    whatsapp.href = wa ? `https://wa.me/${wa.replace(/^\+/, '')}` : '#';
    whatsapp.addEventListener('click', event => {
      if (!wa) {
        event.preventDefault();
        showToast('这条动态没有填写 WhatsApp');
      }
    });

    grid.appendChild(card);
  });
}

async function toggleReaction(post, type, button) {
  const postId = String(post.id);
  const isLike = type === 'like';
  const set = isLike ? likedIds : savedIds;
  const table = isLike ? 'feed_likes' : 'feed_saves';
  const countKey = isLike ? 'like_count' : 'save_count';
  const active = set.has(postId);
  if (active) {
    set.delete(postId);
    post[countKey] = Math.max(0, (post[countKey] || 0) - 1);
  } else {
    set.add(postId);
    post[countKey] = (post[countKey] || 0) + 1;
  }
  saveLocalSets();
  button.classList.toggle('active', !active);
  button.querySelector('.action-count').textContent = post[countKey] || 0;
  const icon = button.querySelector('.action-icon');
  if (icon && isLike) icon.textContent = active ? '♡' : '♥';
  if (icon && !isLike) icon.textContent = active ? '☆' : '★';

  if (!sb || String(post.id).startsWith('demo-')) return;
  const session = (await sb.auth.getSession()).data.session;
  if (!session) {
    showToast('已在本机记录；登录后可同步到账号');
    return;
  }
  if (active) {
    await sb.from(table).delete().eq('post_id', post.id).eq('user_id', session.user.id);
  } else {
    await sb.from(table).upsert({ post_id: post.id, user_id: session.user.id }, { onConflict: 'post_id,user_id' });
  }
}

function animateBurstHeart(burstHeart) {
  burstHeart.classList.remove('show');
  void burstHeart.offsetWidth;
  burstHeart.classList.add('show');
}

function likeFromMedia(post, likeBtn, burstHeart) {
  animateBurstHeart(burstHeart);
  if (!likedIds.has(String(post.id))) {
    toggleReaction(post, 'like', likeBtn);
  }
}

async function fetchPostComments(post) {
  if (!sb || String(post.id).startsWith('demo-')) return [];
  const timeout = new Promise(resolve => {
    setTimeout(() => resolve({ data: [], error: { message: 'comments timeout' } }), 1800);
  });
  const query = sb
    .from('feed_comments')
    .select('id, body, is_anonymous, created_at')
    .eq('post_id', post.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(80);
  const { data, error } = await Promise.race([query, timeout]);
  if (error) return [];
  return (data || []).map(comment => ({
    author: comment.is_anonymous ? '匿名华商' : '华商用户',
    body: comment.body,
    created_at: comment.created_at
  }));
}

function renderDrawerComments(comments) {
  const list = document.getElementById('drawerComments');
  if (!comments.length) {
    list.innerHTML = '<div class="drawer-empty">还没有评论，来坐第一排。</div>';
    return;
  }
  list.innerHTML = comments.map(comment => (
    `<div class="drawer-comment-item">
      <strong>${escapeHTML(comment.author)}</strong>
      <p>${escapeHTML(comment.body)}</p>
      <span>${comment.created_at ? timeAgo(comment.created_at) : '刚刚'}</span>
    </div>`
  )).join('');
}

async function openCommentDrawer(post, button) {
  activeCommentPost = post;
  activeCommentButton = button;
  const drawer = document.getElementById('commentDrawer');
  const title = document.getElementById('commentDrawerTitle');
  const input = document.getElementById('drawerCommentInput');
  const postId = String(post.id);
  title.textContent = `评论 ${(post.comment_count || 0) + (localComments[postId]?.length || 0)}`;
  document.getElementById('drawerComments').innerHTML = '<div class="drawer-empty">加载评论中…</div>';
  input.value = '';
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  setTimeout(() => input.focus(), 120);
  const remoteComments = await fetchPostComments(post);
  renderDrawerComments([...(localComments[postId] || []), ...remoteComments]);
}

function closeCommentDrawer() {
  const drawer = document.getElementById('commentDrawer');
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  activeCommentPost = null;
  activeCommentButton = null;
}

async function submitDrawerComment() {
  if (!activeCommentPost) return;
  const input = document.getElementById('drawerCommentInput');
  const anonymous = document.getElementById('drawerAnonymousComment');
  const body = input.value.trim();
  if (!body) return;
  if (hasBlockedContent(body)) {
    showToast('评论包含违规关键词，请修改后再发布');
    return;
  }

  const post = activeCommentPost;
  const postId = String(post.id);
  const comment = {
    author: anonymous.checked ? '匿名华商' : '华商用户',
    body,
    created_at: new Date().toISOString()
  };
  localComments[postId] = [comment, ...(localComments[postId] || [])];
  post.comment_count = (post.comment_count || 0) + 1;
  saveLocalSets();
  input.value = '';
  renderDrawerComments(localComments[postId]);
  if (activeCommentButton) {
    activeCommentButton.querySelector('.action-count').textContent = post.comment_count || 0;
  }

  if (!sb || String(post.id).startsWith('demo-')) return;
  const session = (await sb.auth.getSession()).data.session;
  if (!session) {
    showToast('已在本机记录；登录后可同步评论');
    return;
  }
  await sb.from('feed_comments').insert({
    post_id: post.id,
    user_id: session.user.id,
    body,
    is_anonymous: anonymous.checked,
    status: 'approved'
  });
}

async function sharePost(post) {
  const url = `${location.origin}/feed/#post-${post.id}`;
  const text = `${post.category || '淘商圈'}：${post.description || post.title || ''}`;
  if (navigator.share) {
    await navigator.share({ title: '西班牙生活通淘商圈', text, url }).catch(() => {});
  } else {
    await navigator.clipboard.writeText(url).catch(() => {});
    showToast('分享链接已复制');
  }
}

function reportPost(post) {
  const reports = JSON.parse(localStorage.getItem('feedReports') || '[]');
  reports.push({
    post_id: post.id,
    reason: '用户举报',
    created_at: new Date().toISOString()
  });
  localStorage.setItem('feedReports', JSON.stringify(reports.slice(-100)));
  showToast('已收到举报，我们会按内容规则处理');
}

function bindFilters() {
  document.getElementById('feedSearchInput').addEventListener('input', event => {
    searchTerm = event.target.value;
    renderPosts();
  });
  document.getElementById('feedSortTabs').addEventListener('click', event => {
    const button = event.target.closest('button[data-sort]');
    if (!button) return;
    activeSort = button.dataset.sort;
    document.querySelectorAll('#feedSortTabs button').forEach(item => item.classList.toggle('active', item === button));
    if (activeSort === 'nearby') {
      const city = document.getElementById('feedCity')?.value || localStorage.getItem('feedCityHint') || '';
      if (!city) showToast('附近会按你发布表单中的城市筛选，可先填写城市');
    }
    renderPosts();
  });
}

function openCompose() {
  document.getElementById('feedCompose').classList.add('open');
  document.getElementById('feedCompose').setAttribute('aria-hidden', 'false');
}

function closeCompose() {
  document.getElementById('feedCompose').classList.remove('open');
  document.getElementById('feedCompose').setAttribute('aria-hidden', 'true');
}

function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration || 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法读取视频时长'));
    };
    video.src = url;
  });
}

async function handleMediaInput(event) {
  const files = [...event.target.files];
  const videos = files.filter(file => file.type.startsWith('video/'));
  const images = files.filter(file => file.type.startsWith('image/'));
  if (videos.length && images.length) {
    showToast('一次动态请选择图片或视频，不要混传');
    event.target.value = '';
    selectedMedia = [];
    renderMediaPreview();
    return;
  }
  if (videos.length > 1) {
    showToast('视频最多上传1个');
    event.target.value = '';
    selectedMedia = [];
    renderMediaPreview();
    return;
  }
  if (images.length > MAX_IMAGES) {
    showToast('图片最多9张，已保留前9张');
  }
  if (videos.length) {
    const duration = await getVideoDuration(videos[0]).catch(() => 999);
    if (duration > MAX_VIDEO_SECONDS) {
      showToast('视频不能超过30秒');
      event.target.value = '';
      selectedMedia = [];
      renderMediaPreview();
      return;
    }
    selectedMedia = [{ file: videos[0], media_type: 'video', duration_seconds: Math.round(duration) }];
  } else {
    selectedMedia = images.slice(0, MAX_IMAGES).map(file => ({ file, media_type: 'image', duration_seconds: null }));
  }
  renderMediaPreview();
}

function renderMediaPreview() {
  const preview = document.getElementById('mediaPreview');
  preview.innerHTML = '';
  selectedMedia.forEach(item => {
    const url = URL.createObjectURL(item.file);
    const element = item.media_type === 'video' ? document.createElement('video') : document.createElement('img');
    element.src = url;
    if (item.media_type === 'video') {
      element.muted = true;
      element.playsInline = true;
      element.controls = true;
    }
    element.onload = element.onloadeddata = () => URL.revokeObjectURL(url);
    preview.appendChild(element);
  });
}

async function uploadMedia(postId) {
  if (!sb || !selectedMedia.length || String(postId).startsWith('local-')) return selectedMedia.map((item, index) => ({
    post_id: postId,
    media_type: item.media_type,
    url: URL.createObjectURL(item.file),
    thumbnail_url: null,
    duration_seconds: item.duration_seconds,
    sort_order: index
  }));

  const session = (await sb.auth.getSession()).data.session;
  const owner = session?.user?.id || 'guest';
  const rows = [];
  for (let index = 0; index < selectedMedia.length; index += 1) {
    const item = selectedMedia[index];
    const ext = (item.file.name.split('.').pop() || (item.media_type === 'video' ? 'mp4' : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${owner}/${postId}/${Date.now()}-${index}.${ext}`;
    const { error } = await sb.storage.from(FEED_MEDIA_BUCKET).upload(path, item.file, {
      cacheControl: '31536000',
      upsert: false,
      contentType: item.file.type
    });
    if (error) throw error;
    const { data } = sb.storage.from(FEED_MEDIA_BUCKET).getPublicUrl(path);
    rows.push({
      post_id: postId,
      media_type: item.media_type,
      url: data.publicUrl,
      thumbnail_url: item.media_type === 'image' ? data.publicUrl : null,
      duration_seconds: item.duration_seconds,
      sort_order: index
    });
  }
  return rows;
}

async function submitPost(event) {
  event.preventDefault();
  const description = document.getElementById('feedDescription').value.trim();
  const city = document.getElementById('feedCity').value.trim();
  const whatsapp = document.getElementById('feedWhatsapp').value.trim();
  const tags = normalizeTags(document.getElementById('feedTags').value);
  const category = document.getElementById('feedCategory').value;
  const isAnonymous = document.getElementById('feedAnonymous').checked;

  if (!description) return showToast('请填写简短描述');
  if (!city) return showToast('请填写城市');
  if (!whatsapp) return showToast('请填写 WhatsApp');
  if (!selectedMedia.length) return showToast('请至少上传1张图片或1个视频');
  if (hasBlockedContent(description, city, whatsapp, tags.join(' '), category)) {
    return showToast('内容包含违规关键词，请修改后再发布');
  }

  localStorage.setItem('feedCityHint', city);
  const btn = document.getElementById('feedSubmitBtn');
  btn.disabled = true;
  btn.textContent = '发布中…';
  try {
    let post;
    if (sb) {
      const session = (await sb.auth.getSession()).data.session;
      if (!session) {
        showToast('请先登录后发布，后台需要保存真实 user_id');
        btn.disabled = false;
        btn.textContent = '发布动态';
        return;
      }
      const { data, error } = await sb.from('feed_posts').insert({
        user_id: session.user.id,
        title: description.slice(0, 40),
        description,
        city,
        whatsapp,
        category,
        tags,
        is_anonymous: isAnonymous,
        status: 'approved'
      }).select().single();
      if (error) throw error;
      const mediaRows = await uploadMedia(data.id);
      if (mediaRows.length) {
        const mediaInsert = await sb.from('feed_media').insert(mediaRows).select();
        if (mediaInsert.error) throw mediaInsert.error;
        data.feed_media = mediaInsert.data;
      }
      post = data;
    } else {
      post = {
        id: `local-${Date.now()}`,
        description,
        city,
        whatsapp,
        category,
        tags,
        is_anonymous: isAnonymous,
        status: 'approved',
        like_count: 0,
        comment_count: 0,
        save_count: 0,
        created_at: new Date().toISOString(),
        feed_media: await uploadMedia(`local-${Date.now()}`)
      };
    }
    allPosts = [post, ...allPosts];
    document.getElementById('feedPostForm').reset();
    selectedMedia = [];
    renderMediaPreview();
    closeCompose();
    renderPosts();
    showToast('发布成功');
  } catch (error) {
    showToast(`发布失败：${error.message || '请稍后再试'}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '发布动态';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('[data-open-publish]').forEach(button => button.addEventListener('click', openCompose));
  document.querySelector('[data-close-publish]').addEventListener('click', closeCompose);
  document.getElementById('feedCompose').addEventListener('click', event => {
    if (event.target.id === 'feedCompose') closeCompose();
  });
  document.getElementById('commentDrawer').addEventListener('click', event => {
    if (event.target.id === 'commentDrawer') closeCommentDrawer();
  });
  document.getElementById('closeCommentDrawer').addEventListener('click', closeCommentDrawer);
  document.getElementById('drawerCommentSend').addEventListener('click', submitDrawerComment);
  document.getElementById('drawerCommentInput').addEventListener('keydown', event => {
    if (event.key === 'Enter') submitDrawerComment();
  });
  document.getElementById('feedMediaInput').addEventListener('change', handleMediaInput);
  document.getElementById('feedPostForm').addEventListener('submit', submitPost);
  bindFilters();
  await initUser();
  await loadPosts();
});
