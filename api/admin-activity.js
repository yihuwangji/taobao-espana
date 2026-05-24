const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const { requireAdminByMetadata } = require('./_admin-auth');

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
  const useful = rows.filter(row => !['user_list', 'download_admin_apk'].includes(row.action)).slice(0, 8);

  const adminIds = cleanIdList(useful.map(row => row.admin_id), true);
  const listingIds = cleanIdList(useful.filter(row => row.target_type === 'listing').map(row => row.target_id));
  const userIds = cleanIdList(useful.filter(row => row.target_type === 'user').map(row => row.target_id), true);

  const [adminsResponse, listingsResponse, usersResponse] = await Promise.all([
    adminIds.length
      ? serviceFetch(`/rest/v1/profiles?select=id,nickname&id=in.(${adminIds.join(',')})`)
      : Promise.resolve(null),
    listingIds.length
      ? serviceFetch(`/rest/v1/listings?select=id,title&id=in.(${listingIds.join(',')})`)
      : Promise.resolve(null),
    userIds.length
      ? serviceFetch(`/rest/v1/profiles?select=id,nickname,phone&id=in.(${userIds.join(',')})`)
      : Promise.resolve(null)
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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed', message: '只支持 POST 请求' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: 'missing_service_role', message: '后台服务缺少 SUPABASE_SERVICE_ROLE_KEY' });
  }

  const admin = await requireAdminByMetadata(req);
  if (admin.error) return json(res, admin.status, { error: admin.error, message: '没有后台权限' });

  const body = parseBody(req);
  const todayStart = String(body.todayStart || '').trim();
  const validTodayStart = /^\d{4}-\d{2}-\d{2}T/.test(todayStart) ? todayStart : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const [
      userCount,
      listingCount,
      pendingCount,
      newUserCount,
      todayGuestListingCount,
      todayListingCount,
      recentLogs,
      todayGuestListings
    ] = await Promise.all([
      countRows('/rest/v1/profiles?select=id'),
      countRows('/rest/v1/listings?select=id&status=eq.approved'),
      countRows('/rest/v1/listings?select=id&status=eq.pending'),
      countRows(`/rest/v1/profiles?select=id&created_at=gte.${encodeURIComponent(validTodayStart)}`),
      countRows(`/rest/v1/listings?select=id&user_id=is.null&created_at=gte.${encodeURIComponent(validTodayStart)}`),
      countRows(`/rest/v1/listings?select=id&created_at=gte.${encodeURIComponent(validTodayStart)}`),
      loadRecentLogs(),
      loadTodayGuestListings(validTodayStart)
    ]);

    return json(res, 200, {
      ok: true,
      stats: {
        userCount,
        listingCount,
        pendingCount,
        newUserCount,
        todayGuestListingCount,
        todayListingCount
      },
      recentLogs,
      todayGuestListings
    });
  } catch (error) {
    return json(res, 500, { error: 'activity_failed', message: error.message || '读取近期记录失败' });
  }
};
