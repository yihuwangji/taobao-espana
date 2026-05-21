const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Co4jbBX8M1I_fJCgoceoDA_PUTyhNta';

const ACTIONS = {
  approve: { status: 'approved', section: 'review', log: 'batch_approve' },
  online: { status: 'approved', section: 'listings', log: 'batch_online' },
  offline: { status: 'offline', section: 'listings', log: 'batch_offline' },
  reject: { status: 'rejected', section: 'review', log: 'batch_reject' },
  delete: { section: 'listings', log: 'batch_delete' }
};

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

function normalizeIds(value) {
  const input = Array.isArray(value) ? value : [];
  return [...new Set(input.map(id => Number(String(id).replace(/\D/g, ''))).filter(Number.isInteger).filter(id => id > 0))].slice(0, 200);
}

function inFilter(column, ids) {
  return `${column}=in.(${ids.join(',')})`;
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

async function requireAdmin(req, requiredSection = '') {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return { error: 'missing_token', status: 401 };

  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`
    }
  });
  if (!userResponse.ok) return { error: 'invalid_token', status: 401 };
  const user = await userResponse.json();

  const profileResponse = await serviceFetch(`/rest/v1/profiles?select=is_admin&id=eq.${encodeURIComponent(user.id)}&limit=1`);
  if (!profileResponse.ok) return { error: 'admin_check_failed', status: 403 };
  const profiles = await profileResponse.json();
  const isSuper = Boolean(profiles[0]?.is_admin || user.app_metadata?.admin_role === 'super_admin');
  const sections = Array.isArray(user.app_metadata?.admin_sections) ? user.app_metadata.admin_sections : [];
  if (!isSuper && (!requiredSection || !sections.includes(requiredSection))) return { error: 'not_admin', status: 403 };
  return { user };
}

async function mustOk(response, label) {
  if (response.ok) return response;
  const text = await response.text();
  throw new Error(`${label}: ${text || response.status}`);
}

async function updateListings(ids, status) {
  const response = await serviceFetch(`/rest/v1/listings?${inFilter('id', ids)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status, updated_at: new Date().toISOString() })
  });
  await mustOk(response, 'update listings');
  return response.json();
}

async function deleteListings(ids) {
  await mustOk(await serviceFetch(`/rest/v1/page_views?${inFilter('listing_id', ids)}`, { method: 'DELETE' }), 'delete page views');
  await mustOk(await serviceFetch(`/rest/v1/pin_records?${inFilter('listing_id', ids)}`, { method: 'DELETE' }), 'delete pin records');
  await mustOk(await serviceFetch(`/rest/v1/reports?${inFilter('listing_id', ids)}`, { method: 'DELETE' }), 'delete linked reports');
  const response = await serviceFetch(`/rest/v1/listings?${inFilter('id', ids)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=representation' }
  });
  await mustOk(response, 'delete listings');
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

  const body = parseBody(req);
  const action = String(body.action || '').trim();
  const config = ACTIONS[action];
  const ids = normalizeIds(body.ids);
  if (!config) return json(res, 400, { error: 'invalid_action', message: '批量操作类型无效' });
  if (!ids.length) return json(res, 400, { error: 'missing_ids', message: '请先选择要操作的信息' });

  const admin = await requireAdmin(req, config.section);
  if (admin.error) return json(res, admin.status, { error: admin.error, message: '没有对应后台管理权限' });

  try {
    const rows = action === 'delete' ? await deleteListings(ids) : await updateListings(ids, config.status);
    await serviceFetch('/rest/v1/admin_logs', {
      method: 'POST',
      body: JSON.stringify([{
        admin_id: admin.user.id,
        action: config.log,
        target_type: 'listing',
        target_id: ids.join(','),
        note: `count=${rows.length}`
      }])
    }).catch(() => null);

    return json(res, 200, {
      ok: true,
      action,
      requested: ids.length,
      changed: rows.length,
      ids: rows.map(row => row.id)
    });
  } catch (error) {
    return json(res, 400, { error: 'batch_failed', message: error.message || '批量操作失败' });
  }
};
