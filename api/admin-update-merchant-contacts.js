const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Co4jbBX8M1I_fJCgoceoDA_PUTyhNta';
const { requireAdminByMetadata } = require('./_admin-auth');
const PLACEHOLDER = '\u8bf7\u5546\u5bb6\u8ba4\u9886\u540e\u8865\u5145\u8054\u7cfb\u65b9\u5f0f';

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
  const title = cleanText(row?.title);
  const contact = cleanText(row?.contact);
  if (!title || !contact || contact === PLACEHOLDER) return null;
  if (contact.length < 4 || contact.length > 160) return null;
  return { title, contact };
}

async function loadExistingListings() {
  const response = await serviceFetch('/rest/v1/listings?select=id,title,contact,user_id&limit=10000');
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`load_listings_failed: ${text || response.status}`);
  }
  const rows = await response.json();
  return new Map(rows.map(row => [cleanText(row.title).toLowerCase(), row]));
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
    const existing = await loadExistingListings();
    const changed = [];
    const skipped = [];

    for (const update of updates) {
      const current = existing.get(update.title.toLowerCase());
      if (!current) {
        skipped.push({ title: update.title, reason: 'not_found' });
        continue;
      }
      const oldContact = cleanText(current.contact);
      if (oldContact && oldContact !== PLACEHOLDER && oldContact === update.contact) {
        skipped.push({ title: update.title, reason: 'same_contact' });
        continue;
      }
      if (oldContact && oldContact !== PLACEHOLDER && body.onlyMissing !== false) {
        skipped.push({ title: update.title, reason: 'already_has_contact' });
        continue;
      }
      const response = await serviceFetch(`/rest/v1/listings?id=eq.${encodeURIComponent(current.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ contact: update.contact, updated_at: new Date().toISOString() })
      });
      const text = await response.text();
      if (!response.ok) {
        skipped.push({ title: update.title, reason: text || String(response.status) });
        continue;
      }
      const [patched] = text ? JSON.parse(text) : [];
      changed.push({ id: patched?.id || current.id, title: update.title, contact: update.contact });
    }

    await serviceFetch('/rest/v1/admin_logs', {
      method: 'POST',
      body: JSON.stringify([{
        admin_id: admin.user.id,
        action: 'update_merchant_contacts',
        target_type: 'listing',
        target_id: String(changed.length),
        note: cleanText(body.source) || 'merchant contact update'
      }])
    }).catch(() => null);

    return json(res, 200, { ok: true, updated: changed.length, skipped: skipped.length, changed, skipped });
  } catch (error) {
    return json(res, 500, { error: 'update_failed', message: error.message || 'Update failed' });
  }
};
