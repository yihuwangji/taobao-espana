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

function normalize(value = {}) {
  const ids = Array.isArray(value.listingIds)
    ? value.listingIds.map(Number).filter(Number.isInteger).filter(id => id > 0).slice(0, 20)
    : [];
  return {
    enabled: value.enabled !== false,
    rotateSeconds: Math.max(30, Math.min(1800, Number(value.rotateSeconds || 180))),
    listingIds: [...new Set(ids)]
  };
}

async function getHotAds() {
  const response = await serviceFetch('/rest/v1/site_settings?key=eq.hot_ads&select=value&limit=1');
  if (!response.ok) throw new Error(await response.text());
  const rows = await response.json();
  return normalize(rows[0]?.value || {});
}

async function updateHotAds(value, adminId) {
  const normalized = normalize(value);
  const response = await serviceFetch('/rest/v1/site_settings?on_conflict=key&select=key,value,updated_at', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify([{
      key: 'hot_ads',
      value: normalized,
      updated_by: adminId,
      updated_at: new Date().toISOString()
    }])
  });
  if (!response.ok) throw new Error(await response.text());
  return normalized;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, message: '只支持 POST 请求' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { ok: false, message: '后台服务缺少 SUPABASE_SERVICE_ROLE_KEY' });
  }

  const admin = await requireAdminByMetadata(req, { section: 'payment' });
  if (admin.error) return json(res, admin.status, { ok: false, message: '没有后台系统设置权限' });

  const body = parseBody(req);
  try {
    if (body.action === 'get') {
      return json(res, 200, { ok: true, value: await getHotAds() });
    }
    if (body.action === 'update') {
      const value = await updateHotAds(body.value || {}, admin.user.id);
      await serviceFetch('/rest/v1/admin_logs', {
        method: 'POST',
        body: JSON.stringify([{
          admin_id: admin.user.id,
          action: 'update_hot_ads',
          target_type: 'site_settings',
          target_id: 'hot_ads'
        }])
      }).catch(() => null);
      return json(res, 200, { ok: true, value });
    }
    return json(res, 400, { ok: false, message: '未知操作' });
  } catch (error) {
    return json(res, 400, { ok: false, message: error.message || '保存失败' });
  }
};