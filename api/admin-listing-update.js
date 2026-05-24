const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Co4jbBX8M1I_fJCgoceoDA_PUTyhNta';
const { requireAdminByMetadata } = require('./_admin-auth');

const CATEGORY_ALLOWLIST = new Set(['招工', '租房', '生意', '二手物品', '二手车', '服务', '教育']);
const STATUS_ALLOWLIST = new Set(['pending', 'approved', 'rejected', 'offline']);

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

function cleanText(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanLongText(value, max = 5000) {
  return String(value || '').replace(/\r\n/g, '\n').trim().slice(0, max);
}

function normalizeImages(value) {
  const input = Array.isArray(value)
    ? value
    : String(value || '').split(/\r?\n|,/);
  return input
    .map(item => cleanText(item, 1000))
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

async function requireAdmin(req, requiredSection = 'listings') {
  return requireAdminByMetadata(req, { section: requiredSection });
}

async function mustOk(response, label) {
  if (response.ok) return response;
  const text = await response.text();
  throw new Error(`${label}: ${text || response.status}`);
}

function buildUpdate(body) {
  const category = cleanText(body.category, 30);
  const status = cleanText(body.status, 30);
  const title = cleanText(body.title, 120);
  const city = cleanText(body.city, 80);
  const description = cleanLongText(body.description, 5000);
  const contact = cleanText(body.contact, 200);
  const price = cleanText(body.price, 80);
  const address = cleanText(body.address, 300);
  const images = normalizeImages(body.images);

  if (!title) throw new Error('标题不能为空');
  if (!contact) throw new Error('联系方式不能为空');
  if (!CATEGORY_ALLOWLIST.has(category)) throw new Error('分类无效');
  if (!STATUS_ALLOWLIST.has(status)) throw new Error('状态无效');

  return {
    title,
    category,
    city: city || null,
    price: price || null,
    address: address || null,
    description: description || '',
    contact,
    images,
    status,
    updated_at: new Date().toISOString()
  };
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
  const id = numericId(body.id);
  if (!id) return json(res, 400, { error: 'missing_id', message: '信息ID无效' });

  const admin = await requireAdmin(req, 'listings');
  if (admin.error) return json(res, admin.status, { error: admin.error, message: '没有信息管理权限' });

  try {
    const update = buildUpdate(body);
    const response = await serviceFetch(`/rest/v1/listings?id=eq.${id}&select=id,title,category,city,price,address,description,contact,images,status,updated_at`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(update)
    });
    await mustOk(response, 'update listing');
    const rows = await response.json();
    const row = rows[0];
    if (!row) throw new Error('没有找到这条信息');

    await serviceFetch('/rest/v1/admin_logs', {
      method: 'POST',
      body: JSON.stringify([{
        admin_id: admin.user.id,
        action: 'update_listing',
        target_type: 'listing',
        target_id: String(id),
        note: `status=${update.status}; category=${update.category}`
      }])
    }).catch(() => null);

    return json(res, 200, { ok: true, listing: row });
  } catch (error) {
    return json(res, 400, { error: 'update_failed', message: error.message || '保存失败' });
  }
};
