const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Co4jbBX8M1I_fJCgoceoDA_PUTyhNta';

const CATEGORY_ALLOWLIST = new Set([
  '\u62db\u5de5',
  '\u751f\u610f',
  '\u670d\u52a1',
  '\u6559\u80b2',
  '\u79df\u623f',
  '\u4e8c\u624b\u7269\u54c1',
  '\u4e8c\u624b\u8f66'
]);

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

async function requireAdmin(req) {
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
  if (!isSuper && !sections.includes('listings')) return { error: 'not_admin', status: 403 };
  return { user };
}

function cleanText(value, fallback = '') {
  return String(value || fallback).replace(/\s+/g, ' ').trim();
}

function normalizeRecord(row) {
  const item = row && typeof row === 'object' ? row : {};
  const title = cleanText(item.title);
  const contact = cleanText(item.contact, '\u8bf7\u5546\u5bb6\u8ba4\u9886\u540e\u8865\u5145\u8054\u7cfb\u65b9\u5f0f');
  if (!title || !contact) return null;

  const category = CATEGORY_ALLOWLIST.has(cleanText(item.category)) ? cleanText(item.category) : '\u670d\u52a1';
  const description = cleanText(item.description, `\u5e73\u53f0\u4ee3\u767b\u8bb0\u5546\u5bb6\u4fe1\u606f\uff0c\u5546\u5bb6\u5f85\u8ba4\u9886\u3002${title}`);
  return {
    title,
    category,
    city: cleanText(item.city, 'Madrid'),
    address: cleanText(item.address) || null,
    contact,
    description,
    price: cleanText(item.price, '\u9762\u8bae'),
    status: 'approved',
    user_id: null,
    images: []
  };
}

async function fetchExistingTitles() {
  const response = await serviceFetch('/rest/v1/listings?select=title&limit=10000');
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`existing_titles_failed: ${text || response.status}`);
  }
  const rows = await response.json();
  return new Set(rows.map(row => cleanText(row.title).toLowerCase()).filter(Boolean));
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
  const inputRows = Array.isArray(body.rows) ? body.rows : [];
  const normalizedRows = inputRows.map(normalizeRecord).filter(Boolean);
  if (!normalizedRows.length) {
    return json(res, 400, { error: 'no_valid_rows' });
  }

  try {
    const existingTitles = await fetchExistingTitles();
    const seen = new Set();
    const records = [];

    for (const record of normalizedRows) {
      const key = record.title.toLowerCase();
      if (existingTitles.has(key) || seen.has(key)) continue;
      seen.add(key);
      records.push(record);
    }

    if (!records.length) {
      return json(res, 200, { ok: true, imported: 0, skipped: normalizedRows.length, inserted: [] });
    }

    const insertResponse = await serviceFetch('/rest/v1/listings', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(records)
    });
    const insertText = await insertResponse.text();
    if (!insertResponse.ok) {
      return json(res, 400, { error: 'insert_failed', detail: insertText || insertResponse.status });
    }

    const inserted = insertText ? JSON.parse(insertText) : [];
    await serviceFetch('/rest/v1/admin_logs', {
      method: 'POST',
      body: JSON.stringify([{
        admin_id: admin.user.id,
        action: 'import_merchants',
        target_type: 'listing',
        target_id: String(inserted.length),
        note: cleanText(body.source, 'merchant import')
      }])
    }).catch(() => null);

    return json(res, 200, {
      ok: true,
      imported: inserted.length,
      skipped: normalizedRows.length - inserted.length,
      inserted: inserted.map(item => ({ id: item.id, title: item.title, category: item.category, city: item.city }))
    });
  } catch (error) {
    return json(res, 500, { error: 'import_failed', message: error.message || 'Import failed' });
  }
};
