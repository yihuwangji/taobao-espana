const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Co4jbBX8M1I_fJCgoceoDA_PUTyhNta';
const FEED_MEDIA_BUCKET = 'feed-media';
const FEED_DRAFT_KEY = 'oqFeedPostDraftV1';
const MAX_IMAGES = 9;
const MAX_VIDEO_SECONDS = 30;
const CHANNELS = ['推荐', '附近', '货源', '招工', '租房', '二手', '吐槽', '商家'];
const USER_FEED_CATEGORIES = ['货源', '招工', '租房', '二手', '吐槽', '商家', '生活'];
const LEGACY_FEED_CATEGORY_BY_UI = {
  货源: '货源动态',
  招工: '招工信息',
  租房: '生意经验',
  二手: '生意经验',
  吐槽: '华人吐槽',
  商家: '生意经验',
  生活: '生意经验'
};
const FEED_CATEGORY_LABELS = {
  货源动态: '货源',
  新品到仓: '货源',
  清仓特价: '货源',
  华人吐槽: '吐槽',
  生意经验: '生活',
  招工信息: '招工',
  店铺转让: '商家'
};
const BLOCKED_KEYWORDS = ['赌博', '博彩', '色情', '诈骗', '骗钱', '仇恨', '假货', '侵权', '刷屏', '人身攻击'];

const sb = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let currentUser = null;
let currentProfile = null;
let selectedMedia = [];
let allPosts = [];
let listingPosts = [];
let merchantPosts = [];
let activeChannel = '推荐';
let searchTerm = '';
let activePost = null;
let likedIds = new Set(JSON.parse(localStorage.getItem('oqLikedIds') || '[]'));
let savedIds = new Set(JSON.parse(localStorage.getItem('oqSavedIds') || '[]'));
let followedAuthors = new Set(JSON.parse(localStorage.getItem('oqFollowedAuthors') || '[]'));
let localComments = JSON.parse(localStorage.getItem('oqLocalComments') || '{}');

const fallbackPosts = [
  {
    id: 'demo-1',
    title: '马德里百元店新货到仓，适合零售和批发',
    description: '一批生活用品、礼品、小电器和季节货刚到，Madrid 可自提，也可以 WhatsApp 预约看货。',
    city: 'Madrid',
    whatsapp: '+34600000001',
    category: '货源',
    tags: ['货源', '百元店', '马德里'],
    is_anonymous: false,
    author_name: '欧圈货源',
    like_count: 86,
    comment_count: 12,
    save_count: 31,
    created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    feed_media: [{ media_type: 'image', url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=900&q=82' }]
  },
  {
    id: 'demo-2',
    title: 'Valencia 餐馆招熟手跑堂，可马上上班',
    description: '要求有居留，有餐馆经验，包吃。薪资面谈，感兴趣请 WhatsApp 联系。',
    city: 'Valencia',
    whatsapp: '+34600000002',
    category: '招工',
    tags: ['招工', '餐馆', 'Valencia'],
    is_anonymous: true,
    like_count: 51,
    comment_count: 7,
    save_count: 18,
    created_at: new Date(Date.now() - 1000 * 60 * 105).toISOString(),
    feed_media: [{ media_type: 'image', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=82' }]
  },
  {
    id: 'demo-3',
    title: 'Barcelona 单间出租，交通方便，适合学生或上班族',
    description: '近地铁，房间干净，水电网齐全。希望租客爱干净，不吵闹。',
    city: 'Barcelona',
    whatsapp: '+34600000003',
    category: '租房',
    tags: ['租房', 'Barcelona'],
    is_anonymous: false,
    author_name: '巴塞生活',
    like_count: 43,
    comment_count: 5,
    save_count: 24,
    created_at: new Date(Date.now() - 1000 * 60 * 170).toISOString(),
    feed_media: [{ media_type: 'image', url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=82' }]
  },
  {
    id: 'demo-4',
    title: '二手冰柜转让，状态好，适合小超市',
    description: '店里换设备，旧冰柜便宜出。可现场试机，需要自取。',
    city: 'Fuenlabrada',
    whatsapp: '+34600000004',
    category: '二手',
    tags: ['二手', '设备', 'Cobo Calleja'],
    is_anonymous: true,
    like_count: 27,
    comment_count: 4,
    save_count: 16,
    created_at: new Date(Date.now() - 1000 * 60 * 250).toISOString(),
    feed_media: [{ media_type: 'image', url: 'https://images.unsplash.com/photo-1581092921461-39b2f2b8a2f8?auto=format&fit=crop&w=900&q=82' }]
  },
  {
    id: 'demo-5',
    title: '在欧洲开店，最怕的不是没货，是不会持续曝光',
    description: '很多商家一开始只发一次广告，后面就没有声音。欧圈以后会更适合做长期内容和本地口碑。',
    city: 'Madrid',
    whatsapp: '',
    category: '吐槽',
    tags: ['吐槽', '开店', '经验'],
    is_anonymous: false,
    author_name: '老华商',
    like_count: 112,
    comment_count: 26,
    save_count: 49,
    created_at: new Date(Date.now() - 1000 * 60 * 390).toISOString(),
    feed_media: [{ media_type: 'image', url: 'https://images.unsplash.com/photo-1556745757-8d76bdb6984b?auto=format&fit=crop&w=900&q=82' }]
  }
];

const IMPORTED_MERCHANT_MARK = '平台代登记商家信息';
const LISTING_FEED_CATEGORY = {
  招工: '招工',
  求职: '招工',
  租房: '租房',
  二手物品: '二手',
  二手车: '二手',
  生意: '商家',
  商家广告: '商家',
  商家黄页: '商家',
  服务: '商家',
  教育: '商家'
};
const DEFAULT_WORKER_COVER = '/assets/feed/worker-service-bazaar-20260606.jpg';
const DEFAULT_SUPPLY_COVERS = [
  '/assets/feed/supply-wholesale-racks-20260606-1.jpg',
  '/assets/feed/supply-wholesale-racks-20260606-2.jpg',
  '/assets/feed/supply-wholesale-racks-20260606-3.jpg'
];
const DEFAULT_MERCHANT_COVERS = {
  fashion: [
    '/assets/feed/merchant-fashion-clothes-20260606-1.jpg',
    '/assets/feed/merchant-fashion-bags-20260606-2.jpg',
    '/assets/feed/merchant-fashion-shoes-bags-20260606-3.jpg'
  ],
  supply: DEFAULT_SUPPLY_COVERS
};
const MERCHANT_INDUSTRY_LABELS = {
  fashion: '服装箱包',
  supply: '货源批发'
};

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
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function getDraft() {
  try {
    return JSON.parse(localStorage.getItem(FEED_DRAFT_KEY) || 'null');
  } catch (error) {
    return null;
  }
}

function draftFormValues() {
  return {
    title: document.getElementById('feedTitle')?.value.trim() || '',
    description: document.getElementById('feedDescription')?.value.trim() || '',
    city: document.getElementById('feedCity')?.value || 'Madrid',
    whatsapp: document.getElementById('feedWhatsapp')?.value.trim() || '',
    category: document.getElementById('feedCategory')?.value || '货源',
    tags: document.getElementById('feedTags')?.value.trim() || '',
    isAnonymous: Boolean(document.getElementById('feedAnonymous')?.checked),
    hadMedia: selectedMedia.length > 0,
    savedAt: new Date().toISOString()
  };
}

function hasDraftableContent(values = draftFormValues()) {
  return Boolean(values.title || values.description || values.whatsapp || values.tags || selectedMedia.length);
}

function updateDraftNotice() {
  const notice = document.getElementById('feedDraftNotice');
  if (!notice) return;
  const draft = getDraft();
  notice.hidden = !draft;
  if (!draft) return;
  const time = document.getElementById('feedDraftTime');
  if (time) {
    const label = draft.savedAt ? `保存于 ${timeAgo(draft.savedAt)}` : '稍后可继续编辑';
    time.textContent = draft.hadMedia ? `${label}，图片/视频需重新选择` : label;
  }
}

function saveDraft() {
  const values = draftFormValues();
  if (!hasDraftableContent(values)) {
    showToast('先填写一点内容，再保存草稿');
    return;
  }
  localStorage.setItem(FEED_DRAFT_KEY, JSON.stringify(values));
  updateDraftNotice();
  showToast(values.hadMedia ? '草稿已保存，图片/视频稍后需重新选择' : '草稿已保存');
}

function restoreDraft() {
  const draft = getDraft();
  if (!draft) return showToast('暂无草稿');
  document.getElementById('feedTitle').value = draft.title || '';
  document.getElementById('feedDescription').value = draft.description || '';
  document.getElementById('feedCity').value = draft.city || 'Madrid';
  document.getElementById('feedWhatsapp').value = draft.whatsapp || '';
  document.getElementById('feedCategory').value = draft.category || '货源';
  document.getElementById('feedTags').value = draft.tags || '';
  document.getElementById('feedAnonymous').checked = Boolean(draft.isAnonymous);
  selectedMedia = [];
  const mediaInput = document.getElementById('feedMediaInput');
  if (mediaInput) mediaInput.value = '';
  renderMediaPreview();
  showToast(draft.hadMedia ? '草稿已恢复，请重新选择图片/视频' : '草稿已恢复');
}

function deleteDraft({ silent = false } = {}) {
  localStorage.removeItem(FEED_DRAFT_KEY);
  updateDraftNotice();
  if (!silent) showToast('草稿已删除');
}

function saveLocalState() {
  localStorage.setItem('oqLikedIds', JSON.stringify([...likedIds]));
  localStorage.setItem('oqSavedIds', JSON.stringify([...savedIds]));
  localStorage.setItem('oqFollowedAuthors', JSON.stringify([...followedAuthors]));
  localStorage.setItem('oqLocalComments', JSON.stringify(localComments));
}

function normalizeTags(raw) {
  if (Array.isArray(raw)) return raw.map(tag => String(tag).replace(/^#/, '').trim()).filter(Boolean).slice(0, 8);
  return String(raw || '')
    .split(/[\s,，#]+/)
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function ensureCategoryTag(tags, category) {
  const next = normalizeTags(tags);
  if (category && !next.includes(category)) next.unshift(category);
  return next.slice(0, 8);
}

function displayCategory(post) {
  const category = post?.category || '';
  if (USER_FEED_CATEGORIES.includes(category)) return category;
  const taggedCategory = normalizeTags(post?.tags).find(tag => USER_FEED_CATEGORIES.includes(tag));
  return taggedCategory || FEED_CATEGORY_LABELS[category] || category || '动态';
}

function legacyFeedCategory(category) {
  return LEGACY_FEED_CATEGORY_BY_UI[category] || category;
}

function isFeedCategoryConstraintError(error) {
  const text = [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(' ');
  return /feed_posts_category_check|category_check|23514/.test(text);
}

function getMedia(post) {
  return [...(post.feed_media || post.media || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
}

function titleOf(post) {
  return post.title || String(post.description || '欧圈动态').split(/\n/)[0].slice(0, 40) || '欧圈动态';
}

function authorOf(post) {
  if (post.is_anonymous) return '匿名用户';
  return post.profiles?.nickname || post.author_name || '欧圈用户';
}

function authorKey(post) {
  return post.user_id || post.author_name || authorOf(post);
}

function avatarText(name) {
  return String(name || '欧').trim().slice(0, 1).toUpperCase();
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

function isVideo(media) {
  return media?.media_type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(media?.url || '');
}

function randomHeight(post) {
  const seed = String(post.id || post.title || '').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return 190 + (seed % 115);
}

function hasBlockedContent(...values) {
  const text = values.join(' ').toLowerCase();
  return BLOCKED_KEYWORDS.some(word => text.includes(word.toLowerCase()));
}

function phoneForWhatsApp(value) {
  return String(value || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
}

function normalizePhone(value) {
  return String(value || '').trim().replace(/[^\d+]/g, '');
}

function phoneDigits(value) {
  return normalizePhone(value).replace(/\D/g, '');
}

function authEmailFromPhone(phone) {
  return `taobaoespana.${phoneDigits(phone)}@gmail.com`;
}

function authPasswordFromPin(pin) {
  return String(pin || '') + '#EspanaLife2026';
}

function isSyntheticAuthEmail(email) {
  return /^taobaoespana\.\d+@gmail\.com$/i.test(email || '');
}

function publicAccountLabel(email, phone) {
  if (phone) return phone;
  return isSyntheticAuthEmail(email) ? '手机号账号' : (email || '手机号账号');
}

function normalizeListingImages(raw) {
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch (error) {
      return raw.split(/[\n,]+/).map(item => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function extractPhone(value) {
  const text = String(value || '');
  const match = text.match(/(\+?\d[\d\s().-]{7,}\d)/);
  return match ? match[1].replace(/[^\d+]/g, '') : '';
}

function isSupplyLikeText(...values) {
  return /货源|批发|百元店|到仓|清仓|供应|mayorista|mayoreo|mayoristas|wholesale|bazar|multiprecio/i.test(values.join(' '));
}

function merchantIndustryFromText(...values) {
  const text = values.join(' ');
  if (/服装|衣服|女装|男装|童装|鞋|鞋子|包|箱包|手袋|行李箱|皮具|饰品|首饰|配饰|帽|袜|纺织|textil|ropa|moda|bolso|bolsos|bag|bags|maleta|maletas|calzado|zapato|zapatos|shoe|shoes|bisuter[ií]a|joyer|complement|accesor|fashion|sport/i.test(text)) {
    return 'fashion';
  }
  if (isSupplyLikeText(text)) return 'supply';
  return '';
}

function isGenericStockUrl(url) {
  return /images\.unsplash\.com/i.test(String(url || ''));
}

function stableNumber(value, min, max) {
  const text = String(value || '');
  const seed = text.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return min + (seed % Math.max(1, max - min + 1));
}

function defaultCoverForPost(post) {
  const category = displayCategory(post);
  if (category === '招工') return DEFAULT_WORKER_COVER;
  const industry = post?.merchant_industry || merchantIndustryFromText(post?.title, post?.description, normalizeTags(post?.tags).join(' '));
  const coverPool = DEFAULT_MERCHANT_COVERS[industry] || (category === '货源' ? DEFAULT_SUPPLY_COVERS : []);
  if (coverPool.length) {
    const index = stableNumber(`${post?.id || ''}|${post?.title || ''}|${post?.city || ''}`, 0, coverPool.length - 1);
    return coverPool[index];
  }
  return '';
}

function defaultCoverAlt(post) {
  const industry = post?.merchant_industry || merchantIndustryFromText(post?.title, post?.description, normalizeTags(post?.tags).join(' '));
  if (industry === 'fashion') return '服装箱包照片';
  const category = displayCategory(post);
  if (category === '货源') return '货源照片';
  if (category === '招工') return '招聘照片';
  return titleOf(post);
}

function shouldUseDefaultCover(post, mediaList) {
  const category = displayCategory(post);
  if (!mediaList.length) return Boolean(defaultCoverForPost(post));
  const industry = post?.merchant_industry || merchantIndustryFromText(post?.title, post?.description, normalizeTags(post?.tags).join(' '));
  if (industry || category === '货源') {
    return mediaList.every(item => isGenericStockUrl(item.thumbnail_url || item.url));
  }
  return false;
}

function isFeedPostId(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ''));
}

function isImportedMerchantListing(row) {
  const category = String(row?.category || '').trim();
  return category === '商家黄页' || String(row?.description || '').includes(IMPORTED_MERCHANT_MARK);
}

function listingFeedCategory(row) {
  const category = String(row?.category || '').trim();
  const text = `${row?.title || ''} ${row?.description || ''}`;
  if (isSupplyLikeText(text)) return '货源';
  return LISTING_FEED_CATEGORY[category] || '商家';
}

function listingToFeedPost(row) {
  const category = listingFeedCategory(row);
  const originalCategory = String(row?.category || '').trim();
  const images = normalizeListingImages(row.images);
  return {
    id: `listing-${row.id}`,
    source: 'listing',
    source_listing_id: row.id,
    title: row.title || '西班牙生活通信息',
    description: row.description || row.address || '来自西班牙生活通的同步信息',
    city: row.city || '西班牙',
    whatsapp: extractPhone(row.contact),
    category,
    tags: ensureCategoryTag([originalCategory, row.city, row.price].filter(Boolean), category),
    is_anonymous: !row.user_id,
    author_name: row.user_id ? '西班牙生活通用户' : '游客发布',
    like_count: stableNumber(`listing-${row.id}-like`, 12, 188),
    comment_count: stableNumber(`listing-${row.id}-comment`, 0, 16),
    save_count: stableNumber(`listing-${row.id}-save`, 5, 66),
    created_at: row.created_at,
    feed_media: images.map((url, index) => ({
      media_type: 'image',
      url,
      thumbnail_url: url,
      sort_order: index
    }))
  };
}

function allFeedItems() {
  return [...allPosts, ...listingPosts, ...merchantPosts];
}

async function initUser() {
  if (!sb) return;
  const timeout = new Promise(resolve => setTimeout(() => resolve({ data: { user: null } }), 1200));
  const { data } = await Promise.race([sb.auth.getUser(), timeout]);
  currentUser = data?.user || null;
}

async function loadCurrentProfile() {
  currentProfile = null;
  if (!sb || !currentUser?.id) return null;
  const query = sb
    .from('profiles')
    .select('nickname, phone, city')
    .eq('id', currentUser.id)
    .maybeSingle();
  const timeout = new Promise(resolve => setTimeout(() => resolve({ data: null }), 1500));
  const result = await Promise.race([query, timeout]).catch(() => ({ data: null }));
  currentProfile = result?.data || null;
  return currentProfile;
}

function setAuthMode(mode) {
  const nextMode = mode === 'register' ? 'register' : 'login';
  document.querySelectorAll('[data-auth-mode]').forEach(button => {
    button.classList.toggle('active', button.dataset.authMode === nextMode);
  });
  document.getElementById('feedLoginPane')?.classList.toggle('active', nextMode === 'login');
  document.getElementById('feedRegisterPane')?.classList.toggle('active', nextMode === 'register');
}

function updateFeedAuthUI() {
  const loggedIn = Boolean(currentUser);
  const authCard = document.getElementById('feedAuthCard');
  const accountCard = document.getElementById('feedAccountCard');
  if (authCard) authCard.hidden = loggedIn;
  if (accountCard) accountCard.hidden = !loggedIn;

  const nickname = currentProfile?.nickname || currentUser?.user_metadata?.nickname || '欧圈用户';
  const phone = currentProfile?.phone || currentUser?.user_metadata?.phone || '';
  const city = currentProfile?.city || currentUser?.user_metadata?.city || '西班牙';
  const meName = document.getElementById('meName');
  const meHint = document.getElementById('meHint');
  if (meName) meName.textContent = loggedIn ? nickname : '欧圈用户';
  if (meHint) {
    meHint.textContent = loggedIn
      ? '已登录，可以发布欧圈内容并同步账号互动。'
      : '登录主站账号后，可以同步发布、评论和互动记录。';
  }
  const accountPhone = document.getElementById('feedAccountPhone');
  const accountCity = document.getElementById('feedAccountCity');
  if (accountPhone) accountPhone.textContent = loggedIn ? publicAccountLabel(currentUser?.email, phone) : '手机号账号';
  if (accountCity) accountCity.textContent = city;
}

function setButtonLoading(button, loadingText) {
  if (!button) return () => {};
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = loadingText;
  return () => {
    button.disabled = false;
    button.textContent = originalText;
  };
}

async function loginFeedAccount() {
  if (!sb) return showToast('账号服务暂时不可用，请稍后再试');
  const phone = normalizePhone(document.getElementById('feedLoginPhone')?.value);
  const pin = String(document.getElementById('feedLoginPassword')?.value || '').trim();
  const digits = phoneDigits(phone);
  if (!phone || !pin) return showToast('请填写手机号和4位密码');
  if (digits.length < 6) return showToast('请填写正确的手机号');
  if (!/^\d{4}$/.test(pin)) return showToast('密码请输入4位数字');

  const restoreButton = setButtonLoading(document.getElementById('feedLoginBtn'), '登录中…');
  const { data, error } = await sb.auth.signInWithPassword({
    email: authEmailFromPhone(phone),
    password: authPasswordFromPin(pin)
  });
  restoreButton();
  if (error) return showToast('登录失败：手机号或密码不正确');
  currentUser = data?.user || null;
  await loadCurrentProfile();
  updateFeedAuthUI();
  showToast('欢迎回来，已登录欧圈');
}

async function registerFeedAccount() {
  if (!sb) return showToast('账号服务暂时不可用，请稍后再试');
  const nickname = String(document.getElementById('feedRegNickname')?.value || '').trim();
  const phone = normalizePhone(document.getElementById('feedRegPhone')?.value);
  const city = document.getElementById('feedRegCity')?.value || 'Madrid';
  const password = String(document.getElementById('feedRegPassword')?.value || '').trim();
  const confirmPassword = String(document.getElementById('feedRegPasswordConfirm')?.value || '').trim();
  const digits = phoneDigits(phone);
  if (!nickname || !phone || !password || !confirmPassword) return showToast('请填写昵称、手机号和密码');
  if (digits.length < 6) return showToast('请填写正确的手机号');
  if (!/^\d{4}$/.test(password)) return showToast('密码请设置为4位数字');
  if (password !== confirmPassword) return showToast('两次密码不一致');

  const restoreButton = setButtonLoading(document.getElementById('feedRegisterBtn'), '注册中…');
  try {
    const registerResponse = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, city, phone, password })
    });
    const registerData = await registerResponse.json().catch(() => ({}));
    if (!registerResponse.ok) {
      const message = registerData.error === 'missing_service_role'
        ? '注册服务正在配置，请联系客服处理'
        : (registerData.message || '请稍后再试');
      showToast(`注册失败：${message}`);
      return;
    }
    const { data, error } = await sb.auth.signInWithPassword({
      email: registerData.email || authEmailFromPhone(phone),
      password: authPasswordFromPin(password)
    });
    if (error) {
      showToast('账号已创建，请用手机号和4位密码登录');
      setAuthMode('login');
      return;
    }
    currentUser = data?.user || null;
    currentProfile = { nickname, phone, city };
    updateFeedAuthUI();
    showToast('注册成功，已自动登录欧圈');
  } catch (error) {
    showToast(`注册失败：${error.message || '请稍后再试'}`);
  } finally {
    restoreButton();
  }
}

async function logoutFeedAccount() {
  if (sb) await sb.auth.signOut().catch(() => null);
  currentUser = null;
  currentProfile = null;
  updateFeedAuthUI();
  showToast('已退出登录');
}

async function loadPosts() {
  if (!sb) {
    allPosts = fallbackPosts;
    renderPosts();
    return;
  }
  const query = sb
    .from('feed_posts')
    .select('*, feed_media(*)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(100);
  const timeout = new Promise(resolve => setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 2800));
  const { data, error } = await Promise.race([query, timeout]);
  allPosts = error || !data?.length ? fallbackPosts : data;
  renderPosts();
  openInitialPostFromHash();
}

async function loadListingsAsFeedPosts() {
  if (!sb) return;
  const query = sb
    .from('listings')
    .select('id,title,category,city,contact,address,description,images,price,created_at,user_id')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(140);
  const timeout = new Promise(resolve => setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 3000));
  const { data, error } = await Promise.race([query, timeout]);
  if (error || !data) return;
  listingPosts = data
    .filter(row => !isImportedMerchantListing(row))
    .map(listingToFeedPost);
  renderPosts();
  openInitialPostFromHash();
}

async function loadMerchants() {
  if (!sb) return;
  const query = sb
    .from('listings')
    .select('id,title,category,city,contact,address,description,images,created_at')
    .eq('status', 'approved')
    .or('category.eq.商家黄页,description.ilike.%平台代登记商家信息%')
    .order('created_at', { ascending: false })
    .limit(120);
  const timeout = new Promise(resolve => setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 2600));
  const { data, error } = await Promise.race([query, timeout]);
  if (error || !data?.length) return;
  merchantPosts = data.map(merchant => {
    const images = normalizeListingImages(merchant.images);
    const merchantIndustry = merchantIndustryFromText(merchant.title, merchant.description, merchant.address, merchant.category);
    const merchantKind = isSupplyLikeText(merchant.title, merchant.description, merchant.address, merchant.category) ? '货源' : '商家';
    const industryLabel = MERCHANT_INDUSTRY_LABELS[merchantIndustry] || '';
    return {
      id: `merchant-${merchant.id}`,
      source: 'merchant',
      source_listing_id: merchant.id,
      title: merchant.title || '商家资料',
      description: merchant.description || merchant.address || '欧圈商家资料',
      city: merchant.city || '西班牙',
      whatsapp: extractPhone(merchant.contact),
      category: merchantKind,
      merchant_industry: merchantIndustry,
      tags: [merchantKind, '商家', industryLabel, merchant.category || '黄页', merchant.city || '西班牙'].filter(Boolean),
      is_anonymous: false,
      author_name: '欧圈商家',
      like_count: stableNumber(merchant.id, 18, 168),
      comment_count: stableNumber(`${merchant.id}-c`, 0, 18),
      save_count: stableNumber(`${merchant.id}-s`, 6, 70),
      created_at: merchant.created_at,
      feed_media: images.map((url, index) => ({
        media_type: 'image',
        url,
        thumbnail_url: url,
        sort_order: index
      }))
    };
  });
  renderPosts();
}

function postMatchesChannel(post) {
  const text = [displayCategory(post), post.category, post.title, post.description, normalizeTags(post.tags).join(' ')].join(' ').toLowerCase();
  if (activeChannel === '推荐') return true;
  if (activeChannel === '附近') {
    const city = localStorage.getItem('oqCityHint') || '';
    return city ? String(post.city || '').toLowerCase().includes(city.toLowerCase()) : true;
  }
  const channel = activeChannel.toLowerCase();
  return text.includes(channel.toLowerCase());
}

function filteredPosts() {
  const keyword = searchTerm.trim().toLowerCase();
  return allFeedItems().filter(post => {
    const inChannel = postMatchesChannel(post);
    const inSearch = !keyword || [
      post.title, post.description, post.city, post.whatsapp, displayCategory(post), post.category, normalizeTags(post.tags).join(' ')
    ].join(' ').toLowerCase().includes(keyword);
    return inChannel && inSearch;
  }).sort((a, b) => {
    if (activeChannel === '推荐') {
      const heatA = (a.like_count || 0) * 2 + (a.comment_count || 0) + (a.save_count || 0);
      const heatB = (b.like_count || 0) * 2 + (b.comment_count || 0) + (b.save_count || 0);
      const dateA = new Date(a.created_at || 0).getTime() / 100000000000;
      const dateB = new Date(b.created_at || 0).getTime() / 100000000000;
      return (heatB + dateB) - (heatA + dateA);
    }
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
}

function renderPosts() {
  const grid = document.getElementById('feedGrid');
  const template = document.getElementById('feedCardTemplate');
  const posts = filteredPosts();
  grid.innerHTML = '';
  if (!posts.length) {
    grid.innerHTML = '<div class="empty-state">暂时没有相关内容，换个频道看看，或者发布第一条欧圈动态。</div>';
    return;
  }
  posts.forEach(post => {
    const card = template.content.firstElementChild.cloneNode(true);
    const mediaWrap = card.querySelector('.card-media');
    const mediaList = getMedia(post);
    const firstMedia = mediaList[0];
    const title = titleOf(post);
    const author = authorOf(post);
    const height = randomHeight(post);
    const defaultCover = defaultCoverForPost(post);
    const useDefaultCover = defaultCover && shouldUseDefaultCover(post, mediaList);
    if (!useDefaultCover && firstMedia?.url) {
      if (isVideo(firstMedia)) {
        mediaWrap.innerHTML = `<video src="${escapeHTML(firstMedia.url)}" poster="${escapeHTML(firstMedia.thumbnail_url || '')}" muted playsinline preload="metadata" style="height:${height}px"></video><span class="media-badge">视频</span>`;
      } else {
        mediaWrap.innerHTML = `<img src="${escapeHTML(firstMedia.thumbnail_url || firstMedia.url)}" alt="${escapeHTML(title)}" loading="lazy" style="height:${height}px">`;
      }
      if (mediaList.length > 1) mediaWrap.insertAdjacentHTML('beforeend', `<span class="media-badge">${mediaList.length}图</span>`);
    } else if (defaultCover) {
      mediaWrap.innerHTML = `<img class="default-feed-cover" src="${escapeHTML(defaultCover)}" alt="${escapeHTML(defaultCoverAlt(post))}" loading="lazy" style="height:${height}px">`;
    } else {
      mediaWrap.innerHTML = `<div class="placeholder-cover" style="height:${height}px">${escapeHTML(displayCategory(post) || '欧圈')}</div>`;
    }
    card.id = `post-${post.id}`;
    card.querySelector('h2').textContent = title;
    card.querySelector('.author').textContent = author;
    card.querySelector('.avatar').textContent = avatarText(author);
    card.querySelector('.city').textContent = post.city || '欧洲';
    card.querySelector('.like-count').textContent = `♡ ${post.like_count || 0}`;
    card.querySelector('.comment-count').textContent = `评论 ${(post.comment_count || 0) + (localComments[String(post.id)]?.length || 0)}`;
    mediaWrap.addEventListener('click', () => openDetail(post));
    card.querySelector('.card-copy').addEventListener('click', () => openDetail(post));
    grid.appendChild(card);
  });
}

function renderDetailMedia(post) {
  const media = getMedia(post);
  const wrap = document.getElementById('detailMedia');
  wrap.classList.toggle('multi', media.length > 1);
  const defaultCover = defaultCoverForPost(post);
  if (!media.length || (defaultCover && shouldUseDefaultCover(post, media))) {
    if (defaultCover) {
      wrap.innerHTML = `<img class="default-feed-cover" src="${escapeHTML(defaultCover)}" alt="${escapeHTML(defaultCoverAlt(post))}">`;
      return;
    }
    wrap.innerHTML = `<div class="placeholder-cover" style="height:330px">${escapeHTML(displayCategory(post) || '欧圈')}</div>`;
    return;
  }
  wrap.innerHTML = media.map(item => {
    if (isVideo(item)) {
      return `<video src="${escapeHTML(item.url)}" poster="${escapeHTML(item.thumbnail_url || '')}" controls playsinline></video>`;
    }
    return `<img src="${escapeHTML(item.url)}" alt="${escapeHTML(titleOf(post))}">`;
  }).join('');
}

async function openDetail(post) {
  activePost = post;
  const detail = document.getElementById('detailView');
  const author = authorOf(post);
  const postId = String(post.id);
  renderDetailMedia(post);
  document.getElementById('detailAvatar').textContent = avatarText(author);
  document.getElementById('detailAuthor').textContent = author;
  document.getElementById('detailMeta').textContent = `${post.city || '欧洲'} · ${displayCategory(post) || '动态'} · ${timeAgo(post.created_at)}`;
  document.getElementById('detailTitle').textContent = titleOf(post);
  document.getElementById('detailText').textContent = post.description || '';
  document.getElementById('detailTags').innerHTML = normalizeTags(post.tags).map(tag => `<span>#${escapeHTML(tag)}</span>`).join('');
  syncDetailActions();
  renderComments(await getAllComments(post));
  const wa = phoneForWhatsApp(post.whatsapp);
  const waLink = document.getElementById('detailWhatsapp');
  waLink.href = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(`你好，我在欧圈看到你发布的《${titleOf(post)}》，想了解一下。`)}` : '#';
  waLink.onclick = event => {
    if (!wa) {
      event.preventDefault();
      showToast('这条内容没有填写 WhatsApp');
    }
  };
  const follow = document.getElementById('detailFollow');
  follow.classList.toggle('following', followedAuthors.has(authorKey(post)));
  follow.textContent = followedAuthors.has(authorKey(post)) ? '已关注' : '关注';
  history.replaceState(null, '', `#post-${postId}`);
  detail.classList.add('open');
  detail.setAttribute('aria-hidden', 'false');
}

function closeDetail() {
  document.getElementById('detailView').classList.remove('open');
  document.getElementById('detailView').setAttribute('aria-hidden', 'true');
  activePost = null;
  if (location.hash.startsWith('#post-')) history.replaceState(null, '', location.pathname + location.search);
  renderPosts();
}

function syncDetailActions() {
  if (!activePost) return;
  const postId = String(activePost.id);
  const like = document.getElementById('detailLike');
  const save = document.getElementById('detailSave');
  like.classList.toggle('active', likedIds.has(postId));
  save.classList.toggle('active', savedIds.has(postId));
  like.innerHTML = `${likedIds.has(postId) ? '♥' : '♡'} <span>${activePost.like_count || 0}</span>`;
  save.innerHTML = `${savedIds.has(postId) ? '★' : '☆'} <span>${savedIds.has(postId) ? '已收藏' : '收藏'}</span>`;
  document.getElementById('detailComment').textContent = `评论 ${(activePost.comment_count || 0) + (localComments[postId]?.length || 0)}`;
}

async function toggleReaction(type) {
  if (!activePost) return;
  const postId = String(activePost.id);
  const isLike = type === 'like';
  const set = isLike ? likedIds : savedIds;
  const table = isLike ? 'feed_likes' : 'feed_saves';
  const countKey = isLike ? 'like_count' : 'save_count';
  const active = set.has(postId);
  if (active) {
    set.delete(postId);
    activePost[countKey] = Math.max(0, (activePost[countKey] || 0) - 1);
  } else {
    set.add(postId);
    activePost[countKey] = (activePost[countKey] || 0) + 1;
  }
  saveLocalState();
  syncDetailActions();
  if (!sb || !isFeedPostId(postId)) return;
  const session = (await sb.auth.getSession()).data.session;
  if (!session) return;
  if (active) await sb.from(table).delete().eq('post_id', activePost.id).eq('user_id', session.user.id);
  else await sb.from(table).upsert({ post_id: activePost.id, user_id: session.user.id }, { onConflict: 'post_id,user_id' });
}

function toggleFollow() {
  if (!activePost) return;
  const key = authorKey(activePost);
  if (followedAuthors.has(key)) followedAuthors.delete(key);
  else followedAuthors.add(key);
  saveLocalState();
  const follow = document.getElementById('detailFollow');
  follow.classList.toggle('following', followedAuthors.has(key));
  follow.textContent = followedAuthors.has(key) ? '已关注' : '关注';
  showToast(followedAuthors.has(key) ? '已关注' : '已取消关注');
}

async function getRemoteComments(post) {
  if (!sb || !isFeedPostId(post.id)) return [];
  const query = sb
    .from('feed_comments')
    .select('id, body, is_anonymous, created_at')
    .eq('post_id', post.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(60);
  const timeout = new Promise(resolve => setTimeout(() => resolve({ data: [] }), 1800));
  const { data } = await Promise.race([query, timeout]);
  return (data || []).map(comment => ({
    author: comment.is_anonymous ? '匿名用户' : '欧圈用户',
    body: comment.body,
    created_at: comment.created_at
  }));
}

async function getAllComments(post) {
  return [...(localComments[String(post.id)] || []), ...(await getRemoteComments(post))];
}

function renderComments(comments) {
  const list = document.getElementById('detailComments');
  if (!comments.length) {
    list.innerHTML = '<div class="empty-state" style="min-height:90px">还没有评论，来坐第一排。</div>';
    return;
  }
  list.innerHTML = comments.map(comment => `
    <div class="comment-item">
      <strong>${escapeHTML(comment.author || '匿名用户')}</strong>
      <p>${escapeHTML(comment.body)}</p>
      <span>${comment.created_at ? timeAgo(comment.created_at) : '刚刚'}</span>
    </div>
  `).join('');
}

async function sendComment() {
  if (!activePost) return;
  const input = document.getElementById('commentInput');
  const body = input.value.trim();
  if (!body) return;
  if (hasBlockedContent(body)) return showToast('评论包含违规关键词，请修改后再发送');
  const postId = String(activePost.id);
  const comment = { author: '欧圈用户', body, created_at: new Date().toISOString() };
  localComments[postId] = [comment, ...(localComments[postId] || [])];
  activePost.comment_count = (activePost.comment_count || 0) + 1;
  input.value = '';
  saveLocalState();
  renderComments(await getAllComments(activePost));
  syncDetailActions();
  if (!sb || !isFeedPostId(postId)) return;
  const session = (await sb.auth.getSession()).data.session;
  if (!session) return;
  await sb.from('feed_comments').insert({
    post_id: activePost.id,
    user_id: session.user.id,
    body,
    is_anonymous: false,
    status: 'approved'
  });
}

async function shareActivePost() {
  if (!activePost) return;
  const url = `${location.origin}/feed/#post-${activePost.id}`;
  const text = `我在欧圈看到：${titleOf(activePost)}\n${activePost.city || ''} ${displayCategory(activePost) || ''}`;
  if (navigator.share) {
    await navigator.share({ title: '欧圈', text, url }).catch(() => {});
  } else {
    await navigator.clipboard.writeText(`${text}\n${url}`).catch(() => {});
    showToast('分享链接已复制');
  }
}

function openCompose() {
  document.getElementById('composeSheet').classList.add('open');
  document.getElementById('composeSheet').setAttribute('aria-hidden', 'false');
  updateDraftNotice();
}

function closeCompose() {
  document.getElementById('composeSheet').classList.remove('open');
  document.getElementById('composeSheet').setAttribute('aria-hidden', 'true');
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
  const appendImages = event.target?.dataset?.appendImages === 'true';
  const files = [...event.target.files];
  const videos = files.filter(file => file.type.startsWith('video/'));
  const images = files.filter(file => file.type.startsWith('image/'));
  if (!files.length) return;
  if (videos.length && images.length) {
    event.target.value = '';
    selectedMedia = [];
    renderMediaPreview();
    return showToast('一次发布请选择图片或视频，不要混合上传');
  }
  if (videos.length > 1) {
    event.target.value = '';
    selectedMedia = [];
    renderMediaPreview();
    return showToast('视频一次最多上传1个');
  }
  if (images.length > MAX_IMAGES) showToast('图片最多9张，已保留前9张');
  if (videos.length) {
    const duration = await getVideoDuration(videos[0]).catch(() => 999);
    if (duration > MAX_VIDEO_SECONDS) {
      event.target.value = '';
      selectedMedia = [];
      renderMediaPreview();
      return showToast('视频不能超过30秒');
    }
    selectedMedia = [{ file: videos[0], media_type: 'video', duration_seconds: Math.round(duration) }];
  } else {
    const nextImages = images.map(file => ({ file, media_type: 'image', duration_seconds: null }));
    const canAppend = appendImages && selectedMedia.every(item => item.media_type === 'image');
    const mergedImages = canAppend ? [...selectedMedia, ...nextImages] : nextImages;
    selectedMedia = mergedImages.slice(0, MAX_IMAGES);
    if (mergedImages.length > MAX_IMAGES) showToast('图片最多9张，已保留前9张');
  }
  event.target.value = '';
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
  if (!sb || !selectedMedia.length || String(postId).startsWith('local-')) {
    return selectedMedia.map((item, index) => ({
      post_id: postId,
      media_type: item.media_type,
      url: URL.createObjectURL(item.file),
      thumbnail_url: null,
      duration_seconds: item.duration_seconds,
      sort_order: index
    }));
  }
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
  const title = document.getElementById('feedTitle').value.trim();
  const description = document.getElementById('feedDescription').value.trim();
  const city = document.getElementById('feedCity').value.trim();
  const whatsapp = document.getElementById('feedWhatsapp').value.trim();
  const category = document.getElementById('feedCategory').value;
  const tags = ensureCategoryTag(document.getElementById('feedTags').value, category);
  const isAnonymous = document.getElementById('feedAnonymous').checked;
  if (!title) return showToast('请填写标题');
  if (!description) return showToast('请填写正文');
  if (!city) return showToast('请选择城市');
  if (!selectedMedia.length) return showToast('请至少上传1张图片或1个视频');
  if (hasBlockedContent(title, description, city, whatsapp, category, tags.join(' '))) return showToast('内容包含违规关键词，请修改后再发布');
  localStorage.setItem('oqCityHint', city);
  const btn = document.getElementById('feedSubmitBtn');
  btn.disabled = true;
  btn.textContent = '发布中';
  try {
    let post;
    if (sb) {
      const session = (await sb.auth.getSession()).data.session;
      if (!session) {
        btn.disabled = false;
        btn.textContent = '发布';
        closeCompose();
        openSimpleSheet('meSheet');
        setAuthMode('login');
        return showToast('请先登录欧圈后再发布');
      }
      const basePayload = {
        user_id: session.user.id,
        title,
        description,
        city,
        whatsapp,
        tags,
        is_anonymous: isAnonymous,
        status: 'approved'
      };
      let { data, error } = await sb.from('feed_posts').insert({
        ...basePayload,
        category
      }).select().single();
      if (error && isFeedCategoryConstraintError(error)) {
        const retryCategory = legacyFeedCategory(category);
        if (retryCategory !== category) {
          ({ data, error } = await sb.from('feed_posts').insert({
            ...basePayload,
            category: retryCategory
          }).select().single());
          if (!error && data) {
            data.db_category = retryCategory;
            data.category = category;
          }
        }
      }
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
        title,
        description,
        city,
        whatsapp,
        category,
        tags,
        is_anonymous: isAnonymous,
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
    deleteDraft({ silent: true });
    closeCompose();
    activeChannel = '推荐';
    syncChannelButtons();
    renderPosts();
    showToast('发布成功，已进入欧圈');
  } catch (error) {
    showToast(`发布失败：${error.message || '请稍后再试'}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '发布';
  }
}

function syncChannelButtons() {
  document.querySelectorAll('#channelTabs button').forEach(button => {
    button.classList.toggle('active', button.dataset.channel === activeChannel);
  });
}

function openSimpleSheet(id) {
  document.getElementById(id).classList.add('open');
  document.getElementById(id).setAttribute('aria-hidden', 'false');
}

function closeSimpleSheet(id) {
  document.getElementById(id).classList.remove('open');
  document.getElementById(id).setAttribute('aria-hidden', 'true');
}

function handleBottomNavigation(button) {
  if (!button) return;
  document.querySelectorAll('.bottom-nav button').forEach(item => {
    item.classList.toggle('active', item === button);
  });
  if (button.dataset.nav === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
  if (button.dataset.nav === 'publish') openCompose();
  if (button.dataset.nav === 'messages') openSimpleSheet('messageSheet');
  if (button.dataset.nav === 'me') openSimpleSheet('meSheet');
}

function bindEvents() {
  document.getElementById('searchToggle').addEventListener('click', () => {
    const searchBar = document.getElementById('searchBar');
    searchBar.hidden = !searchBar.hidden;
    if (!searchBar.hidden) document.getElementById('feedSearchInput').focus();
  });
  document.getElementById('feedSearchInput').addEventListener('input', event => {
    searchTerm = event.target.value;
    renderPosts();
  });
  document.getElementById('channelTabs').addEventListener('click', event => {
    const button = event.target.closest('button[data-channel]');
    if (!button) return;
    activeChannel = CHANNELS.includes(button.dataset.channel) ? button.dataset.channel : '推荐';
    syncChannelButtons();
    renderPosts();
  });
  document.querySelector('.bottom-nav').addEventListener('click', event => {
    const button = event.target.closest('button[data-nav]');
    if (!button) return;
    handleBottomNavigation(button);
  });
  document.querySelectorAll('.bottom-nav button[data-nav]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      handleBottomNavigation(button);
    });
  });
  document.getElementById('detailClose').addEventListener('click', closeDetail);
  document.getElementById('detailLike').addEventListener('click', () => toggleReaction('like'));
  document.getElementById('detailSave').addEventListener('click', () => toggleReaction('save'));
  document.getElementById('detailComment').addEventListener('click', () => document.getElementById('commentInput').focus());
  document.getElementById('detailShare').addEventListener('click', shareActivePost);
  document.getElementById('detailShareTop').addEventListener('click', shareActivePost);
  document.getElementById('detailFollow').addEventListener('click', toggleFollow);
  document.getElementById('sendComment').addEventListener('click', sendComment);
  document.getElementById('commentInput').addEventListener('keydown', event => {
    if (event.key === 'Enter') sendComment();
  });
  document.getElementById('composeClose').addEventListener('click', closeCompose);
  document.getElementById('composeSheet').addEventListener('click', event => {
    if (event.target.id === 'composeSheet') closeCompose();
  });
  document.querySelectorAll('[data-close-simple]').forEach(button => {
    button.addEventListener('click', () => closeSimpleSheet(button.dataset.closeSimple));
  });
  document.querySelectorAll('.simple-sheet').forEach(sheet => {
    sheet.addEventListener('click', event => {
      if (event.target === sheet) closeSimpleSheet(sheet.id);
    });
  });
  document.getElementById('feedMediaInput').addEventListener('change', handleMediaInput);
  document.getElementById('feedCameraInput')?.addEventListener('change', handleMediaInput);
  document.getElementById('feedPostForm').addEventListener('submit', submitPost);
  document.getElementById('saveDraftBtn').addEventListener('click', saveDraft);
  document.getElementById('restoreDraftBtn').addEventListener('click', restoreDraft);
  document.getElementById('deleteDraftBtn').addEventListener('click', () => deleteDraft());
  document.querySelectorAll('[data-auth-mode]').forEach(button => {
    button.addEventListener('click', () => setAuthMode(button.dataset.authMode));
  });
  document.getElementById('feedLoginBtn')?.addEventListener('click', loginFeedAccount);
  document.getElementById('feedRegisterBtn')?.addEventListener('click', registerFeedAccount);
  document.getElementById('feedLogoutBtn')?.addEventListener('click', logoutFeedAccount);
  ['feedLoginPassword', 'feedRegPasswordConfirm'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      if (id === 'feedLoginPassword') loginFeedAccount();
      if (id === 'feedRegPasswordConfirm') registerFeedAccount();
    });
  });
  window.addEventListener('hashchange', openInitialPostFromHash);
  updateDraftNotice();
}

function openInitialPostFromHash() {
  if (!location.hash.startsWith('#post-')) return;
  const id = decodeURIComponent(location.hash.replace('#post-', ''));
  const post = allFeedItems().find(item => String(item.id) === id);
  if (post) openDetail(post);
}

document.addEventListener('DOMContentLoaded', async () => {
  bindEvents();
  await initUser();
  if (currentUser) await loadCurrentProfile();
  updateFeedAuthUI();
  await loadPosts();
  loadListingsAsFeedPosts();
  loadMerchants();
  if (sb) {
    sb.auth.onAuthStateChange(async (_event, session) => {
      currentUser = session?.user || null;
      if (currentUser) await loadCurrentProfile();
      else currentProfile = null;
      updateFeedAuthUI();
    });
    sb.channel('oq-listings-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => {
        loadListingsAsFeedPosts();
      })
      .subscribe();
  }
});
