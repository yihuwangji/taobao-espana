const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Co4jbBX8M1I_fJCgoceoDA_PUTyhNta';
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

function numericId(value) {
  const match = String(value || '').match(/\d+/);
  return match ? match[0] : '';
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
  return requireAdminByMetadata(req, { section: requiredSection });
}

async function mustOk(response, label) {
  if (response.ok) return;
  const text = await response.text();
  throw new Error(`${label}: ${text || response.status}`);
}

async function deleteListing(id) {
  const listingId = numericId(id);
  if (!listingId) throw new Error('信息ID无效');
  await mustOk(await serviceFetch(`/rest/v1/page_views?listing_id=eq.${listingId}`, { method: 'DELETE' }), 'delete page_views');
  await mustOk(await serviceFetch(`/rest/v1/pin_records?listing_id=eq.${listingId}`, { method: 'DELETE' }), 'delete pin_records');
  await mustOk(await serviceFetch(`/rest/v1/reports?listing_id=eq.${listingId}`, { method: 'DELETE' }), 'delete linked reports');
  await mustOk(await serviceFetch(`/rest/v1/listings?id=eq.${listingId}`, { method: 'DELETE' }), 'delete listing');
  return listingId;
}

async function deleteReport(id) {
  const reportId = numericId(id);
  if (!reportId) throw new Error('举报ID无效');
  await mustOk(await serviceFetch(`/rest/v1/reports?id=eq.${reportId}`, { method: 'DELETE' }), 'delete report');
  return reportId;
}

async function deleteUser(id, adminId) {
  const userId = String(id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('用户ID无效');
  if (userId === adminId) throw new Error('不能删除当前登录的管理员账号');

  const nullBody = JSON.stringify({ user_id: null });
  await mustOk(await serviceFetch(`/rest/v1/listings?user_id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: nullBody
  }), 'unlink listings');
  await mustOk(await serviceFetch(`/rest/v1/reports?reporter_id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ reporter_id: null })
  }), 'unlink reports');
  await mustOk(await serviceFetch(`/rest/v1/pin_records?created_by=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ created_by: null })
  }), 'unlink pin records');
  await mustOk(await serviceFetch(`/rest/v1/admin_logs?admin_id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ admin_id: null })
  }), 'unlink admin logs');
  await mustOk(await serviceFetch(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE' }), 'delete profile');
  await mustOk(await serviceFetch(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' }), 'delete auth user');
  return userId;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed', message: '只支持 POST 请求' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: 'missing_service_role', message: '后台服务未配置安全密钥' });
  }

  const { type, id } = parseBody(req);
  const requiredSection = type === 'user' ? 'users' : type === 'report' ? 'reports' : 'listings';
  const admin = await requireAdmin(req, requiredSection);
  if (admin.error) return json(res, admin.status, { error: admin.error, message: '没有管理员权限' });

  try {
    let deletedId;
    if (type === 'listing') deletedId = await deleteListing(id);
    else if (type === 'report') deletedId = await deleteReport(id);
    else if (type === 'user') deletedId = await deleteUser(id, admin.user.id);
    else return json(res, 400, { error: 'invalid_type', message: '删除类型无效' });

    await serviceFetch('/rest/v1/admin_logs', {
      method: 'POST',
      body: JSON.stringify([{ admin_id: admin.user.id, action: 'delete', target_type: type, target_id: String(deletedId) }])
    }).catch(() => null);

    return json(res, 200, { ok: true, type, id: deletedId });
  } catch (error) {
    return json(res, 400, { error: 'delete_failed', message: error.message || '删除失败' });
  }
};
