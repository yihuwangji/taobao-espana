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

function numericId(value) {
  const match = String(value || '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function cleanUrl(value) {
  return String(value || '').trim().slice(0, 1000);
}

function normalizeImages(value) {
  const input = Array.isArray(value) ? value : String(value || '').split(/\r?\n|,/);
  return input
    .map(cleanUrl)
    .filter(Boolean)
    .filter(url => /^https?:\/\//i.test(url))
    .slice(0, 6);
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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed', message: '只支持 POST 请求' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: 'missing_service_role', message: '后台服务缺少 SUPABASE_SERVICE_ROLE_KEY' });
  }

  const admin = await requireAdminByMetadata(req, { section: 'listings' });
  if (admin.error) return json(res, admin.status, { error: admin.error, message: '没有信息管理权限' });

  const body = parseBody(req);
  const id = numericId(body.id);
  const images = normalizeImages(body.images);
  if (!id) return json(res, 400, { error: 'missing_id', message: '信息ID无效' });
  if (!images.length) return json(res, 400, { error: 'missing_images', message: '请至少上传或填写一张图片' });

  try {
    const response = await serviceFetch(`/rest/v1/listings?id=eq.${id}&select=id,title,images,updated_at`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ images, updated_at: new Date().toISOString() })
    });
    const text = await response.text();
    if (!response.ok) throw new Error(text || '保存失败');
    const [listing] = text ? JSON.parse(text) : [];
    if (!listing) throw new Error('没有找到这条信息');

    await serviceFetch('/rest/v1/admin_logs', {
      method: 'POST',
      body: JSON.stringify([{
        admin_id: admin.user.id,
        action: 'replace_listing_images',
        target_type: 'listing',
        target_id: String(id),
        note: `images=${images.length}`
      }])
    }).catch(() => null);

    return json(res, 200, { ok: true, listing });
  } catch (error) {
    return json(res, 400, { error: 'update_images_failed', message: error.message || '保存失败' });
  }
};
