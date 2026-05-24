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

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
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

async function requireAdmin(req) {
  return requireAdminByMetadata(req, { section: 'listings' });
}

function normalizeUpdate(row) {
  const id = Number(row?.id);
  const title = cleanText(row?.title);
  const images = Array.isArray(row?.images) ? row.images.map(cleanText).filter(Boolean).slice(0, 6) : [];
  if (!Number.isFinite(id) || id <= 0 || !images.length) return null;
  if (!images.every(url => /^https:\/\/images\.unsplash\.com\//.test(url))) return null;
  return { id, title, images };
}

async function loadExistingListings() {
  const response = await serviceFetch('/rest/v1/listings?select=id,title,description,images,user_id&limit=10000');
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`load_listings_failed: ${text || response.status}`);
  }
  return response.json();
}

function hasImages(value) {
  if (Array.isArray(value)) return value.filter(Boolean).length > 0;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) && parsed.filter(Boolean).length > 0;
    } catch {
      return Boolean(value.trim());
    }
  }
  return false;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: 'missing_service_role' });
  }

  const admin = await requireAdmin(req);
  if (admin.error) return json(res, admin.status, { error: admin.error });

  const body = parseBody(req);
  const updates = (Array.isArray(body.updates) ? body.updates : [])
    .map(normalizeUpdate)
    .filter(Boolean);
  if (!updates.length) return json(res, 400, { error: 'no_valid_updates' });

  try {
    const existingRows = await loadExistingListings();
    const existing = new Map(existingRows.map(row => [Number(row.id), row]));
    const changed = [];
    const skipped = [];

    for (const update of updates) {
      const current = existing.get(update.id);
      if (!current) {
        skipped.push({ id: update.id, reason: 'not_found' });
        continue;
      }
      if (current.user_id || !String(current.description || '').includes('\u5e73\u53f0\u4ee3\u767b\u8bb0\u5546\u5bb6\u4fe1\u606f')) {
        skipped.push({ id: update.id, reason: 'not_imported_merchant' });
        continue;
      }
      if (hasImages(current.images) && body.onlyMissing !== false) {
        skipped.push({ id: update.id, reason: 'already_has_images' });
        continue;
      }
      const response = await serviceFetch(`/rest/v1/listings?id=eq.${encodeURIComponent(update.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ images: update.images, updated_at: new Date().toISOString() })
      });
      const text = await response.text();
      if (!response.ok) {
        skipped.push({ id: update.id, reason: text || String(response.status) });
        continue;
      }
      const [patched] = text ? JSON.parse(text) : [];
      changed.push({ id: patched?.id || update.id, title: patched?.title || update.title, image: update.images[0] });
    }

    await serviceFetch('/rest/v1/admin_logs', {
      method: 'POST',
      body: JSON.stringify([{
        admin_id: admin.user.id,
        action: 'update_merchant_images',
        target_type: 'listing',
        target_id: String(changed.length),
        note: cleanText(body.source) || 'merchant image update'
      }])
    }).catch(() => null);

    return json(res, 200, { ok: true, updated: changed.length, skipped: skipped.length, changed, skipped });
  } catch (error) {
    return json(res, 500, { error: 'update_failed', message: error.message || 'Update failed' });
  }
};
