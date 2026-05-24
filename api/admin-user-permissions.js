const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const { ALL_ADMIN_SECTIONS, requireAdminByMetadata } = require('./_admin-auth');

const MANAGEABLE_SECTIONS = ['listings', 'review', 'reports', 'pinned', 'users', 'payment'];

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

async function requireAdmin(req, options = {}) {
  return requireAdminByMetadata(req, options);
}

function normalizeSections(value) {
  const input = Array.isArray(value) ? value : [];
  return [...new Set(input.filter(section => MANAGEABLE_SECTIONS.includes(section)))];
}

function normalizeRole(value) {
  return value === 'super_admin' || value === 'section_admin' ? value : 'none';
}

function publicUser(authUser, profile) {
  const app = authUser?.app_metadata || {};
  const role = normalizeRole(app.admin_role);
  const sections = role === 'super_admin'
    ? ALL_ADMIN_SECTIONS
    : normalizeSections(app.admin_sections);
  return {
    id: profile?.id || authUser?.id,
    email: authUser?.email || '',
    nickname: profile?.nickname || authUser?.user_metadata?.nickname || '未知',
    city: profile?.city || authUser?.user_metadata?.city || '—',
    phone: profile?.phone || authUser?.user_metadata?.phone || '—',
    is_banned: Boolean(profile?.is_banned),
    post_count: profile?.post_count || 0,
    created_at: profile?.created_at || authUser?.created_at || null,
    role,
    sections,
    is_super_admin: role === 'super_admin'
  };
}

async function listUsers() {
  const [profileResponse, authResponse] = await Promise.all([
    serviceFetch('/rest/v1/profiles?select=id,nickname,city,phone,is_banned,post_count,created_at&order=created_at.desc&limit=1000'),
    serviceFetch('/auth/v1/admin/users?page=1&per_page=1000')
  ]);
  if (!profileResponse.ok) throw new Error(await profileResponse.text());
  if (!authResponse.ok) throw new Error(await authResponse.text());
  const profiles = await profileResponse.json();
  const authPayload = await authResponse.json();
  const authUsers = Array.isArray(authPayload?.users) ? authPayload.users : [];
  const profilesById = new Map(profiles.map(profile => [profile.id, profile]));
  const authById = new Map(authUsers.map(user => [user.id, user]));
  const ids = new Set([...profilesById.keys(), ...authById.keys()]);
  return [...ids]
    .map(id => publicUser(authById.get(id), profilesById.get(id)))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}

function passwordFromInput(value) {
  const password = String(value || '').trim();
  if (/^\d{4}$/.test(password)) return `${password}#EspanaLife2026`;
  return password;
}

async function setPermissions(body, adminId) {
  const userId = String(body.userId || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('用户ID无效');
  const role = normalizeRole(body.role);
  const sections = role === 'super_admin' ? ALL_ADMIN_SECTIONS : normalizeSections(body.sections);

  if (userId === adminId && role !== 'super_admin') {
    throw new Error('不能取消当前登录超级管理员自己的权限');
  }

  const currentResponse = await serviceFetch(`/auth/v1/admin/users/${encodeURIComponent(userId)}`);
  if (!currentResponse.ok) throw new Error(await currentResponse.text());
  const currentUser = await currentResponse.json();
  const currentMetadata = currentUser?.app_metadata || {};

  const metaResponse = await serviceFetch(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify({
      app_metadata: {
        ...currentMetadata,
        admin_role: role === 'none' ? null : role,
        admin_sections: role === 'none' ? [] : sections
      }
    })
  });
  if (!metaResponse.ok) throw new Error(await metaResponse.text());

  const profileResponse = await serviceFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ updated_at: new Date().toISOString() })
  });
  if (!profileResponse.ok) throw new Error(await profileResponse.text());

  return { userId, role, sections };
}

async function createAdminUser(body) {
  const email = String(body.email || '').trim().toLowerCase();
  const nickname = String(body.nickname || '后台管理员').trim().slice(0, 80);
  const password = String(body.password || '').trim();
  const role = normalizeRole(body.role || 'section_admin');
  const sections = role === 'super_admin' ? ALL_ADMIN_SECTIONS : normalizeSections(body.sections);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('管理员邮箱格式不正确');
  if (role === 'none') throw new Error('新建后台账号必须分配后台权限');
  if (role === 'section_admin' && !sections.length) throw new Error('请至少选择一个可管理版面');
  if (password.length < 8) throw new Error('后台管理员密码至少8位');

  const response = await serviceFetch('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nickname,
        account_type: 'admin'
      },
      app_metadata: {
        admin_role: role,
        admin_sections: sections
      }
    })
  });
  const text = await response.text();
  const user = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(user?.message || user?.msg || text || '创建后台账号失败');

  await serviceFetch('/rest/v1/profiles?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      id: user.id,
      nickname,
      city: '后台',
      phone: '',
      updated_at: new Date().toISOString()
    })
  }).catch(() => null);

  return { user: publicUser(user, { id: user.id, nickname, city: '后台', phone: '', created_at: user.created_at }) };
}

async function resetPassword(body, adminId) {
  const userId = String(body.userId || '').trim();
  const password = String(body.password || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('用户ID无效');
  if (userId === adminId) throw new Error('不能在这里重置当前登录管理员自己的密码');
  if (password.length < 4) throw new Error('新密码至少4位');
  if (!/^\d{4}$/.test(password) && password.length < 8) {
    throw new Error('管理员邮箱密码至少8位；手机号账号可填4位数字');
  }
  const response = await serviceFetch(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PUT',
    body: JSON.stringify({ password: passwordFromInput(password) })
  });
  if (!response.ok) throw new Error(await response.text());
  return { userId };
}

async function countRows(path) {
  const response = await serviceFetch(path, {
    method: 'HEAD',
    headers: { Prefer: 'count=exact' }
  });
  if (!response.ok) throw new Error(await response.text());
  return Number(response.headers.get('content-range')?.split('/')?.[1] || 0);
}

function cleanIdList(values, uuid = false) {
  return [...new Set(values.filter(Boolean).map(String))]
    .filter(value => uuid ? /^[0-9a-f-]{36}$/i.test(value) : /^\d+$/.test(value))
    .slice(0, 50);
}

async function loadRecentLogs() {
  const response = await serviceFetch('/rest/v1/admin_logs?select=id,admin_id,action,target_type,target_id,note,created_at&order=created_at.desc&limit=30');
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json();
  const useful = rows.filter(row => !['user_list', 'user_list_activity', 'download_admin_apk'].includes(row.action)).slice(0, 8);

  const adminIds = cleanIdList(useful.map(row => row.admin_id), true);
  const listingIds = cleanIdList(useful.filter(row => row.target_type === 'listing').map(row => row.target_id));
  const userIds = cleanIdList(useful.filter(row => row.target_type === 'user').map(row => row.target_id), true);

  const [adminsResponse, listingsResponse, usersResponse] = await Promise.all([
    adminIds.length ? serviceFetch(`/rest/v1/profiles?select=id,nickname&id=in.(${adminIds.join(',')})`) : Promise.resolve(null),
    listingIds.length ? serviceFetch(`/rest/v1/listings?select=id,title&id=in.(${listingIds.join(',')})`) : Promise.resolve(null),
    userIds.length ? serviceFetch(`/rest/v1/profiles?select=id,nickname,phone&id=in.(${userIds.join(',')})`) : Promise.resolve(null)
  ]);

  const admins = adminsResponse?.ok ? await adminsResponse.json() : [];
  const listings = listingsResponse?.ok ? await listingsResponse.json() : [];
  const users = usersResponse?.ok ? await usersResponse.json() : [];
  const adminById = new Map(admins.map(row => [row.id, row.nickname || '管理员']));
  const listingById = new Map(listings.map(row => [String(row.id), row.title || `信息 #${row.id}`]));
  const userById = new Map(users.map(row => [row.id, row.nickname || row.phone || `用户 ${row.id.slice(0, 8)}`]));

  return useful.map(row => ({
    id: row.id,
    action: row.action,
    target_type: row.target_type,
    target_id: row.target_id,
    note: row.note || '',
    created_at: row.created_at,
    admin_name: row.admin_id ? (adminById.get(row.admin_id) || '管理员') : '系统',
    target_title: row.target_type === 'listing'
      ? (listingById.get(String(row.target_id)) || `信息 #${row.target_id}`)
      : row.target_type === 'user'
        ? (userById.get(row.target_id) || `用户 ${String(row.target_id).slice(0, 8)}`)
        : row.target_id
  }));
}

async function loadTodayGuestListings(todayStart) {
  const response = await serviceFetch(`/rest/v1/listings?select=id,title,status,created_at&user_id=is.null&created_at=gte.${encodeURIComponent(todayStart)}&order=created_at.desc&limit=5`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

const CATEGORY_META = {
  jobs: { label: '招工求职', color: '#E53935' },
  housing: { label: '租房买房', color: '#3B82F6' },
  goods: { label: '二手买卖', color: '#F5A623' },
  business: { label: '生意转让', color: '#16A34A' },
  service: { label: '商家服务', color: '#0891B2' }
};

function isTransferListing(row) {
  const text = `${row?.title || ''} ${row?.description || ''}`.toLowerCase();
  return /转让|出兑|顶手|盘让|让店|店铺出售|店面出售|生意出售|traspaso|se traspasa/.test(text);
}

function categoryGroup(row) {
  const value = String(row?.category || '').trim();
  if (/招工|求职|worker|job/i.test(value)) return 'jobs';
  if (/租房|房源|买房|house|housing/i.test(value)) return 'housing';
  if (/二手|车|物品|goods|car/i.test(value)) return 'goods';
  if (/生意|转让|business/i.test(value)) return isTransferListing(row) ? 'business' : 'service';
  return 'service';
}

async function loadCategoryStats(periodStart) {
  const dateFilter = periodStart ? `&created_at=gte.${encodeURIComponent(periodStart)}` : '';
  const response = await serviceFetch(`/rest/v1/listings?select=category,title,description&status=eq.approved${dateFilter}&limit=10000`);
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json();
  const counts = rows.reduce((acc, row) => {
    const group = categoryGroup(row);
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(CATEGORY_META)
    .map(([key, meta]) => ({ ...meta, val: counts[key] || 0 }))
    .filter(row => row.val > 0)
    .sort((a, b) => b.val - a.val);
}

async function loadActivity(body) {
  const todayStart = String(body.todayStart || '').trim();
  const validTodayStart = /^\d{4}-\d{2}-\d{2}T/.test(todayStart) ? todayStart : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const yesterdayStart = new Date(new Date(validTodayStart).getTime() - 24 * 60 * 60 * 1000).toISOString();
  const categoryStart = String(body.categoryStart || '').trim();
  const validCategoryStart = /^\d{4}-\d{2}-\d{2}T/.test(categoryStart) ? categoryStart : '';
  const [
    userCount,
    listingCount,
    pendingCount,
    newUserCount,
    todayGuestListingCount,
    todayListingCount,
    todayViewCount,
    yesterdayViewCount,
    recentLogs,
    todayGuestListings,
    categoryStats
  ] = await Promise.all([
    countRows('/rest/v1/profiles?select=id'),
    countRows('/rest/v1/listings?select=id&status=eq.approved'),
    countRows('/rest/v1/listings?select=id&status=eq.pending'),
    countRows(`/rest/v1/profiles?select=id&created_at=gte.${encodeURIComponent(validTodayStart)}`),
    countRows(`/rest/v1/listings?select=id&user_id=is.null&created_at=gte.${encodeURIComponent(validTodayStart)}`),
    countRows(`/rest/v1/listings?select=id&created_at=gte.${encodeURIComponent(validTodayStart)}`),
    countRows(`/rest/v1/page_views?select=id&created_at=gte.${encodeURIComponent(validTodayStart)}`),
    countRows(`/rest/v1/page_views?select=id&created_at=gte.${encodeURIComponent(yesterdayStart)}&created_at=lt.${encodeURIComponent(validTodayStart)}`),
    loadRecentLogs(),
    loadTodayGuestListings(validTodayStart),
    loadCategoryStats(validCategoryStart)
  ]);

  return {
    stats: { userCount, listingCount, pendingCount, newUserCount, todayGuestListingCount, todayListingCount, todayViewCount, yesterdayViewCount, categoryStats },
    recentLogs,
    todayGuestListings
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed', message: '只支持 POST 请求' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: 'missing_service_role', message: '后台服务未配置安全密钥' });
  }

  const body = parseBody(req);
  const needsSuper = body.action === 'set_permissions' || body.action === 'reset_password' || body.action === 'create_admin';
  const admin = await requireAdmin(req, { super: needsSuper, section: body.action === 'list' ? 'users' : '' });
  if (admin.error) return json(res, admin.status, { error: admin.error, message: needsSuper ? '需要超级管理员权限' : '没有用户管理权限' });

  try {
    let result;
    if (body.action === 'list') result = { users: await listUsers() };
    else if (body.action === 'list_activity') result = await loadActivity(body);
    else if (body.action === 'create_admin') result = await createAdminUser(body);
    else if (body.action === 'set_permissions') result = await setPermissions(body, admin.user.id);
    else if (body.action === 'reset_password') result = await resetPassword(body, admin.user.id);
    else return json(res, 400, { error: 'invalid_action', message: '操作类型无效' });

    if (!['list', 'list_activity'].includes(body.action)) {
      await serviceFetch('/rest/v1/admin_logs', {
        method: 'POST',
        body: JSON.stringify([{
          admin_id: admin.user.id,
          action: `user_${body.action}`,
          target_type: 'user',
          target_id: String(body.userId || admin.user.id),
          note: body.action === 'set_permissions' ? JSON.stringify({ role: result.role, sections: result.sections }) : ''
        }])
      }).catch(() => null);
    }

    return json(res, 200, { ok: true, ...result });
  } catch (error) {
    return json(res, 400, { error: 'admin_user_action_failed', message: error.message || '操作失败' });
  }
};
